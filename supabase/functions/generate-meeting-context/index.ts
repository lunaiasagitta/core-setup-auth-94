import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId, leadId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // 🚨 LIMPAR QUALQUER CONTEXTO PENDENTE/DUPLICADO
    console.log('🧹 Limpando contextos pendentes para meeting:', meetingId);
    const { error: clearError } = await supabaseClient
      .from('meetings')
      .update({ 
        contexto_reuniao: null 
      })
      .eq('id', meetingId)
      .is('contexto_reuniao->gerado_automaticamente', true);
    
    if (clearError) console.warn('Aviso ao limpar contexto:', clearError);

    // Buscar conversa do lead
    const { data: conversation, error: convError } = await supabaseClient
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .maybeSingle();

    if (convError) throw convError;
    if (!conversation) {
      throw new Error('Nenhuma conversa encontrada para este lead');
    }

    // Buscar mensagens
    const { data: messages, error: msgError } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('timestamp', { ascending: true });

    if (msgError) throw msgError;

    // Buscar informações do lead
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('nome, empresa, necessidade, bant_details')
      .eq('id', leadId)
      .single();

    if (leadError) throw leadError;

    // Buscar briefing configurado
    const { data: branding, error: brandingError } = await supabaseClient
      .from('agent_branding')
      .select('briefing_pos_agendamento')
      .single();

    if (brandingError) throw brandingError;

    const briefingConfig = branding?.briefing_pos_agendamento as any;
    const perguntas = briefingConfig?.perguntas || [];

    // Construir histórico da conversa
    const conversationHistory = messages
      ?.map((m: any) => `${m.role === 'user' ? 'Lead' : 'Assistente'}: ${m.content}`)
      .join('\n\n');

    // Prompt para a IA
    const prompt = `Você é um assistente especializado em análise de conversas de vendas e preparação de reuniões comerciais.

**INFORMAÇÕES DO LEAD:**
- Nome: ${lead.nome}
- Empresa: ${lead.empresa || 'Não informado'}
- Necessidade: ${lead.necessidade || 'Não informado'}
- BANT: ${JSON.stringify(lead.bant_details || {})}

**HISTÓRICO DA CONVERSA:**
${conversationHistory}

---

**SUA TAREFA:**
Analise toda a conversa e gere um documento completo de preparação para a reunião em **MARKDOWN**.

**FORMATO DE RESPOSTA (MARKDOWN):**

## 📝 Resumo Executivo da Conversa

[Faça um resumo técnico e objetivo da conversa inteira, incluindo:
- Contexto inicial e como o lead chegou até aqui
- Principal objetivo/necessidade do cliente
- Pontos-chave discutidos
- Expectativas mencionadas
- Qualquer concern ou objeção levantada
- Tom geral da conversa (engajado, hesitante, urgente, etc.)

Máximo 200 palavras, focado em informações úteis para o vendedor.]

---

## 🎯 Pauta Sugerida para a Reunião

**Pontos estratégicos a serem abordados:**

1. **Revisão da Necessidade**
   - [Baseado na conversa, qual o problema principal a validar?]

2. **Demonstração Focada**
   - [O que mostrar baseado no interesse demonstrado?]

3. **Discussão de Orçamento/Escopo**
   - [Pontos de orçamento ou timeline mencionados que precisam ser refinados]

4. **Próximos Passos**
   - [O que precisa ser definido após esta reunião?]

5. **Objeções Antecipadas**
   - [Baseado na conversa, quais objeções podem surgir?]

---

## 📋 Perguntas do Briefing${perguntas.length > 0 ? '' : ' (Nenhuma configurada)'}

${perguntas.length > 0 ? perguntas.map((p: any, i: number) => `
### ${i + 1}. ${p}
**Resposta:** [extraia da conversa ou indique "Não respondido"]
`).join('\n') : '_Nenhuma pergunta configurada no briefing pós-agendamento._'}

---

**✅ Status:** ${perguntas.length > 0 ? '[Completo ou Parcial baseado nas respostas acima]' : 'N/A'}
**📊 Perguntas Respondidas:** ${perguntas.length > 0 ? '[X de ' + perguntas.length + ']' : 'N/A'}

---

**🔍 Observações Finais:**
[Qualquer informação adicional relevante que não se encaixou nas seções acima]`;

    // Chamar OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em análise de conversas de vendas e extração de informações para briefings de reunião.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('Erro OpenAI:', errorText);
      throw new Error(`Erro ao gerar contexto: ${openAIResponse.status}`);
    }

    const aiData = await openAIResponse.json();
    const contextoGerado = aiData.choices[0].message.content;

    // Determinar status e respostas estruturadas
    const perguntasERespostas = perguntas.map((p: string, index: number) => ({
      pergunta: p,
      resposta: null, // Será preenchido manualmente se necessário
      respondida: false
    }));

    const status = perguntasERespostas.every((p: any) => p.respondida) ? 'completo' : 'parcial';

    // Atualizar contexto no banco
    const contextoFinal = {
      perguntas: perguntasERespostas,
      status,
      contexto_formatado: contextoGerado,
      coletado_em: new Date().toISOString(),
      gerado_automaticamente: true
    };

    const { error: updateError } = await supabaseClient
      .from('meetings')
      .update({ contexto_reuniao: contextoFinal })
      .eq('id', meetingId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        contexto: contextoFinal
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro em generate-meeting-context:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
