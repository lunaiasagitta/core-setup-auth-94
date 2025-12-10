import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { executeTool } from '../tools/handlers.ts';
import { buildFullPrompt } from '../prompts/system.ts';
import { buildWebChatPrompt } from '../prompts/web-chat.ts';
import { buildWhatsAppPrompt } from '../prompts/whatsapp.ts';
import { whatsappTools } from '../tools/whatsapp-tools.ts';
import { webTools } from '../tools/web-tools.ts';
import { classifyIntent } from '../agent/intent-classifier.ts';
import { getQuickReply } from '../agent/quick-replies.ts';
import { analyzeSentiment, getSentimentGuidance } from '../agent/sentiment.ts';
import { scheduleFollowUps } from '../agent/follow-up.ts';
import { validateResponse } from '../agent/response-validator.ts';
import { recordFailure, recordSuccess, isDegraded, getDegradedResponse } from '../agent/degraded-mode.ts';
import { detectCurrentTopic, analyzePreferences, getPreferencesGuidance, getTopicGuidance } from '../agent/context-analyzer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { phone, message, messageId, channel = 'whatsapp', visitorId, conversationId: providedConversationId } = await req.json();
    console.log(`Processing message from ${phone}: ${message}`);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Rate Limiting
    const { count: recentMessages } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .gte('timestamp', oneHourAgo);

    if (recentMessages && recentMessages > 50) {
      console.log(`Rate limit exceeded for ${phone}: ${recentMessages} messages in last hour`);
      await supabase.from('security_logs').insert({
        event_type: 'rate_limit_exceeded',
        user_phone: phone,
        details: { message_count: recentMessages },
        severity: 'medium',
      });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Rate limit exceeded. Please try again later.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Validação de segurança
    const { data: blocked } = await supabase
      .from('blocked_numbers')
      .select('id')
      .eq('telefone', phone)
      .single();

    if (blocked) {
      console.log(`Blocked number: ${phone}`);
      return new Response(JSON.stringify({ success: false, blocked: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Carregar Lead (NÃO criar automaticamente - deixar CriaUsuarioCRM fazer isso)
    let { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('telefone', phone)
      .single();
    
    // Buscar reuniões agendadas do lead
    let reunioesAgendadas: any[] = [];
    if (lead?.id) {
      const { data: meetings } = await supabase
        .from('meetings')
        .select('id, scheduled_date, status, meeting_link, duration')
        .eq('lead_id', lead.id)
        .in('status', ['scheduled', 'confirmed'])
        .order('scheduled_date', { ascending: true })
        .limit(5);
      
      reunioesAgendadas = meetings || [];
    }

    let leadCriadoCRM = true;
    let conversationId: string | null = null;

    if (!lead) {
      console.log(`Lead not found for ${phone} - waiting for CriaUsuarioCRM`);
      leadCriadoCRM = false;
      
      // Criar lead temporário apenas para o contexto (não salvar no banco)
      lead = {
        id: null,
        telefone: phone,
        nome: null,
        email: null,
        empresa: null,
        necessidade: null,
        stage: 'N/A',
        score_bant: 0,
        bant_details: {},
        proposta_ia: null,
        os_funil_lead: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {}
      };
    }

    // 4. Carregar/Criar Conversation (apenas se lead existir no banco)
    let conversation = null;
    if (lead.id) {
      if (providedConversationId) {
        ({ data: conversation } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', providedConversationId)
          .single());
      } else {
        ({ data: conversation } = await supabase
          .from('conversations')
          .select('*')
          .eq('lead_id', lead.id)
          .eq('channel', channel)
          .single());
      }

      if (!conversation) {
        console.log(`Creating new conversation for lead ${lead.id}`);
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            lead_id: lead.id,
            session_id: `session_${phone}_${Date.now()}`,
            channel: channel,
            visitor_id: visitorId || null
          })
          .select()
          .single();

        if (convError) throw convError;
        conversation = newConv;
      }
      conversationId = conversation.id;
    }

    // 5. Carregar Histórico (apenas se conversation existir)
    let historico: Array<{ role: string; content: string }> = [];
    if (conversationId) {
      const { data: hist } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true })
        .limit(30);
      historico = hist || [];
    }

    // 6. RAG - Buscar Conhecimento Relevante
    let ragDocuments = '';
    try {
      const ragResponse = await fetch(`${supabaseUrl}/functions/v1/rag-search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message,
          top_k: 3,
          threshold: 0.7,
        }),
      });

      if (ragResponse.ok) {
        const ragData = await ragResponse.json();
        if (ragData.results && ragData.results.length > 0) {
          ragDocuments = ragData.results
            .map((r: any) => `[${r.title}]\n${r.content}`)
            .join('\n\n---\n\n');
          console.log(`Found ${ragData.results.length} relevant documents`);
        }
      }
    } catch (error) {
      console.error('RAG search error:', error);
    }

    // 7. INTENT CLASSIFICATION & QUICK REPLIES
    const intent = classifyIntent(message);
    console.log('Detected intent:', intent);

    if (intent.confidence > 0.75) {
      const quickReply = getQuickReply(intent.name, lead);
      
      if (quickReply) {
        console.log('Using quick reply for intent:', intent.name);
        
        if (quickReply.shouldExecuteTool && lead.id) {
          const toolResult = await executeTool(
            quickReply.shouldExecuteTool.toolName,
            quickReply.shouldExecuteTool.params,
            { leadId: lead.id, conversationId: conversationId }
          );
          console.log('Quick reply tool executed:', toolResult);
        }
        
        // Salvar mensagens apenas se conversation existir
        if (conversationId) {
          await supabase.from('messages').insert([
            { conversation_id: conversationId, role: 'user', content: message, channel: channel },
            { conversation_id: conversationId, role: 'assistant', content: quickReply.content, channel: channel }
          ]);
        }
        
        // Agendar follow-ups apenas se lead.id existir
        if (lead.id) {
          await scheduleFollowUps(lead.id, supabaseUrl, supabaseKey);
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            response: quickReply.content,
            intent: intent.name,
            quick_reply: true,
            duration_ms: Date.now() - startTime
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 8. SENTIMENT ANALYSIS (apenas se conversation existir)
    const sentimentAnalysis = analyzeSentiment(message);
    console.log('Sentiment:', sentimentAnalysis);
    
    if (conversationId) {
      await supabase
        .from('conversations')
        .update({
          last_sentiment: sentimentAnalysis.sentiment,
          interest_signals: sentimentAnalysis.sentiment === 'positive' 
            ? ((conversation?.interest_signals || 0) + 1)
            : (conversation?.interest_signals || 0),
          objections_count: sentimentAnalysis.sentiment === 'negative'
            ? ((conversation?.objections_count || 0) + 1)
            : (conversation?.objections_count || 0)
        })
        .eq('id', conversationId);
    }

    const sentimentGuidance = getSentimentGuidance(sentimentAnalysis);

    // 8.5 CONTEXT ANALYSIS - Detectar tópico e preferências
    const topicDetection = detectCurrentTopic(message);
    console.log('Topic detected:', topicDetection);
    
    const preferences = analyzePreferences(historico || []);
    console.log('Preferences:', preferences);
    
    const bantProgress = conversation?.bant_progress || {
      budget: 'not_asked',
      authority: 'not_asked',
      need: 'not_asked',
      timeline: 'not_asked'
    };
    
    // Atualizar contexto na conversation (apenas se existir)
    if (conversationId) {
      await supabase
        .from('conversations')
        .update({
          current_topic: topicDetection.current_topic,
          preferences: preferences
        })
        .eq('id', conversationId);
    }
    
    const preferencesGuidance = getPreferencesGuidance(preferences);
    const topicGuidance = getTopicGuidance(topicDetection.current_topic, bantProgress);

    // 8.6 ADVANCED CONTEXT TRACKING (apenas se conversation existir)
    const objectionKeywords = ['caro', 'muito', 'não tenho', 'demora', 'longo', 'difícil', 'complicado', 'não sei', 'dúvida'];
    const hasObjection = objectionKeywords.some(keyword => message.toLowerCase().includes(keyword));
    
    let updatedObjections = conversation?.objections_raised || [];
    if (hasObjection && !updatedObjections.includes(message.substring(0, 100))) {
      updatedObjections = [...updatedObjections, message.substring(0, 100)];
    }
    
    // Atualizar contexto com objections (apenas se conversation existir)
    if (conversationId) {
      await supabase
        .from('conversations')
        .update({
          objections_raised: updatedObjections
        })
        .eq('id', conversationId);
    }

    // 9. BUSCAR PROMPT ATIVO DO BANCO POR CANAL
    const { data: activePrompt } = await supabase
      .from('agent_prompts')
      .select('*')
      .eq('is_active', true)
      .eq('channel', channel)
      .single();
    
    // Fallback para prompt padrão se não encontrar no banco
    const systemPromptText = activePrompt?.prompt_text || 'Você é a Luna, uma agente de vendas altamente capacitada da Sagitta Digital. Seu papel é identificar oportunidades de negócio, qualificar leads através do método BANT e agendar reuniões comerciais quando apropriado.';
    const promptConfig = {
      version: activePrompt?.version || 'v1',
      config: activePrompt?.config || { temperature: 0.7, max_tokens: 500 }
    };
    
    console.log(`Using prompt version: ${promptConfig.version} for channel: ${channel} from database`);

    // 10. Buscar branding do agente, serviços e configurações do sistema
    const { data: branding } = await supabase
      .from('agent_branding')
      .select('*')
      .single();

    const { data: services } = await supabase
      .from('agent_resources')
      .select('*')
      .eq('ativo', true)
      .order('tipo', { ascending: true });

    // Buscar conteúdo das apresentações da base de conhecimento
    let presentationsContent = '';
    if (services && services.length > 0) {
      const serviceIds = services.map(s => s.id);
      
      const { data: kbChunks } = await supabase
        .from('knowledge_base')
        .select('title, content, metadata')
        .contains('metadata', { chunk_type: 'presentation' });

      if (kbChunks && kbChunks.length > 0) {
        // Filter chunks that belong to active services
        const relevantChunks = kbChunks.filter(chunk => 
          serviceIds.includes(chunk.metadata?.resource_id)
        );

        if (relevantChunks.length > 0) {
          // Group by resource_id and create summaries
          const groupedByResource = relevantChunks.reduce((acc, chunk) => {
            const resourceId = chunk.metadata?.resource_id;
            if (!acc[resourceId]) {
              acc[resourceId] = {
                nome: chunk.metadata?.resource_nome,
                tipo: chunk.metadata?.resource_tipo,
                chunks: []
              };
            }
            acc[resourceId].chunks.push(chunk.content);
            return acc;
          }, {} as Record<string, any>);

          presentationsContent = Object.values(groupedByResource)
            .map((resource: any) => `
### ${resource.tipo}: ${resource.nome}
${resource.chunks.slice(0, 3).join('\n\n')}
${resource.chunks.length > 3 ? `... (+${resource.chunks.length - 3} seções adicionais)` : ''}
`)
            .join('\n');
        }
      }
    }

    const { data: systemConfig } = await supabase
      .from('system_config')
      .select('*')
      .single();

    // Criar contexto com system_config
    let systemConfigContext = '';
    if (systemConfig) {
      systemConfigContext = `

## 🔗 INFORMAÇÕES DO SISTEMA (USE QUANDO NECESSÁRIO)

**Contato Samuel (Fundador):**
- WhatsApp: ${systemConfig.samuel_whatsapp || 'Não configurado'}
- Email: ${systemConfig.samuel_email || 'Não configurado'}

**Links Importantes:**
- Agenda para agendamento direto: ${systemConfig.agenda_link || 'Não configurado'}
- Formulário de briefing: ${systemConfig.briefing_link || 'Não configurado'}

**Endereços:**
- Fiscal (Brasil): ${systemConfig.endereco_fiscal || 'Não configurado'}
- Comercial (Bolívia): ${systemConfig.endereco_comercial || 'Não configurado'}

**Configurações de Agendamento:**
- Dias de antecedência para IA agendar: ${systemConfig.dias_antecedencia_agendamento || 3} dias

⚠️ **QUANDO USAR ESSAS INFORMAÇÕES:**
- Link da agenda: Sempre que lead quiser escolher horário fora dos disponíveis ou preferir ver a agenda completa
- Contato Samuel: Para handoff ou quando lead pede falar direto com fundador
- Briefing: Após agendar reunião, para coletar contexto detalhado
- Endereços: Se lead perguntar onde ficamos ou para emissão de nota fiscal
`;
    }

    // 11. Montar Prompt com branding injetado
    let brandingContext = '';
    if (branding) {
      brandingContext = `

IDENTIDADE DO AGENTE:
- Você se chama: ${branding.nome_agente}
- Representa a empresa: ${branding.nome_empresa}
${branding.website_empresa ? `- Website: ${branding.website_empresa}` : ''}
${branding.sobre_empresa ? `- Sobre a empresa: ${branding.sobre_empresa}` : ''}
- Tom de comunicação: ${branding.tom_comunicacao}
${branding.personalidade ? `- Personalidade: ${branding.personalidade}` : ''}
${branding.usa_emojis ? '- Use emojis quando apropriado para deixar a conversa mais leve' : '- Evite usar emojis, mantenha comunicação mais formal'}
${branding.assinatura ? `- Sua assinatura: ${branding.assinatura}` : ''}
`;
    }

    // promptConfig já foi definido acima (linha ~302)
    
    // Extrair nome do WhatsApp do lead se disponível
    const nomeWhatsApp = lead?.nome || null;
    
    // SELECIONAR PROMPT E FERRAMENTAS POR CANAL
    let fullPrompt = '';
    let tools: any[] = [];
    
    if (channel === 'web') {
      // Web Chat: Prompt focado em captação de dados
      console.log('[WebChat] Usando prompt e ferramentas específicas para Web');
      fullPrompt = systemPromptText + '\n\n' + buildWebChatPrompt({
        visitorName: lead?.nome,
        visitorEmail: lead?.email,
        visitorPhone: lead?.telefone,
        visitorCompany: lead?.empresa,
        necessity: lead?.necessidade,
        ragDocuments: ragDocuments + sentimentGuidance + preferencesGuidance + topicGuidance
      }) + brandingContext;
      
      tools = webTools; // Ferramentas específicas do Web Chat
      
    } else {
      // WhatsApp: Prompt focado em qualificação e agendamento
      console.log('[WhatsApp] Usando prompt e ferramentas específicas para WhatsApp');
      
      // Construir contexto adicional com status do lead e ações recomendadas
      const leadCriado = lead?.id ? 'Sim ✅' : 'NÃO ❌ - USE CriaUsuarioCRM quando tiver dados básicos (nome + telefone + necessidade)';
      const dadosBant = lead?.bant_details || {};
      
      let acoesRecomendadas = [];
      if (!lead?.id) {
        acoesRecomendadas.push('• Criar lead no CRM com CriaUsuarioCRM');
      }
      if (!dadosBant.budget) {
        acoesRecomendadas.push('• Perguntar sobre orçamento e usar registrar_bant');
      }
      if (!dadosBant.authority) {
        acoesRecomendadas.push('• Perguntar sobre autoridade de decisão e usar registrar_bant');
      }
      if (!dadosBant.need) {
        acoesRecomendadas.push('• Identificar necessidade específica e usar registrar_bant');
      } else if (!lead?.necessidade && dadosBant.need) {
        acoesRecomendadas.push('• CRÍTICO: Necessidade detectada no BANT mas campo necessidade está vazio! Use atualizar_lead para preencher');
      }
      if (!dadosBant.timeline) {
        acoesRecomendadas.push('• Perguntar sobre prazo e usar registrar_bant');
      }
      if (Object.keys(dadosBant).length > 0 && Object.keys(dadosBant).length < 4) {
        acoesRecomendadas.push('• Chamar calcular_score após registrar dados BANT');
      }
      
      // 🚨 Validação CRÍTICA: E-mail obrigatório antes de agendamento
      if (lead?.stage === 'Apresentação Enviada' && !lead?.email) {
        acoesRecomendadas.push(
          '• 🚨 CRÍTICO: Lead sem e-mail! NUNCA agende reunião sem e-mail. Pergunte: "Qual o melhor e-mail para te enviar o convite?" e use atualizar_lead'
        );
      }
      
      // Sugestão de captura de empresa se não tiver
      if (lead?.id && !lead?.empresa && lead?.stage !== 'Novo') {
        acoesRecomendadas.push('• Capture nome da empresa durante conversa (natural, não forçar)');
      }
      
      // 🎯 Alerta urgente para coleta de contexto pós-agendamento
      if (lead?.stage === 'Reunião Agendada') {
        const { data: meetings } = await supabase
          .from('meetings')
          .select('id, created_at, contexto_reuniao')
          .eq('lead_id', lead.id)
          .eq('status', 'scheduled')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (meetings && meetings.length > 0) {
          const meeting = meetings[0];
          const minutosDesdeAgendamento = (Date.now() - new Date(meeting.created_at).getTime()) / (1000 * 60);
          
          if (!meeting.contexto_reuniao && minutosDesdeAgendamento < 10) {
            acoesRecomendadas.push(
              `• 🚨 URGENTE: Reunião agendada há ${Math.round(minutosDesdeAgendamento)}min! Ofereça coletar contexto AGORA com meeting_id: ${meeting.id}`
            );
          }
        }
      }

      // Sugestão de captura de empresa
      if (lead && !lead.empresa && lead.stage !== 'Novo' && lead.stage !== 'Cancelado') {
        acoesRecomendadas.push(
          '• 💼 SUGESTÃO: Pergunte o nome da empresa se relevante. Use atualizar_lead'
        );
      }
      
      // Extrair resultados recentes de ferramentas do histórico (últimas 3)
      const conversationHistory = [
        ...(historico || []).map((m: any) => ({
          role: m.role,
          content: m.content,
        }))
      ];
      
      const recentToolResults = conversationHistory
        .filter((msg: any) => msg.role === 'assistant' && msg.tool_calls)
        .slice(-3)
        .map((msg: any) => {
          if (!msg.tool_calls) return '';
          return msg.tool_calls.map((tc: any) => {
            const toolResult = conversationHistory.find(
              (m: any) => m.role === 'tool' && m.tool_call_id === tc.id
            );
            return `Ferramenta: ${tc.function.name}\nArgumentos: ${tc.function.arguments}\nResultado: ${toolResult?.content || 'N/A'}`;
          }).join('\n\n');
        })
        .filter(Boolean)
        .join('\n\n---\n\n');
      
      const contextGuidance = `

## 📊 STATUS ATUAL DO LEAD

✓ Criado no CRM? ${leadCriado}
✓ Score BANT: ${lead?.score_bant || 0}/100 ${lead?.score_bant && lead.score_bant < 50 ? '⚠️ (Baixo - colete mais informações)' : ''}
✓ Stage atual: ${lead?.stage || 'Novo'}

📋 Dados BANT coletados:
${dadosBant.budget ? '✅' : '❌'} Budget (Orçamento): ${dadosBant.budget || 'Não coletado'}
${dadosBant.authority ? '✅' : '❌'} Authority (Autoridade): ${dadosBant.authority || 'Não coletado'}
${dadosBant.need ? '✅' : '❌'} Need (Necessidade): ${dadosBant.need || 'Não coletado'}
${dadosBant.timeline ? '✅' : '❌'} Timeline (Prazo): ${dadosBant.timeline || 'Não coletado'}

## 📅 REUNIÕES AGENDADAS DO LEAD

${reunioesAgendadas.length > 0 
  ? `⚠️ ATENÇÃO: Este lead JÁ TEM ${reunioesAgendadas.length} reunião(ões) agendada(s):
${reunioesAgendadas.map((m, i) => {
  const dataReuniao = new Date(m.scheduled_date);
  const dataFormatada = dataReuniao.toLocaleDateString('pt-BR', { 
    weekday: 'long',
    day: '2-digit', 
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  });
  const horaFormatada = dataReuniao.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
  return `
${i + 1}. ID: ${m.id}
   Data/Hora: ${dataFormatada} às ${horaFormatada}
   Duração: ${m.duration || 30} minutos
   Status: ${m.status}
   Link: ${m.meeting_link || 'Aguardando criação'}`;
}).join('\n')}

🚨 SE LEAD PEDIR REAGENDAMENTO:
1. Pergunte qual reunião cancelar (se houver múltiplas)
2. USE: CancelarReuniaoWhatsApp(meeting_id="[ID_ACIMA]", motivo="Lead solicitou reagendamento")
3. AGUARDE confirmação do cancelamento
4. DEPOIS busque novos horários e agende
`
  : '✅ Este lead não tem reuniões agendadas no momento.'
}

${acoesRecomendadas.length > 0 ? `🎯 PRÓXIMAS AÇÕES RECOMENDADAS:
${acoesRecomendadas.join('\n')}` : '✅ Dados BANT completos! Avance para agendamento ou envio de proposta.'}

${recentToolResults ? `\n## 🛠️ RESULTADOS DE FERRAMENTAS RECENTES\n${recentToolResults}\n\n⚠️ IMPORTANTE: Use os dados EXATOS retornados pelas ferramentas, não invente ou calcule valores!` : ''}
`;

      const whatsappPrompt = buildWhatsAppPrompt({
        agentName: branding?.nome_agente || 'Luna',
        companyName: branding?.nome_empresa || 'Sagitta Digital',
        personality: branding?.personalidade || 'Amigável e consultiva',
        communicationTone: branding?.tom_comunicacao || 'profissional',
        useEmojis: branding?.usa_emojis ?? true,
        companyInfo: branding?.sobre_empresa || undefined,
        signature: branding?.assinatura || undefined,
        knowledgeContext: ragDocuments + sentimentGuidance + preferencesGuidance + topicGuidance + contextGuidance + systemConfigContext,
        conversationContext: {
          bantProgress: bantProgress,
          stage: lead?.stage,
          scoreBant: lead?.score_bant || 0
        },
        leadData: {
          nome: lead?.nome || undefined,
          email: lead?.email || undefined,
          empresa: lead?.empresa || undefined,
          stage: lead?.stage || undefined
        },
        systemConfig: systemConfig || undefined,
        services: services || [],
        presentationsContent: presentationsContent || ''
      });
      
      fullPrompt = systemPromptText + '\n\n' + whatsappPrompt.content;
      tools = whatsappTools; // Ferramentas específicas do WhatsApp
    }

    console.log(`[${channel}] Using ${tools.length} channel-specific tools`);

    const messages = [
      { role: 'system', content: fullPrompt },
      { role: 'system', content: '🚨 CRITICAL: You MUST respond ONLY in Portuguese (Brazilian). NEVER use English. Example: "Oi! Como posso ajudar?" NOT "Hi! How can I help?"' },
      ...(historico || []).map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // 11. Chamar OpenAI
    console.log('Calling OpenAI...');
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o', // MUDOU: gpt-4o é mais estável que gpt-4o-mini para idiomas
          messages,
          tools: tools, // Usar ferramentas específicas do canal
          temperature: promptConfig.config.temperature,
          max_tokens: promptConfig.config.max_tokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        recordFailure();
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const completion = await response.json();
      let assistantMessage = completion.choices[0].message;

      // 🚨 VALIDAÇÃO: Detectar e remover nomes de ferramentas escritos como texto
      if (assistantMessage.content) {
        const toolNames = [
          'EnviarApresentacaoWhatsApp',
          'BuscarSlotsWhatsApp', 
          'AgendarReuniaoWhatsApp',
          'CancelarReuniaoWhatsApp',
          'SolicitarHandoff',
          'BuscarRecursosWhatsApp',
          'CriaUsuarioCRM',
          'registrar_bant',
          'calcular_score',
          'atualizar_lead',
          'atualizar_stage',
          'AtualizarNecessidadeLead',
          'EmFechamentoSamuel'
        ];
        
        let hasToolNameInText = false;
        let cleanedContent = assistantMessage.content;
        
        for (const toolName of toolNames) {
          if (cleanedContent.includes(toolName)) {
            console.warn(`⚠️ ERRO DO MODELO: Encontrou "${toolName}" no texto! Removendo...`);
            hasToolNameInText = true;
            // Remove a linha inteira que contém o nome da ferramenta
            cleanedContent = cleanedContent
              .split('\n')
              .filter((line: string) => !line.includes(toolName))
              .join('\n')
              .trim();
          }
        }
        
        if (hasToolNameInText) {
          console.error('🚨 CRITICAL: Modelo escreveu nome de ferramenta no texto ao invés de fazer tool call!');
          console.error('Texto original:', assistantMessage.content);
          console.error('Texto limpo:', cleanedContent);
          
          // Se o texto ficou vazio após limpeza, usar mensagem padrão
          if (!cleanedContent) {
            cleanedContent = 'Deixa eu verificar isso para você...';
          }
          
          assistantMessage.content = cleanedContent;
        }
      }

      // 12. Processar Tool Calls
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        console.log(`⚙️ Executando ${assistantMessage.tool_calls.length} ferramentas...`);
        
        // ✅ DEBOUNCE: Filtrar tool calls duplicadas no mesmo request
        const toolCallsMap = new Map();
        const filteredToolCalls = assistantMessage.tool_calls.filter((call: any) => {
          const key = `${call.function.name}_${call.function.arguments}`;
          
          if (toolCallsMap.has(key)) {
            console.warn('[Orchestrator] ⚠️ Tool call duplicada detectada e ignorada:', {
              tool: call.function.name,
              callId: call.id
            });
            return false;
          }
          
          toolCallsMap.set(key, true);
          return true;
        });

        if (filteredToolCalls.length < assistantMessage.tool_calls.length) {
          console.warn('[Orchestrator] 🚨 MÚLTIPLAS TOOL CALLS IDÊNTICAS DETECTADAS!', {
            total: assistantMessage.tool_calls.length,
            unique: filteredToolCalls.length,
            duplicadas: assistantMessage.tool_calls.length - filteredToolCalls.length
          });
        }
        
        const toolResults = [];
        for (const toolCall of filteredToolCalls) {
          console.log(`🔧 Tool: ${toolCall.function.name}`, JSON.parse(toolCall.function.arguments));
          
          const result = await executeTool(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments),
            { 
              leadId: lead?.id || null, 
              conversationId: conversationId || null,
              channel: channel
            }
          );
          
          console.log(`${result.success ? '✅' : '❌'} Resultado:`, result);
          
          // ✅ CORREÇÃO: Enviar apenas mensagem em português para o modelo, não o JSON completo
          let toolMessage = result.success 
            ? (result.message || 'Operação concluída com sucesso')
            : (result.error || result.message || 'Operação falhou');
          
          // ✅ CORREÇÃO ADICIONAL: Para BuscarSlotsWhatsApp, incluir dados estruturados
          if (toolCall.function.name === 'BuscarSlotsWhatsApp' && result.data?.slots) {
            toolMessage += '\n\n🔢 DADOS ESTRUTURADOS (use EXATAMENTE estes valores):\n';
            toolMessage += JSON.stringify(result.data.slots, null, 2);
            toolMessage += '\n\n⚠️ IMPORTANTE: Ao agendar, use a data EXATA do formato YYYY-MM-DD acima, NUNCA calcule!';
          }
          
          console.log('[Tool Result Debug] Full JSON:', JSON.stringify(result));
          console.log('[Tool Result] Sending to model:', toolMessage);
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: toolMessage, // ✅ ENVIA TEXTO EM PORTUGUÊS + DADOS ESTRUTURADOS
          });
        }

        console.log('🔄 Chamando OpenAI novamente com resultados das ferramentas...');

        const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o', // MUDOU: usar gpt-4o consistentemente
            messages: [
              ...messages,
              assistantMessage,
              ...toolResults,
            ],
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (!secondResponse.ok) {
          const errorText = await secondResponse.text();
          console.error('❌ OpenAI segunda chamada falhou:', secondResponse.status, errorText);
          throw new Error(`OpenAI API error on second call: ${secondResponse.status}`);
        }

        const secondCompletion = await secondResponse.json();
        assistantMessage = secondCompletion.choices[0].message;
        console.log('✅ Resposta final do agente:', assistantMessage.content);
      }

      const finalResponse = assistantMessage.content;

      // 12.5 TRACK QUESTIONS AND INFORMATION PROVIDED (apenas se conversation existir)
      let updatedQuestions: string[] = [];
      let updatedInfoProvided: string[] = [];
      
      if (conversation) {
        // Detectar se a resposta do assistente contém uma pergunta
        const hasQuestion = finalResponse.includes('?');
        updatedQuestions = conversation.questions_asked || [];
        if (hasQuestion) {
          const questions = finalResponse.match(/[^.!?]*\?/g) || [];
          questions.forEach((q: string) => {
            const cleanQ = q.trim();
            if (cleanQ && !updatedQuestions.includes(cleanQ)) {
              updatedQuestions = [...updatedQuestions, cleanQ];
            }
          });
        }
        
        // Detectar informações fornecidas baseado em keywords
        const infoKeywords = ['preço', 'valor', 'prazo', 'dias', 'processo', 'funciona', 'inclui', 'oferecemos'];
        const providedInfo = infoKeywords.filter(keyword => 
          finalResponse.toLowerCase().includes(keyword)
        );
        
        updatedInfoProvided = conversation.information_provided || [];
        providedInfo.forEach((info: string) => {
          if (!updatedInfoProvided.includes(info)) {
            updatedInfoProvided = [...updatedInfoProvided, info];
          }
        });
      }

      // 13. VALIDAR RESPOSTA
      const validation = validateResponse(finalResponse);
      
      if (!validation.valid) {
        console.error('Invalid response:', validation.error);
        recordFailure();
        
        // Salvar resposta fallback (mensagem do user já foi salva pelo webhook)
        if (conversationId) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: validation.fallbackMessage
          });
        }
        
        return new Response(
          JSON.stringify({ success: true, response: validation.fallbackMessage, fallback: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      recordSuccess();

      // 14. Salvar Resposta do Assistant (mensagem do user já foi salva pelo webhook)
      if (conversationId) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: finalResponse,
          channel: channel
        });

        // 15. Atualizar Conversation com contexto avançado
        await supabase
          .from('conversations')
          .update({ 
            updated_at: new Date().toISOString(),
            questions_asked: updatedQuestions,
            information_provided: updatedInfoProvided
          })
          .eq('id', conversationId);
      }

      // 16. Agendar follow-ups (apenas se lead.id existir)
      if (lead.id) {
        await scheduleFollowUps(lead.id, supabaseUrl, supabaseKey);
      }

      // 17. Registrar Atividade (apenas se lead.id existir)
      if (lead.id) {
        await supabase.from('activity_log').insert({
          lead_id: lead.id,
          event_type: 'mensagem_processada',
          details: {
            message_length: message.length,
            response_length: finalResponse.length,
            duration_ms: Date.now() - startTime,
            intent: intent.name,
            sentiment: sentimentAnalysis.sentiment
          },
        });
      }

      const duration = Date.now() - startTime;
      console.log(`Processed in ${duration}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          response: finalResponse,
          duration_ms: duration,
          intent: intent.name,
          sentiment: sentimentAnalysis.sentiment
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('OpenAI error:', error);
      recordFailure();
      
      if (isDegraded()) {
        const degradedResponse = getDegradedResponse(message);
        
        // Salvar resposta degraded (mensagem do user já foi salva pelo webhook)
        if (conversationId) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: degradedResponse
          });
        }
        
        return new Response(
          JSON.stringify({ success: true, response: degradedResponse, degraded: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Orchestrator error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
