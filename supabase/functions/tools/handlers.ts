import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createEvent } from '../google/calendar.ts';
import { sendMedia, sendMessage } from '../evolution/client.ts';
import {
  handleColetarNome,
  handleColetarWhatsApp,
  handleColetarEmail,
  handleColetarEmpresa,
  handleMostrarApresentacaoWeb,
  handleMostrarSlotsWeb,
  handleAgendarReuniaoWeb,
  handleBuscarInformacoesWeb
} from './web-handlers.ts';
import {
  handleEnviarApresentacaoWhatsApp,
  handleBuscarSlotsWhatsApp,
  handleAgendarReuniaoWhatsApp,
  handleSolicitarHandoff as handleSolicitarHandoffWhatsApp,
  handleBuscarRecursosWhatsApp
} from './whatsapp-handlers.ts';
import { handleCancelarReuniaoWhatsApp } from './cancel-meeting-handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')!;
const evolutionKey = Deno.env.get('EVOLUTION_API_KEY')!;
const evolutionInstance = Deno.env.get('EVOLUTION_INSTANCE_NAME')!;

interface ToolResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

// Função auxiliar para logar execução de ferramentas
async function logToolExecution(
  supabase: any,
  params: {
    conversationId?: string;
    leadId?: string;
    toolName: string;
    params: any;
    result: ToolResult;
    executionTimeMs: number;
  }
) {
  try {
    await supabase.from('tool_execution_logs').insert({
      conversation_id: params.conversationId || null,
      lead_id: params.leadId || null,
      tool_name: params.toolName,
      params: params.params,
      result: params.result,
      success: params.result.success,
      error_message: params.result.error || null,
      execution_time_ms: params.executionTimeMs
    });
    console.log(`[LOG] ✅ Tool execution logged: ${params.toolName}`);
  } catch (error) {
    console.error('[LOG] ❌ Erro ao logar ferramenta:', error);
  }
}

// ============= PHONE NORMALIZATION =============

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function normalizePhone(phone: string): string {
  const cleaned = cleanPhone(phone);
  
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    return cleaned;
  }
  
  if (cleaned.length === 11) {
    return `55${cleaned}`;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('5')) {
    return `5${cleaned}`;
  }
  
  return cleaned;
}

async function notifyTeam(message: string, urgency: 'baixa' | 'media' | 'alta' = 'media') {
  const teamPhone = '5511942038803'; // Samuel WhatsApp
  
  try {
    await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
      method: 'POST',
      headers: {
        'apikey': evolutionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: teamPhone,
        text: `${urgency === 'alta' ? '🚨🚨🚨' : urgency === 'media' ? '⚠️' : 'ℹ️'} ${message}`,
      }),
    });
  } catch (error) {
    console.error('Erro ao notificar equipe:', error);
  }
}

// ============= NOVAS FERRAMENTAS DO PROMPT LUNA =============

export async function handleCriaUsuarioCRM(
  params: { nome: string; telefone: string; email?: string; empresa?: string; necessidade: string; propostaIA: string }
): Promise<ToolResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const normalizedPhone = normalizePhone(params.telefone);
    const normalizedEmail = params.email ? params.email.toLowerCase().trim() : null;
    
    console.log('🔍 [CriaUsuarioCRM] Verificando duplicatas antes de criar lead...');
    
    // 🎯 DETECÇÃO INTELIGENTE DE DUPLICATAS
    const { data: potentialDuplicates } = await supabase.rpc('find_potential_duplicates', {
      p_telefone: normalizedPhone,
      p_email: normalizedEmail,
      p_nome: params.nome
    });

    if (potentialDuplicates && potentialDuplicates.length > 0) {
      const bestMatch = potentialDuplicates[0];
      console.log(`📊 Match encontrado (score: ${bestMatch.match_score}, tipo: ${bestMatch.match_type})`);

      // 🔥 MERGE AUTOMÁTICO (score >= 90)
      if (bestMatch.match_score >= 90) {
        console.log(`✅ Auto-merge ativado (score ${bestMatch.match_score})`);
        
        // Importar lógica de merge
        const { decideMergeStrategy } = await import('../lib/merge-utils.ts');
        
        // Buscar lead completo existente
        const { data: existingLead } = await supabase
          .from('leads')
          .select('*')
          .eq('id', bestMatch.lead_id)
          .single();

        if (!existingLead) {
          console.error('Lead duplicado não encontrado no banco');
          throw new Error('Lead duplicado não encontrado');
        }

        // Criar lead temporário com novos dados
        const newLeadData = {
          id: bestMatch.lead_id, // usar ID do existente
          nome: params.nome,
          telefone: normalizedPhone,
          email: normalizedEmail,
          empresa: params.empresa || null,
          necessidade: params.necessidade,
          proposta_ia: params.propostaIA,
          stage: 'Novo',
          score_bant: 0,
          bant_details: {},
          os_funil_lead: null,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Executar estratégia de merge
        const { merged, mergeLog } = decideMergeStrategy(existingLead, newLeadData);

        // Atualizar lead existente com dados mesclados
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            ...merged,
            updated_at: new Date().toISOString()
          })
          .eq('id', bestMatch.lead_id);

        if (updateError) throw updateError;

        // Registrar merge na tabela lead_merges
        await supabase.from('lead_merges').insert({
          master_lead_id: bestMatch.lead_id,
          merged_lead_id: bestMatch.lead_id, // mesmo ID pois não criamos novo
          merge_strategy: 'auto_sync',
          merged_data: merged,
          merge_decisions: mergeLog,
          notes: `Auto-merge síncrono (score: ${bestMatch.match_score}, tipo: ${bestMatch.match_type})`
        });

        // Log de atividade
        await supabase.from('activity_log').insert({
          lead_id: bestMatch.lead_id,
          event_type: 'lead_merged',
          details: { 
            tipo: 'auto_sync',
            match_score: bestMatch.match_score,
            match_type: bestMatch.match_type
          }
        });

        console.log(`✅ Lead mesclado com sucesso: ${bestMatch.lead_id}`);
        
        return {
          success: true,
          message: 'Lead já existia no CRM. Dados unificados automaticamente.',
          data: { leadId: bestMatch.lead_id, merged: true, match_score: bestMatch.match_score }
        };
      }

      // 🏷️ FLAGGING (score 60-89)
      if (bestMatch.match_score >= 60) {
        console.log(`🏷️ Criando lead com flag de duplicata potencial (score ${bestMatch.match_score})`);
        
        const { data: newLead, error } = await supabase
          .from('leads')
          .insert({
            nome: params.nome,
            telefone: normalizedPhone,
            email: normalizedEmail,
            empresa: params.empresa || null,
            necessidade: params.necessidade,
            proposta_ia: params.propostaIA,
            stage: 'Novo',
            score_bant: 0,
            metadata: {
              potential_duplicate_of: bestMatch.lead_id,
              duplicate_score: bestMatch.match_score,
              duplicate_type: bestMatch.match_type,
              flagged_at: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (error) throw error;

        // Criar conversation
        await supabase.from('conversations').insert({
          lead_id: newLead.id,
          session_id: `session_${normalizedPhone}_${Date.now()}`
        });

        // Log
        await supabase.from('activity_log').insert({
          lead_id: newLead.id,
          event_type: 'lead_criado',
          details: { 
            criado_por: 'Luna (CriaUsuarioCRM)',
            flagged_duplicate: true,
            match_score: bestMatch.match_score
          }
        });

        console.log(`✅ Lead criado com flag de duplicata: ${newLead.id}`);
        
        return {
          success: true,
          message: 'Lead criado com sucesso (possível duplicata detectada)',
          data: { leadId: newLead.id, flagged: true, match_score: bestMatch.match_score }
        };
      }
    }

    // 🆕 CRIAR LEAD NORMAL (score < 60 ou sem matches)
    console.log('✅ Nenhuma duplicata significativa encontrada. Criando lead novo...');
    
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert({
        nome: params.nome,
        telefone: normalizedPhone,
        email: normalizedEmail,
        empresa: params.empresa || null,
        necessidade: params.necessidade,
        proposta_ia: params.propostaIA,
        stage: 'Novo',
        score_bant: 0
      })
      .select()
      .single();

    if (error) throw error;

    // Criar conversation
    await supabase.from('conversations').insert({
      lead_id: newLead.id,
      session_id: `session_${normalizedPhone}_${Date.now()}`
    });

    // Log de atividade
    await supabase.from('activity_log').insert({
      lead_id: newLead.id,
      event_type: 'lead_criado',
      details: { criado_por: 'Luna (CriaUsuarioCRM)' }
    });

    console.log(`✅ Lead criado: ${newLead.id}`);
    
    return {
      success: true,
      message: 'Lead criado com sucesso no CRM',
      data: { leadId: newLead.id }
    };
  } catch (error) {
    console.error('Error creating lead in CRM:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper para detectar se é canal web
function isWebChannel(identifier: string): boolean {
  return identifier.startsWith('web_visitor_') || identifier.includes('visitor');
}

export async function handleEnviarApresentacao(
  params: {
    media: string;
    number: string;
    mimetype: string;
    caption: string;
    mediatype: 'document' | 'image';
    fileName: string;
  },
  channel?: string
): Promise<ToolResult> {
  try {
    console.log(`Enviando apresentação para ${params.number} via canal ${channel}`);

    // VALIDAÇÃO: Se é web chat, retornar link direto
    if (channel === 'web' || isWebChannel(params.number)) {
      return {
        success: true,
        message: `Aqui está a apresentação de ${params.fileName}! 📄\n\nClique no link para visualizar: ${params.media}\n\n${params.caption}`,
        data: { 
          type: 'web_link',
          url: params.media,
          caption: params.caption,
          fileName: params.fileName
        }
      };
    }

    // Se é WhatsApp, enviar via Evolution API
    console.log(`[Handler] Tentando enviar PDF via Evolution API para ${params.number}`);
    
    let result = await sendMedia(
      params.number,
      params.media,
      params.caption,
      params.mediatype,
      params.fileName || 'apresentacao.pdf'
    );

    // Fallback: se falhar ao enviar PDF, enviar como mensagem de texto com link
    if (!result.success) {
      console.warn(`[Handler] Falha ao enviar PDF, tentando fallback com link: ${result.error}`);
      
      const fallbackMessage = `📄 ${params.caption || 'Apresentação'}\n\n🔗 Link para acesso: ${params.media}`;
      const textResult = await sendMessage(params.number, fallbackMessage);
      
      if (!textResult.success) {
        throw new Error(textResult.error || 'Falha ao enviar apresentação mesmo com fallback');
      }
      
      console.log('[Handler] Fallback enviado com sucesso (link de texto)');
      return {
        success: true,
        message: 'Apresentação enviada (fallback: link)',
        data: textResult.data
      };
    }

    return {
      success: true,
      message: `Apresentação "${params.fileName}" enviada com sucesso`,
      data: { sent: true }
    };
  } catch (error) {
    console.error('Error sending presentation:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function handleAtualizarStatusLead(
  params: { telefone: string; statusLead: string }
): Promise<ToolResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const validStatuses = [
      'Apresentação Enviada',
      'Segundo Contato',
      'Reunião Agendada',
      'Proposta Enviada',
      'Fechado',
      'Cancelado'
    ];

    if (!validStatuses.includes(params.statusLead)) {
      return { success: false, error: 'Status inválido' };
    }

    // Buscar lead por telefone
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('telefone', params.telefone)
      .single();

    if (!lead) {
      return { success: false, error: 'Lead não encontrado' };
    }

    // Atualizar stage
    const { error } = await supabase
      .from('leads')
      .update({
        stage: params.statusLead,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id);

    if (error) throw error;

    // Log
    await supabase.from('activity_log').insert({
      lead_id: lead.id,
      event_type: 'mudanca_stage',
      details: { novo_stage: params.statusLead }
    });

    return {
      success: true,
      message: `Status atualizado para: ${params.statusLead}`
    };
  } catch (error) {
    console.error('Error updating status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function handleAtualizarNecessidadeLead(
  params: {
    Nome: string;
    Telefone: string;
    Email: string;
    Empresa?: string;
    Necessidade: string;
    PropostaIA: string;
  }
): Promise<ToolResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const validNecessidades = [
      'Websites',
      'Sistemas e Aplicativos',
      'Gestão de Redes Sociais',
      'Identidade Visual'
    ];

    if (!validNecessidades.includes(params.Necessidade)) {
      return { success: false, error: 'Necessidade inválida' };
    }

    const normalizedPhone = normalizePhone(params.Telefone);

    // Buscar ou criar lead
    let { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('telefone', normalizedPhone)
      .single();

    if (!lead) {
      // Criar se não existe
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          nome: params.Nome,
          telefone: normalizedPhone,
          email: params.Email,
          empresa: params.Empresa || null,
          necessidade: params.Necessidade,
          proposta_ia: params.PropostaIA,
          stage: 'Novo',
          score_bant: 0
        })
        .select()
        .single();

      if (createError) throw createError;
      if (!newLead) throw new Error('Failed to create lead');
      lead = newLead;
    } else {
      // Atualizar se existe
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          nome: params.Nome,
          email: params.Email,
          empresa: params.Empresa || null,
          necessidade: params.Necessidade,
          proposta_ia: params.PropostaIA,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (updateError) throw updateError;
    }

    // Log
    if (lead?.id) {
      await supabase.from('activity_log').insert({
        lead_id: lead.id,
        event_type: 'campo_atualizado',
        details: { campo: 'necessidade', valor: params.Necessidade }
      });
    }

    return {
      success: true,
      message: 'Dados do lead atualizados com sucesso'
    };
  } catch (error) {
    console.error('Error updating lead necessity:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function handleEmFechamentoSamuel(
  params: {
    telefone: string;
    osFunilLead: string;
    statusLead: string;
  }
): Promise<ToolResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const validFunil = ['Acompanhar', 'Importante', 'Projeto a ser fechado', 'Atendimento humano'];
    
    if (!validFunil.includes(params.osFunilLead)) {
      return { success: false, error: 'Funil inválido' };
    }

    // Buscar lead
    const { data: lead } = await supabase
      .from('leads')
      .select('id, nome, necessidade')
      .eq('telefone', params.telefone)
      .single();

    if (!lead) {
      return { success: false, error: 'Lead não encontrado' };
    }

    // Atualizar os_funil_lead
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        os_funil_lead: params.osFunilLead,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id);

    if (updateError) throw updateError;

    // Criar notificação para Samuel
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (profile) {
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: params.osFunilLead === 'Atendimento humano' ? 'handoff_request' : 'lead_qualified',
        title: params.osFunilLead === 'Atendimento humano' 
          ? '🚨 Lead solicitou atendimento humano'
          : `Lead em fechamento: ${params.osFunilLead}`,
        description: `${lead.nome || 'Lead'} - ${lead.necessidade || 'Necessidade não definida'} - Status: ${params.statusLead}`,
        link: `/leads/${lead.id}`
      });
    }

    // Notificar Samuel via WhatsApp se for atendimento humano
    if (params.osFunilLead === 'Atendimento humano') {
      await notifyTeam(
        `🚨 ATENDIMENTO HUMANO SOLICITADO\nLead: ${lead.nome || params.telefone}\nNecessidade: ${lead.necessidade || 'N/A'}\nStatus: ${params.statusLead}`,
        'alta'
      );
    }

    // Log
    await supabase.from('activity_log').insert({
      lead_id: lead.id,
      event_type: 'lead_priorizado',
      details: { funil: params.osFunilLead, status: params.statusLead }
    });

    return {
      success: true,
      message: `Lead marcado como: ${params.osFunilLead}`
    };
  } catch (error) {
    console.error('Error marking lead for Samuel:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function handleAtualizarLead(
  params: { campo: string; valor: string },
  leadId: string
): Promise<ToolResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const validFields = ['nome', 'email', 'empresa', 'necessidade', 'telefone'];
    if (!validFields.includes(params.campo)) {
      return { success: false, error: 'Campo inválido' };
    }

    // Normalizar valor
    let valorFinal = params.valor;
    if (params.campo === 'email') {
      valorFinal = params.valor.toLowerCase().trim();
      console.log(`[AtualizarLead] Email normalizado: ${params.valor} -> ${valorFinal}`);
    } else if (params.campo === 'telefone') {
      valorFinal = normalizePhone(params.valor);
      console.log(`[AtualizarLead] Telefone normalizado: ${params.valor} -> ${valorFinal}`);
    }

    // 🔍 DETECÇÃO DE CONFLITO para telefone/email
    if (params.campo === 'telefone' || params.campo === 'email') {
      console.log(`🔍 [AtualizarLead] Verificando conflito ao atualizar ${params.campo}...`);
      
      const { data: potentialDuplicates } = await supabase.rpc('find_potential_duplicates', {
        p_telefone: params.campo === 'telefone' ? valorFinal : null,
        p_email: params.campo === 'email' ? valorFinal : null,
        p_nome: null,
        p_exclude_id: leadId
      });

      if (potentialDuplicates && potentialDuplicates.length > 0) {
        const bestMatch = potentialDuplicates[0];
        
        if (bestMatch.match_score >= 90) {
          console.log(`⚠️ CONFLITO DETECTADO (score: ${bestMatch.match_score})`);
          
          return {
            success: false,
            error: `Já existe outro lead com esse ${params.campo}. Deseja mesclar os leads?`,
            data: { 
              conflict_detected: true,
              conflicting_lead_id: bestMatch.lead_id,
              conflicting_lead: bestMatch.lead_data,
              match_score: bestMatch.match_score
            }
          };
        }
      }
    }

    const { error } = await supabase
      .from('leads')
      .update({
        [params.campo]: valorFinal,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) throw error;

    await supabase.from('activity_log').insert({
      lead_id: leadId,
      event_type: 'campo_atualizado',
      details: { campo: params.campo, valor: valorFinal }
    });

    return {
      success: true,
      message: `Campo ${params.campo} atualizado com sucesso`
    };
  } catch (error) {
    console.error('Error updating lead:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function handleAtualizarStage(
  params: { novo_stage: string; motivo?: string },
  leadId: string
): Promise<ToolResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const validStages = ['Novo', 'Apresentação Enviada', 'Segundo Contato', 'Reunião Agendada', 'Proposta Enviada', 'Fechado', 'Cancelado'];
    if (!validStages.includes(params.novo_stage)) {
      return { success: false, error: 'Stage inválido' };
    }

    const { error } = await supabase
      .from('leads')
      .update({
        stage: params.novo_stage,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) throw error;

    await supabase.from('activity_log').insert({
      lead_id: leadId,
      event_type: 'mudanca_stage',
      details: { novo_stage: params.novo_stage, motivo: params.motivo }
    });

    // Cancelar follow-ups pendentes se lead avançou para stages finais
    const stagesCancelamento = ['Reunião Agendada', 'Proposta Enviada', 'Fechado', 'Cancelado'];
    if (stagesCancelamento.includes(params.novo_stage)) {
      await supabase
        .from('scheduled_messages')
        .update({ 
          canceled: true, 
          cancel_reason: `Stage avançado para: ${params.novo_stage}` 
        })
        .eq('lead_id', leadId)
        .eq('sent', false)
        .eq('canceled', false);
    }

    return {
      success: true,
      message: `Lead movido para: ${params.novo_stage}`
    };
  } catch (error) {
    console.error('Error updating stage:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function handleRegistrarBant(
  params: { campo: string; valor: string; confianca: string },
  leadId: string,
  conversationId?: string
): Promise<ToolResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('bant_details')
      .eq('id', leadId)
      .single();

    const bantDetails = lead?.bant_details || {};
    
    bantDetails[params.campo] = {
      valor: params.valor,
      confianca: params.confianca,
      timestamp: new Date().toISOString()
    };

    // ✅ Se registrar necessidade (need), atualizar também o campo direto necessidade
    const updateData: any = {
      bant_details: bantDetails,
      updated_at: new Date().toISOString()
    };

    if (params.campo === 'need') {
      const valorLower = params.valor.toLowerCase();
      
      if (valorLower.includes('site') || valorLower.includes('web')) {
        updateData.necessidade = 'Websites';
      } else if (valorLower.includes('sistema') || valorLower.includes('app') || valorLower.includes('software')) {
        updateData.necessidade = 'Sistemas e Aplicativos';
      } else if (valorLower.includes('rede') || valorLower.includes('social') || valorLower.includes('instagram') || valorLower.includes('facebook')) {
        updateData.necessidade = 'Gestão de Redes Sociais';
      } else if (valorLower.includes('design') || valorLower.includes('logo') || valorLower.includes('identidade') || valorLower.includes('visual') || valorLower.includes('marca')) {
        updateData.necessidade = 'Identidade Visual';
      }
      
      console.log(`[BANT] Atualizando necessidade: ${params.valor} -> ${updateData.necessidade || 'N/A'}`);
    }

    const { error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId);

    if (error) throw error;

    // Atualizar bant_progress na conversation
    if (conversationId) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('bant_progress')
        .eq('id', conversationId)
        .single();
      
      const bantProgress = conversation?.bant_progress || {
        budget: 'not_asked',
        authority: 'not_asked',
        need: 'not_asked',
        timeline: 'not_asked'
      };
      
      // Marcar como "answered"
      bantProgress[params.campo] = 'answered';
      
      await supabase
        .from('conversations')
        .update({ bant_progress: bantProgress })
        .eq('id', conversationId);
    }

    const scoreResult = await handleCalcularScore(leadId);

    return {
      success: true,
      message: `BANT ${params.campo} registrado`,
      data: { novo_score: scoreResult.data?.score }
    };
  } catch (error) {
    console.error('Error registering BANT:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function handleCalcularScore(leadId: string): Promise<ToolResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('bant_details')
      .eq('id', leadId)
      .single();

    const bant = lead?.bant_details || {};
    let score = 0;

    if (bant.budget) {
      const conf = bant.budget.confianca;
      score += conf === 'high' ? 25 : conf === 'medium' ? 15 : 10;
    }

    if (bant.authority) {
      const conf = bant.authority.confianca;
      score += conf === 'high' ? 25 : conf === 'medium' ? 15 : 10;
    }

    if (bant.need) {
      const conf = bant.need.confianca;
      score += conf === 'high' ? 30 : conf === 'medium' ? 20 : 10;
    }

    if (bant.timeline) {
      const conf = bant.timeline.confianca;
      score += conf === 'high' ? 20 : conf === 'medium' ? 12 : 5;
    }

    const { error } = await supabase
      .from('leads')
      .update({
        score_bant: score,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) throw error;

    // Registrar métrica de experimento se qualificado
    if (score >= 70) {
      const { data: assignment } = await supabase
        .from('experiment_assignments')
        .select('experiment_id, variant')
        .eq('lead_id', leadId)
        .single();
      
      if (assignment) {
        await supabase.from('experiment_results').insert({
          experiment_id: assignment.experiment_id,
          lead_id: leadId,
          variant: assignment.variant,
          metric: 'qualificado',
          value: score
        });
      }
    }

    return {
      success: true,
      message: `Score calculado: ${score}/100`,
      data: { score }
    };
  } catch (error) {
    console.error('Error calculating score:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function handleBuscarSlots(
  params: { data_preferida?: string; proximos_dias?: number }
): Promise<ToolResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Buscar configuração de dias de antecedência
    const { data: config } = await supabase
      .from('system_config')
      .select('dias_antecedencia_agendamento, agenda_link')
      .single();

    const diasAFrente = params.proximos_dias || config?.dias_antecedencia_agendamento || 7;
    const agendaLink = config?.agenda_link || 'https://calendar.app.google/CnGg9rndn1WLWtWL7';

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zerar horas para começar do início do dia
    const hojeDateStr = hoje.toISOString().split('T')[0];
    const dataFim = new Date(hoje.getTime() + diasAFrente * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 1. Buscar slots disponíveis E não reservados
    const { data: slots, error: slotsError } = await supabase
      .from('calendar_slots')
      .select('*')
      .eq('available', true)
      .is('reserved_by', null)
      .gte('date', params.data_preferida || hojeDateStr)
      .lte('date', dataFim)
      .order('date')
      .order('time');

    if (slotsError) throw slotsError;

    if (!slots || slots.length === 0) {
      return {
        success: true,
        message: `Não encontrei horários disponíveis nos próximos ${diasAFrente} dias. Para ver mais opções e agendar, acesse: ${agendaLink}`,
        data: { slots: [], link: agendaLink }
      };
    }

    // 2. Buscar meetings no mesmo período para filtrar conflitos
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('scheduled_date, duration')
      .in('status', ['scheduled', 'confirmed'])
      .gte('scheduled_date', `${hojeDateStr}T00:00:00`)
      .lte('scheduled_date', `${dataFim}T23:59:59`);

    if (meetingsError) throw meetingsError;

    // 3. Filtrar slots que conflitam com meetings
    const slotsDisponiveis = slots.filter(slot => {
      const slotDateTime = new Date(`${slot.date}T${slot.time}`);
      const slotEnd = new Date(slotDateTime.getTime() + (slot.duration || 30) * 60000);

      const temConflito = meetings?.some(meeting => {
        const meetingStart = new Date(meeting.scheduled_date);
        const meetingEnd = new Date(meetingStart.getTime() + (meeting.duration || 30) * 60000);
        
        // Verifica se há overlap
        return (slotDateTime < meetingEnd && slotEnd > meetingStart);
      });

      return !temConflito;
    });

    if (slotsDisponiveis.length === 0) {
      return {
        success: true,
        message: 'Nenhum horário disponível encontrado nos próximos dias',
        data: { slots: [] }
      };
    }

    // 4. Formatar slots (MELHORAR FORMATAÇÃO)
    const slotsFormatados = slotsDisponiveis
      .slice(0, 10) // Limitar a 10 slots para não sobrecarregar a mensagem
      .map(slot => {
        const data = new Date(slot.date + 'T00:00:00');
        const diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'short' });
        const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return `${diaSemana} ${dataFormatada} às ${slot.time.substring(0, 5)}`;
      });

    const mensagemBase = slotsDisponiveis.length > 10
      ? `Encontrei vários horários! Aqui estão os próximos 10:\n\n${slotsFormatados.join('\n')}\n\n(+${slotsDisponiveis.length - 10} horários disponíveis)`
      : `Horários disponíveis:\n\n${slotsFormatados.join('\n')}`;

    // Adicionar link ao final
    const mensagem = `${mensagemBase}\n\nSe você quiser outro dia, me informe qual dia deseja ou clique aqui para escolher: ${agendaLink}`;

    return {
      success: true,
      message: mensagem,
      data: { 
        slots: slotsDisponiveis,
        total: slotsDisponiveis.length,
        link: agendaLink
      }
    };
  } catch (error) {
    console.error('Error fetching slots:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function handleAgendarReuniao(
  params: { data: string; hora: string; duracao?: number },
  leadId: string
): Promise<ToolResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('nome, email, telefone, necessidade')
      .eq('id', leadId)
      .single();

    if (!lead) {
      return { success: false, error: 'Lead não encontrado' };
    }

    const startTime = new Date(`${params.data}T${params.hora}:00`);
    const duracao = params.duracao || 30;
    const endTime = new Date(startTime.getTime() + duracao * 60000);

    const { eventId, meetingLink } = await createEvent({
      summary: `Reunião com ${lead.nome || 'Lead'}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      attendees: lead.email ? [lead.email] : [],
      description: `Reunião comercial com lead do CRM`
    });

    const { error: meetingError } = await supabase
      .from('meetings')
      .insert({
        lead_id: leadId,
        google_event_id: eventId,
        scheduled_date: startTime.toISOString(),
        duration: duracao,
        meeting_link: meetingLink,
        status: 'scheduled'
      });

    if (meetingError) throw meetingError;

    await handleAtualizarStage({ novo_stage: 'Reunião Agendada', motivo: 'Reunião agendada via agente' }, leadId);

    await supabase.from('activity_log').insert({
      lead_id: leadId,
      event_type: 'reuniao_agendada',
      details: { data: params.data, hora: params.hora, meeting_link: meetingLink }
    });

    // Cancelar follow-ups pendentes imediatamente
    await supabase
      .from('scheduled_messages')
      .update({ 
        canceled: true, 
        cancel_reason: 'Reunião agendada - cancelamento imediato' 
      })
      .eq('lead_id', leadId)
      .eq('sent', false)
      .eq('canceled', false);

    // Registrar métrica de experimento
    const { data: assignment } = await supabase
      .from('experiment_assignments')
      .select('experiment_id, variant')
      .eq('lead_id', leadId)
      .single();
    
    if (assignment) {
      await supabase.from('experiment_results').insert({
        experiment_id: assignment.experiment_id,
        lead_id: leadId,
        variant: assignment.variant,
        metric: 'reuniao_agendada',
        value: 1
      });
    }

    // Notificar equipe
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(startTime);

    await notifyTeam(
      `📅 NOVA REUNIÃO AGENDADA\n\n` +
      `👤 Lead: ${lead.nome || 'Sem nome'}\n` +
      `📱 Telefone: ${lead.telefone}\n` +
      `📧 Email: ${lead.email || 'Não informado'}\n` +
      `💼 Necessidade: ${lead.necessidade || 'Não especificada'}\n` +
      `⏰ Data/Hora: ${formattedDate}\n` +
      `🔗 Link do Meet: ${meetingLink}`,
      'alta'
    );

    return {
      success: true,
      message: `Reunião agendada para ${params.data} às ${params.hora}`,
      data: { meeting_link: meetingLink, event_id: eventId }
    };
  } catch (error) {
    console.error('Error scheduling meeting:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function handleMarcarApresentacaoEnviada(
  params: { tipo: string },
  conversationId: string
): Promise<ToolResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('state, lead_id')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return { success: false, error: 'Conversa não encontrada' };
    }

    // Buscar recurso correspondente
    const { data: resource } = await supabase
      .from('agent_resources')
      .select('nome, link')
      .eq('tipo', params.tipo)
      .eq('ativo', true)
      .single();

    // Enviar apresentação via Evolution API se recurso existir
    if (resource && conversation.lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('telefone')
        .eq('id', conversation.lead_id)
        .single();

      if (lead?.telefone) {
        try {
          // Detectar tipo de conteúdo
          const isPDF = resource.link.toLowerCase().endsWith('.pdf') || 
                        resource.link.includes('drive.google.com') ||
                        resource.link.includes('dropbox.com');
          
          if (isPDF) {
            // Tentar enviar PDF via sendMedia
            console.log(`[Recurso] Tentando enviar PDF: ${resource.nome} -> ${lead.telefone}`);
            
            const mediaResult = await sendMedia(
              lead.telefone,
              resource.link,
              `📄 ${resource.nome}\n\nQualquer dúvida, estou aqui! 😊`,
              'document',
              `${resource.nome}.pdf`
            );
            
            // Se falhar, enviar como link
            if (!mediaResult.success) {
              console.warn(`[Recurso] Falha ao enviar PDF, usando fallback: ${mediaResult.error}`);
              await sendMessage(
                lead.telefone,
                `📄 ${resource.nome}\n\n🔗 Link: ${resource.link}\n\nQualquer dúvida, estou aqui! 😊`
              );
              console.log(`Link enviado via sendText (fallback): ${resource.nome} -> ${lead.telefone}`);
            } else {
              console.log(`PDF enviado via sendMedia: ${resource.nome} -> ${lead.telefone}`);
            }
          } else {
            // Usar sendMessage para links web
            await sendMessage(
              lead.telefone,
              `📄 ${resource.nome}\n\n${resource.link}\n\nQualquer dúvida, estou aqui! 😊`
            );
            console.log(`Link enviado via sendText: ${resource.nome} -> ${lead.telefone}`);
          }
        } catch (error) {
          console.error('Erro ao enviar apresentação:', error);
          // Não quebra o fluxo - continua para marcar como enviado
        }
      }
    }

    const state = conversation.state || {};
    state.apresentacao_enviada = state.apresentacao_enviada || {};
    state.apresentacao_enviada[params.tipo] = {
      enviada: true,
      timestamp: new Date().toISOString()
    };

    const { error: stateError } = await supabase
      .from('conversations')
      .update({ state })
      .eq('id', conversationId);

    if (stateError) throw stateError;

    if (conversation.lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('stage')
        .eq('id', conversation.lead_id)
        .single();

      if (lead?.stage === 'Novo') {
        await handleAtualizarStage(
          { novo_stage: 'Apresentação Enviada', motivo: 'Apresentação enviada via agente' },
          conversation.lead_id
        );
      }

      // Registrar métrica de experimento
      const { data: assignment } = await supabase
        .from('experiment_assignments')
        .select('experiment_id, variant')
        .eq('lead_id', conversation.lead_id)
        .single();
      
      if (assignment) {
        await supabase.from('experiment_results').insert({
          experiment_id: assignment.experiment_id,
          lead_id: conversation.lead_id,
          variant: assignment.variant,
          metric: 'apresentacao_enviada',
          value: 1
        });
      }
    }

    return {
      success: true,
      message: `Apresentação de ${params.tipo} ${resource ? 'enviada' : 'marcada'} com sucesso`
    };
  } catch (error) {
    console.error('Error marking presentation:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function handleSolicitarHandoff(
  params: { motivo: string; urgencia?: string },
  conversationId: string,
  leadId?: string
): Promise<ToolResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('state, lead_id')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return { success: false, error: 'Conversa não encontrada' };
    }

    const state = conversation.state || {};
    state.handoff_solicitado = true;
    state.handoff_motivo = params.motivo;
    state.handoff_urgencia = params.urgencia || 'media';
    state.handoff_timestamp = new Date().toISOString();

    const { error } = await supabase
      .from('conversations')
      .update({ state })
      .eq('id', conversationId);

    if (error) throw error;

    // Buscar dados do lead para notificação
    const actualLeadId = leadId || conversation.lead_id;
    if (actualLeadId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('nome, telefone, necessidade, score_bant')
        .eq('id', actualLeadId)
        .single();

      if (lead) {
        const leadName = lead.nome || 'Lead sem nome';
        const leadNeed = lead.necessidade || 'Não identificada';
        const leadScore = lead.score_bant || 0;
        
        await notifyTeam(
          `HANDOFF SOLICITADO\n\n` +
          `👤 Lead: ${leadName}\n` +
          `📱 Telefone: ${lead.telefone}\n` +
          `💼 Necessidade: ${leadNeed}\n` +
          `📊 Score BANT: ${leadScore}/100\n` +
          `❓ Motivo: ${params.motivo}`,
          (params.urgencia as 'baixa' | 'media' | 'alta') || 'media'
        );
      }
    }

    return {
      success: true,
      message: 'Solicitação de handoff registrada. A equipe será notificada.'
    };
  } catch (error) {
    console.error('Error requesting handoff:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function executeTool(
  toolName: string,
  params: any,
  context: { leadId: string | null; conversationId: string | null; channel?: string }
): Promise<ToolResult> {
  const startTime = Date.now();
  console.log(`[TOOL START] 🔧 ${toolName}`, { params, context });

  const supabase = createClient(supabaseUrl, supabaseKey);
  let result: ToolResult;

  try {
    switch (toolName) {
      // ========== WEB CHAT TOOLS ==========
      case 'ColetarNome':
        result = await handleColetarNome(params, context);
        break;

      case 'ColetarWhatsApp':
        result = await handleColetarWhatsApp(params, context);
        break;

      case 'ColetarEmail':
        result = await handleColetarEmail(params, context);
        break;

      case 'ColetarEmpresa':
        result = await handleColetarEmpresa(params, context);
        break;

      case 'MostrarApresentacaoWeb':
        {
          let leadData = null;
          if (context.leadId) {
            const { data } = await supabase
              .from('leads')
              .select('*')
              .eq('id', context.leadId)
              .single();
            leadData = data;
          }
          result = await handleMostrarApresentacaoWeb(params, leadData);
        }
        break;

      case 'MostrarSlotsWeb':
        result = await handleMostrarSlotsWeb(params, supabase);
        break;

      case 'AgendarReuniaoWeb':
        {
          if (!context.leadId) {
            result = { success: false, error: 'Lead ID necessário para agendar' };
            break;
          }
          const { data: lead } = await supabase
            .from('leads')
            .select('*')
            .eq('id', context.leadId)
            .single();
          result = await handleAgendarReuniaoWeb(params, lead, supabase);
        }
        break;

      case 'BuscarInformacoesWeb':
        result = await handleBuscarInformacoesWeb(params, supabase);
        break;

      // ========== WHATSAPP SPECIFIC TOOLS ==========
      case 'EnviarApresentacaoWhatsApp':
        {
          if (!context.leadId) {
            result = { success: false, error: 'Lead ID necessário' };
            break;
          }
          const { data: lead } = await supabase
            .from('leads')
            .select('telefone')
            .eq('id', context.leadId)
            .single();
          if (!lead?.telefone) {
            result = { success: false, error: 'Telefone do lead não encontrado' };
            break;
          }
          result = await handleEnviarApresentacaoWhatsApp(params, lead.telefone, context.leadId, supabase);
        }
        break;

      case 'BuscarSlotsWhatsApp':
        result = await handleBuscarSlotsWhatsApp(params, supabase);
        break;

      case 'AgendarReuniaoWhatsApp':
        {
          if (!context.leadId) {
            result = { success: false, error: 'Lead ID necessário' };
            break;
          }
          const { data: lead } = await supabase
            .from('leads')
            .select('telefone')
            .eq('id', context.leadId)
            .single();
          if (!lead?.telefone) {
            result = { success: false, error: 'Telefone do lead não encontrado' };
            break;
          }
          result = await handleAgendarReuniaoWhatsApp(params, lead.telefone, context.leadId, supabase);
        }
        break;

      case 'SolicitarHandoff':
        {
          if (!context.conversationId) {
            result = { success: false, error: 'Conversation ID necessário' };
            break;
          }
          if (!context.leadId) {
            result = { success: false, error: 'Lead ID necessário' };
            break;
          }
          const { data: lead } = await supabase
            .from('leads')
            .select('telefone')
            .eq('id', context.leadId)
            .single();
          if (!lead?.telefone) {
            result = { success: false, error: 'Telefone do lead não encontrado' };
            break;
          }
          result = await handleSolicitarHandoffWhatsApp(params, lead.telefone, context.conversationId, supabase);
        }
        break;

      case 'BuscarRecursosWhatsApp':
        result = await handleBuscarRecursosWhatsApp(params, supabase);
        break;
      
      case 'CancelarReuniaoWhatsApp':
        if (!context.leadId) {
          result = { success: false, error: 'Lead ID not found in context' };
          break;
        }
        result = await handleCancelarReuniaoWhatsApp(params, context.leadId, supabase);
        break;

      // ========== WHATSAPP & GENERAL TOOLS ==========
      case 'CriaUsuarioCRM':
        result = await handleCriaUsuarioCRM(params);
        break;

      case 'EnviarApresentacao':
        result = await handleEnviarApresentacao(params, context?.channel);
        break;
      
      case 'AtualizarStatusLead':
        result = await handleAtualizarStatusLead(params);
        break;
      
      case 'AtualizarNecessidadeLead':
        result = await handleAtualizarNecessidadeLead(params);
        break;
      
      case 'EmFechamentoSamuel':
        result = await handleEmFechamentoSamuel(params);
        break;

      // TOOLS ANTIGAS (manter como fallback)
      case 'atualizar_lead':
        if (!context.leadId) {
          result = { success: false, error: 'Lead ID necessário' };
          break;
        }
        result = await handleAtualizarLead(params, context.leadId);
        break;
      
      case 'atualizar_stage':
        if (!context.leadId) {
          result = { success: false, error: 'Lead ID necessário' };
          break;
        }
        result = await handleAtualizarStage(params, context.leadId);
        break;
      
      case 'registrar_bant':
        if (!context.leadId) {
          result = { success: false, error: 'Lead ID necessário' };
          break;
        }
        result = await handleRegistrarBant(params, context.leadId, context.conversationId ?? undefined);
        break;
      
      case 'calcular_score':
        if (!context.leadId) {
          result = { success: false, error: 'Lead ID necessário' };
          break;
        }
        result = await handleCalcularScore(context.leadId);
        break;
      
      case 'buscar_slots':
        result = await handleBuscarSlots(params);
        break;
      
      case 'agendar_reuniao':
        if (!context.leadId) {
          result = { success: false, error: 'Lead ID necessário' };
          break;
        }
        result = await handleAgendarReuniao(params, context.leadId);
        break;
      
      case 'marcar_apresentacao_enviada':
        if (!context.conversationId) {
          result = { success: false, error: 'Conversation ID necessário' };
          break;
        }
        result = await handleMarcarApresentacaoEnviada(params, context.conversationId);
        break;
      
      case 'solicitar_handoff':
        if (!context.conversationId) {
          result = { success: false, error: 'Conversation ID necessário' };
          break;
        }
        result = await handleSolicitarHandoff(params, context.conversationId, context.leadId || undefined);
        break;
      
      default:
        result = { success: false, error: `Tool desconhecida: ${toolName}` };
    }

    // Log de sucesso
    const executionTime = Date.now() - startTime;
    console.log(`[TOOL END] ${result.success ? '✅' : '❌'} ${toolName} (${executionTime}ms)`, result);
    
    // Salvar log no banco de dados
    await logToolExecution(supabase, {
      conversationId: context.conversationId || undefined,
      leadId: context.leadId || undefined,
      toolName,
      params,
      result,
      executionTimeMs: executionTime
    });

    return result;

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorResult: ToolResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    console.error(`[TOOL ERROR] ❌ ${toolName} (${executionTime}ms):`, error);
    
    // Log de erro no banco
    await logToolExecution(supabase, {
      conversationId: context.conversationId || undefined,
      leadId: context.leadId || undefined,
      toolName,
      params,
      result: errorResult,
      executionTimeMs: executionTime
    });

    return errorResult;
  }
}
