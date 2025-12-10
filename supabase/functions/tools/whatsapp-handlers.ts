// Handlers específicos para ferramentas do WhatsApp
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')!;
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')!;
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE_NAME')!;

interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
}

export async function handleEnviarApresentacaoWhatsApp(
  params: { justificativa: string; tipo_servico?: string },
  phone: string,
  leadId?: string,
  supabaseClient?: any
): Promise<ToolResult> {
  const tipoServico = params.tipo_servico || 'apresentacao';
  console.log('[WhatsApp] Enviando apresentação para', phone, '- Tipo:', tipoServico);

  // ✅ BUSCAR PDF DA TABELA agent_resources baseado no tipo
  let mediaUrl: string | null = null;
  let nomeApresentacao = 'Apresentação Sagitta Digital';
  let linkAlternativo = 'https://sagittadigital.com.br/apresentacao';
  
  if (supabaseClient) {
    console.log('[WhatsApp] Buscando apresentação na tabela agent_resources...');
    
    // Buscar recurso pelo tipo específico
    const { data: recursoEspecifico, error: errorEspecifico } = await supabaseClient
      .from('agent_resources')
      .select('nome, link, descricao, tipo')
      .eq('tipo', tipoServico)
      .eq('ativo', true)
      .limit(1)
      .maybeSingle();
    
    if (recursoEspecifico?.link) {
      mediaUrl = recursoEspecifico.link;
      nomeApresentacao = recursoEspecifico.nome;
      console.log('[WhatsApp] ✅ Encontrou apresentação específica:', {
        tipo: recursoEspecifico.tipo,
        nome: nomeApresentacao,
        link: mediaUrl
      });
    } else {
      // Fallback 1: buscar tipo 'apresentacao' genérica
      console.log('[WhatsApp] Recurso específico não encontrado, buscando apresentação genérica...');
      const { data: apresentacaoGenerica } = await supabaseClient
        .from('agent_resources')
        .select('nome, link, descricao, tipo')
        .eq('tipo', 'apresentacao')
        .eq('ativo', true)
        .limit(1)
        .maybeSingle();
      
      if (apresentacaoGenerica?.link) {
        mediaUrl = apresentacaoGenerica.link;
        nomeApresentacao = apresentacaoGenerica.nome;
        console.log('[WhatsApp] ✅ Usando apresentação genérica:', nomeApresentacao);
      } else {
        // Fallback 2: buscar primeiro recurso ativo (qualquer tipo)
        console.log('[WhatsApp] Nenhuma apresentação encontrada, buscando primeiro recurso ativo...');
        const { data: primeiroRecurso } = await supabaseClient
          .from('agent_resources')
          .select('nome, link, descricao, tipo')
          .eq('ativo', true)
          .limit(1)
          .maybeSingle();
        
        if (primeiroRecurso?.link) {
          mediaUrl = primeiroRecurso.link;
          nomeApresentacao = primeiroRecurso.nome;
          console.log('[WhatsApp] ⚠️ Usando primeiro recurso disponível:', {
            tipo: primeiroRecurso.tipo,
            nome: nomeApresentacao
          });
        }
      }
    }
  }
  
  // Fallback final: URL hardcoded (caso não encontre nada no banco)
  if (!mediaUrl) {
    console.warn('[WhatsApp] ⚠️ Nenhum recurso encontrado no banco, usando URL hardcoded');
    mediaUrl = 'https://cdn.prod.website-files.com/66697e9880de27c78a1a1efa/666e93f4c0bec44b58ebf2b1_Apresentac%CC%A7a%CC%83o%20Comercial%20Sagitta%20Digital%20%5B2024%5D.pdf';
  }

  try {
    console.log('[WhatsApp] Tentando enviar PDF via Evolution API...');
    console.log('[WhatsApp] URL do PDF:', mediaUrl);
    
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: phone,
        mediatype: 'document',
        mimetype: 'application/pdf',
        fileName: `${nomeApresentacao.replace(/\s+/g, '_')}.pdf`,
        caption: `📄 ${nomeApresentacao}\n\nAqui está nossa apresentação completa com cases de sucesso e soluções.`,
        media: mediaUrl
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WhatsApp] Evolution API erro:', response.status, errorText);
      throw new Error(`Evolution API erro: ${response.status}`);
    }

    console.log('[WhatsApp] ✅ PDF enviado com sucesso!');
    
    // ✅ Atualizar stage automaticamente se leadId fornecido
    if (leadId && supabaseClient) {
      console.log('[WhatsApp] Atualizando stage para "Apresentação Enviada"');
      await supabaseClient
        .from('leads')
        .update({ 
          stage: 'Apresentação Enviada',
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);
        
      await supabaseClient.from('activity_log').insert({
        lead_id: leadId,
        event_type: 'apresentacao_enviada',
        details: { 
          method: 'whatsapp_pdf', 
          justificativa: params.justificativa,
          tipo_servico: tipoServico,
          recurso_nome: nomeApresentacao,
          recurso_url: mediaUrl
        }
      });
    }
    
    return {
      success: true,
      message: '✅ Apresentação enviada com sucesso via WhatsApp!',
      data: { sent_at: new Date().toISOString(), method: 'pdf', nome: nomeApresentacao }
    };
  } catch (error) {
    console.error('[WhatsApp] Erro ao enviar PDF, tentando fallback com link...', error);
    
    // Fallback: Enviar link de texto
    try {
      const fallbackResponse = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          number: phone,
          text: `📄 *${nomeApresentacao}*\n\nVeja nossa apresentação completa:\n${linkAlternativo}\n\nQualquer dúvida, estou aqui! 😊`
        })
      });

      if (!fallbackResponse.ok) {
        throw new Error('Fallback também falhou');
      }

      console.log('[WhatsApp] Link alternativo enviado com sucesso!');
      
      // ✅ Atualizar stage mesmo no fallback
      if (leadId && supabaseClient) {
        console.log('[WhatsApp] Atualizando stage para "Apresentação Enviada" (fallback)');
        await supabaseClient
          .from('leads')
          .update({ 
            stage: 'Apresentação Enviada',
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);
          
        await supabaseClient.from('activity_log').insert({
          lead_id: leadId,
          event_type: 'apresentacao_enviada',
          details: { 
            method: 'whatsapp_link', 
            justificativa: params.justificativa,
            tipo_servico: tipoServico
          }
        });
      }
      
      return {
        success: true,
        message: '✅ Link da apresentação enviado! (PDF indisponível momentaneamente)',
        data: { sent_at: new Date().toISOString(), method: 'link_fallback' }
      };
    } catch (fallbackError) {
      console.error('[WhatsApp] Fallback também falhou:', fallbackError);
      return {
        success: false,
        message: 'Desculpe, tive um problema técnico. Vou solicitar que nossa equipe envie a apresentação diretamente.'
      };
    }
  }
}

export async function handleBuscarSlotsWhatsApp(
  params: { dias_antecedencia?: number },
  supabaseClient: any
): Promise<ToolResult> {
  console.log('[WhatsApp] Buscando slots disponíveis');

  const diasAntecedencia = params.dias_antecedencia || 7;
  const dataInicio = new Date();
  const dataFim = new Date();
  dataFim.setDate(dataFim.getDate() + diasAntecedencia);

  try {
    // ✅ Usar available_slots_view que filtra automaticamente horários passados
    const { data: slots, error } = await supabaseClient
      .from('available_slots_view')
      .select('*')
      .eq('available', true)
      .is('reserved_by', null)
      .gte('date', dataInicio.toISOString().split('T')[0])
      .lte('date', dataFim.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .limit(50);

    if (error) throw error;
    if (!slots || slots.length === 0) {
      return {
        success: true,
        message: 'No momento não tenho horários disponíveis nos próximos dias. Que tal conversarmos diretamente com nossa equipe para achar o melhor horário?',
        data: { slots: [] }
      };
    }

    // Agrupar por data E filtrar horários muito próximos (menos de 30 min)
    const agora = new Date();
    const slotsPorData: Record<string, string[]> = {};
    
    console.log('[BuscarSlots] 🔍 Debug inicial:', {
      totalSlots: slots.length,
      agoraUTC: agora.toISOString(),
      agoraSP: new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })),
      primeiroSlot: slots[0] ? {
        raw: slots[0],
        dateRaw: slots[0].date,
        timeRaw: slots[0].time
      } : null
    });
    
    slots.forEach((slot: any) => {
      // ✅ CORREÇÃO: Extrair apenas HH:MM do formato HH:MM:SS que vem do banco
      const [hours, minutes] = slot.time.split(':');
      const timeOnly = `${hours}:${minutes}`; // "08:00:00" → "08:00"
      
      // Criar timestamp do slot em São Paulo (UTC-3)
      const slotDateTime = new Date(`${slot.date}T${timeOnly}:00-03:00`);
      const diferencaMinutos = (slotDateTime.getTime() - agora.getTime()) / (1000 * 60);
      
      // Log detalhado do primeiro slot para debug
      if (!slotsPorData[slot.date]) {
        console.log('[BuscarSlots] 📊 Processando slot:', {
          date: slot.date,
          timeRaw: slot.time,
          timeProcessed: timeOnly,
          slotDateTimeISO: `${slot.date}T${timeOnly}:00-03:00`,
          slotDateTimeParsed: slotDateTime.toISOString(),
          diferencaMinutos: diferencaMinutos.toFixed(2)
        });
      }
      
      // Só incluir se tiver pelo menos 30 minutos de antecedência
      if (diferencaMinutos >= 30) {
        if (!slotsPorData[slot.date]) {
          slotsPorData[slot.date] = [];
        }
        slotsPorData[slot.date].push(timeOnly);
      }
    });
    
    // ✅ VALIDAÇÃO: Verificar se filtro está eliminando tudo
    if (Object.keys(slotsPorData).length === 0 && slots.length > 0) {
      console.warn('[BuscarSlots] ⚠️ Nenhum slot passou no filtro de 30min!', {
        totalSlotsFromView: slots.length,
        primeiros3Slots: slots.slice(0, 3).map((s: any) => {
          const [h, m] = s.time.split(':');
          return {
            date: s.date,
            time: s.time,
            timeProcessed: `${h}:${m}`,
            diferenciaMinutos: ((new Date(`${s.date}T${h}:${m}:00-03:00`).getTime() - agora.getTime()) / 60000).toFixed(2)
          };
        })
      });
    }

    // Criar versão estruturada com datas completas
    const slotsEstruturados = Object.entries(slotsPorData).map(([data, horarios]) => ({
      data: data, // "2025-11-24"
      dataFormatada: new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      horarios: horarios
    }));

    // Formatar mensagem COM ANO, data completa e indicadores de tempo
    let mensagem = '📅 *Horários Disponíveis*\n\n';
    const hoje = new Date().toISOString().split('T')[0];
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    Object.entries(slotsPorData).slice(0, 5).forEach(([data, horarios]) => {
      const dataObj = new Date(data + 'T00:00:00');
      const dataFormatada = dataObj.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long'
      });
      
      // Adicionar indicador HOJE ou AMANHÃ
      let indicadorDia = '';
      if (data === hoje) indicadorDia = ' 🔵 HOJE';
      else if (data === amanha) indicadorDia = ' 🟢 AMANHÃ';
      
      mensagem += `*${dataFormatada} (${data})${indicadorDia}* 📆\n`;
      
      horarios.slice(0, 4).forEach(horario => {
        // Calcular tempo relativo
        const slotDateTime = new Date(`${data}T${horario}:00-03:00`);
        const diferencaHoras = (slotDateTime.getTime() - agora.getTime()) / (1000 * 60 * 60);
        
        let indicadorTempo = '';
        if (diferencaHoras < 2) {
          const minutos = Math.floor(diferencaHoras * 60);
          indicadorTempo = ` (em ${minutos} min)`;
        }
        
        mensagem += `  • ${horario}${indicadorTempo}\n`;
      });
      mensagem += '\n';
    });

    mensagem += '💡 Para agendar, diga: "Quero [data] às [horário]"\nExemplo: "Quero 2025-11-24 às 10:00"';

    console.log('[WhatsApp] ✅ Slots formatados:', { totalDatas: Object.keys(slotsPorData).length });

    // 🆕 Registrar no activity_log que link da agenda foi enviado
    const { data: systemConfig } = await supabaseClient
      .from('system_config')
      .select('agenda_link')
      .single();
    
    // Buscar lead_id do contexto (precisa ser passado como parâmetro)
    // Por enquanto, vamos logar apenas se tivermos o leadId disponível
    
    return {
      success: true,
      message: mensagem,
      data: { 
        slots: slotsPorData,
        slotsEstruturados: slotsEstruturados,
        agenda_link: systemConfig?.agenda_link
      }
    };
  } catch (error) {
    console.error('[WhatsApp] Erro ao buscar slots:', error);
    return {
      success: false,
      message: 'Tive um problema ao buscar os horários. Vou pedir ajuda para resolvermos isso.'
    };
  }
}

export async function handleAgendarReuniaoWhatsApp(
  params: { data: string; horario: string; duracao?: number },
  phone: string,
  leadId: string,
  supabaseClient: any
): Promise<ToolResult> {
  console.log('[WhatsApp] 📅 Iniciando agendamento:', {
    phone,
    data: params.data,
    horario: params.horario,
    leadId
  });

  try {
    // ✅ CORREÇÃO TIMEZONE: Criar Date com timezone explícito de São Paulo (UTC-3)
    const dataReuniaoISO = `${params.data}T${params.horario}:00-03:00`;
    const dataReuniao = new Date(dataReuniaoISO);
    
    // Agora em UTC (servidor)
    const agora = new Date();
    
    // Validação: Data deve ser entre agora e 90 dias no futuro
    const maxFuturo = new Date();
    maxFuturo.setDate(maxFuturo.getDate() + 90);
    
    // Diferença em minutos (ambos em UTC internamente, comparação correta!)
    const diferencaMinutos = (dataReuniao.getTime() - agora.getTime()) / (1000 * 60);

    console.log('[WhatsApp] 📊 Validação de horário:', {
      reuniao_sp: dataReuniaoISO,
      reuniao_utc: dataReuniao.toISOString(),
      agora_utc: agora.toISOString(),
      diferenca_minutos: diferencaMinutos.toFixed(2)
    });

    // Permitir se for pelo menos 30 minutos no futuro
    if (diferencaMinutos < 30) {
      return {
        success: false,
        message: '⚠️ Este horário já passou ou é muito próximo. Por favor, escolha um horário com pelo menos 30 minutos de antecedência.\n\nQue tal buscar novos horários disponíveis?',
        data: { error: 'horario_muito_proximo', diferenca_minutos: diferencaMinutos }
      };
    }
    
    if (dataReuniao > maxFuturo) {
      console.error('[WhatsApp] ❌ Data muito distante:', {
        fornecida: params.data,
        maxFuturo: maxFuturo.toISOString()
      });
      
      return {
        success: false,
        message: '⚠️ ERRO: Data muito distante (mais de 90 dias). Por favor, busque slots disponíveis novamente com BuscarSlotsWhatsApp.',
        data: { error: 'too_far_future' }
      };
     }

    // ✅ LOCK: Verificar se já está processando agendamento nos últimos 30 segundos
    console.log('[WhatsApp] 🔒 Verificando lock de agendamento...');
    const { data: processingMeeting } = await supabaseClient
      .from('meetings')
      .select('id, created_at, status')
      .eq('lead_id', leadId)
      .in('status', ['scheduled', 'confirmed'])
      .gte('created_at', new Date(Date.now() - 30000).toISOString())
      .maybeSingle();

    if (processingMeeting) {
      const tempoDecorrido = (Date.now() - new Date(processingMeeting.created_at).getTime()) / 1000;
      console.log('[WhatsApp] ⚠️ AGENDAMENTO JÁ EM ANDAMENTO!', {
        meeting_id: processingMeeting.id,
        tempo_decorrido_seg: tempoDecorrido.toFixed(1)
      });
      
      return {
        success: false,
        message: '⏳ Seu agendamento está sendo processado. Aguarde alguns segundos...',
        data: { 
          error: 'already_processing',
          meeting_id: processingMeeting.id,
          tempo_decorrido: tempoDecorrido
        }
      };
    }

    // ✅ RESERVAR SLOT ANTES DE CRIAR REUNIÃO
    console.log('[WhatsApp] 🔒 Tentando reservar slot:', { data: params.data, horario: params.horario });
    
    const { data: slotToReserve, error: slotCheckError } = await supabaseClient
      .from('calendar_slots')
      .select('id, available')
      .eq('date', params.data)
      .eq('time', params.horario)
      .maybeSingle();

    if (slotCheckError) {
      console.error('[WhatsApp] ❌ Erro ao verificar slot:', slotCheckError);
      return {
        success: false,
        message: '⚠️ Erro ao verificar disponibilidade. Tente novamente ou busque outros horários.',
        data: { error: 'slot_check_failed' }
      };
    }

    if (!slotToReserve) {
      console.error('[WhatsApp] ❌ Slot não existe');
      return {
        success: false,
        message: '⚠️ Este horário não está disponível. Por favor, busque novos horários com BuscarSlotsWhatsApp.',
        data: { error: 'slot_not_found' }
      };
    }

    if (!slotToReserve.available) {
      console.error('[WhatsApp] ❌ Slot já está ocupado');
      return {
        success: false,
        message: '⚠️ Este horário acabou de ser ocupado. Por favor, busque novos horários com BuscarSlotsWhatsApp.',
        data: { error: 'slot_already_taken' }
      };
    }

    // Marcar slot como indisponível
    const { error: slotUpdateError } = await supabaseClient
      .from('calendar_slots')
      .update({ 
        available: false,
        reserved_by: leadId,
        reserved_at: new Date().toISOString()
      })
      .eq('id', slotToReserve.id);

    if (slotUpdateError) {
      console.error('[WhatsApp] ❌ Erro ao reservar slot:', slotUpdateError);
      return {
        success: false,
        message: '⚠️ Erro ao reservar horário. Tente novamente.',
        data: { error: 'slot_reservation_failed' }
      };
    }

    console.log('[WhatsApp] ✅ Slot reservado com sucesso');

    // ✅ VERIFICAR DUPLICAÇÃO ANTES de criar no Google Calendar
    console.log('[WhatsApp] 🔍 Verificando duplicação ANTES do Google...');
    // dataReuniao já foi declarada na linha 368, reutilizando
    
    const { data: existingMeeting } = await supabaseClient
      .from('meetings')
      .select('id, status, meeting_link, scheduled_date, duration')
      .eq('lead_id', leadId)
      .eq('scheduled_date', dataReuniao.toISOString())
      .in('status', ['scheduled', 'confirmed'])
      .maybeSingle();

    if (existingMeeting) {
      console.log('[WhatsApp] ⚠️ REUNIÃO JÁ EXISTE! Abortando antes do Google:', existingMeeting.id);
      
      // Liberar slot que foi reservado
      await supabaseClient
        .from('calendar_slots')
        .update({ available: true, reserved_by: null, reserved_at: null })
        .eq('id', slotToReserve.id);
      
      const dataFormatada = dataReuniao.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });
      
      return {
        success: true,
        message: `✅ Sua reunião já está confirmada!\n\n📅 ${dataFormatada}\n⏱️ Duração: ${existingMeeting.duration}min\n🔗 ${existingMeeting.meeting_link}`,
        data: { 
          meeting_id: existingMeeting.id,
          already_exists: true
        }
      };
    }

    // 🚨 OPÇÃO C (HÍBRIDO): Tentar criar no Google Calendar PRIMEIRO
    let googleEventId = null;
    let meetingLink = null;
    
    try {
      console.log('[WhatsApp] 🔄 Tentando criar evento no Google Calendar...');
      
      // Chamar edge function do Google Calendar (passar em UTC)
      const { data: googleResponse, error: googleError } = await supabaseClient.functions.invoke(
        'google-calendar-create',
        {
          body: {
            leadId,
            scheduledDate: dataReuniao.toISOString(), // ✅ Passa em UTC
            duration: params.duracao || 30,
          },
        }
      );

      if (!googleError && googleResponse?.success) {
        googleEventId = googleResponse.eventId;
        meetingLink = googleResponse.meetingLink;
        console.log('[WhatsApp] ✅ Evento criado no Google Calendar:', { googleEventId, meetingLink });
      } else {
        console.warn('[WhatsApp] ⚠️ Google Calendar falhou (será sincronizado depois):', googleError);
      }
    } catch (googleError) {
      console.warn('[WhatsApp] ⚠️ Erro ao criar no Google (não crítico):', googleError);
    }

    // ✅ Verificação de duplicação já foi feita ANTES do Google Calendar

    // 🚨 SE CHEGOU AQUI, NÃO EXISTE → CRIAR NORMALMENTE
    console.log('[WhatsApp] ✅ Nenhuma duplicação encontrada. Prosseguindo com agendamento...');

    // Criar meeting no banco (salvar em UTC)
    const { data: meeting, error: meetingError } = await supabaseClient
      .from('meetings')
      .insert({
        lead_id: leadId,
        scheduled_date: dataReuniao.toISOString(), // ✅ Salva em UTC
        duration: params.duracao || 30,
        status: 'scheduled',
        google_event_id: googleEventId, // Pode ser null
        meeting_link: meetingLink, // Pode ser null
      })
      .select()
      .single();

    if (meetingError) {
      console.error('[WhatsApp] ❌ Erro ao criar meeting:', meetingError);
      
      // 🔄 Liberar slot se falhou criar meeting
      await supabaseClient
        .from('calendar_slots')
        .update({ 
          available: true,
          reserved_by: null,
          reserved_at: null
        })
        .eq('id', slotToReserve.id);
      
      throw meetingError;
    }

    // Formatar data para mensagem (em timezone de Brasília)
    const dataFormatada = dataReuniao.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });

    // Mensagem diferente se tiver link do Meet ou não
    let mensagem;
    if (meetingLink) {
      mensagem = `✅ *Reunião Agendada com Sucesso!*\n\n📅 ${dataFormatada}\n⏱️ Duração: ${params.duracao || 30} minutos\n🔗 Link: ${meetingLink}\n\n✉️ Convite enviado por email!\n\nNos vemos lá! 🚀`;
    } else {
      mensagem = `✅ *Reunião Agendada!*\n\n📅 ${dataFormatada}\n⏱️ Duração: ${params.duracao || 30} minutos\n\n⏳ O link do Google Meet será enviado por email em breve.\n\nNos vemos lá! 🚀`;
    }

    console.log('[WhatsApp] ✅ Reunião agendada com sucesso:', meeting.id);
    
    // ✅ Atualizar stage automaticamente para "Reunião Agendada"
    console.log('[WhatsApp] Atualizando stage para "Reunião Agendada"');
    await supabaseClient
      .from('leads')
      .update({ 
        stage: 'Reunião Agendada',
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);
      
    await supabaseClient.from('activity_log').insert({
      lead_id: leadId,
      event_type: 'reuniao_agendada',
      details: { 
        data: params.data, 
        horario: params.horario, 
        meeting_link: meetingLink,
        meeting_id: meeting.id 
      }
    });
    
    return {
      success: true,
      message: mensagem,
      data: { 
        meeting_id: meeting.id, 
        scheduled_date: dataReuniao.toISOString(),
        meeting_link: meetingLink,
      }
    };
  } catch (error) {
    console.error('[WhatsApp] Erro ao agendar reunião:', error);
    return {
      success: false,
      message: 'Desculpe, tive um problema ao agendar. Vou solicitar que nossa equipe entre em contato.'
    };
  }
}

export async function handleSolicitarHandoff(
  params: { motivo: string; urgencia: string },
  phone: string,
  conversationId: string,
  supabaseClient: any,
  leadId?: string
): Promise<ToolResult> {
  console.log('[WhatsApp] Solicitando handoff:', params.motivo);

  try {
    // Criar notificação
    await supabaseClient
      .from('notifications')
      .insert({
        type: 'handoff_request',
        title: `Handoff Solicitado - ${params.urgencia}`,
        description: `WhatsApp: ${phone}\nMotivo: ${params.motivo}`,
        link: `/inbox?conversation=${conversationId}`
      });

    // 🆕 Registrar no activity_log
    if (leadId) {
      await supabaseClient.from('activity_log').insert({
        lead_id: leadId,
        event_type: 'handoff_solicitado',
        details: { 
          motivo: params.motivo,
          urgencia: params.urgencia,
          timestamp: new Date().toISOString()
        }
      });
    }

    const mensagem = params.urgencia === 'alta'
      ? 'Entendo a urgência! Vou chamar nossa equipe agora mesmo. Alguém entrará em contato em instantes. 🚨'
      : 'Perfeito! Vou passar sua solicitação para nossa equipe. Alguém entrará em contato em breve. ⏱️';

    return {
      success: true,
      message: mensagem,
      data: { handoff_requested: true, urgency: params.urgencia }
    };
  } catch (error) {
    console.error('[WhatsApp] Erro ao solicitar handoff:', error);
    return {
      success: false,
      message: 'Nossa equipe já foi notificada e entrará em contato em breve!'
    };
  }
}

export async function handleBuscarRecursosWhatsApp(
  params: { consulta: string; tipo?: string },
  supabaseClient: any
): Promise<ToolResult> {
  console.log('[WhatsApp] Buscando recursos:', params.consulta);

  try {
    const { data: recursos, error } = await supabaseClient
      .from('agent_resources')
      .select('*')
      .eq('ativo', true)
      .ilike('nome', `%${params.consulta}%`)
      .limit(5);

    if (error) throw error;

    if (!recursos || recursos.length === 0) {
      return {
        success: true,
        message: 'Não encontrei informações específicas sobre isso no momento. Posso te conectar com nossa equipe para uma consulta mais detalhada?',
        data: { found: false }
      };
    }

    let mensagem = `📦 *Encontrei isso para você:*\n\n`;
    recursos.forEach((recurso: any, index: number) => {
      mensagem += `${index + 1}. *${recurso.nome}*\n`;
      if (recurso.descricao) mensagem += `   ${recurso.descricao}\n`;
      if (recurso.preco) mensagem += `   💰 ${recurso.preco}\n`;
      if (recurso.link) mensagem += `   🔗 ${recurso.link}\n`;
      mensagem += '\n';
    });

    mensagem += 'Quer saber mais sobre algum desses?';

    return {
      success: true,
      message: mensagem,
      data: { recursos }
    };
  } catch (error) {
    console.error('[WhatsApp] Erro ao buscar recursos:', error);
    return {
      success: false,
      message: 'Tive um problema ao buscar essas informações. Posso te ajudar com outra coisa?'
    };
  }
}
