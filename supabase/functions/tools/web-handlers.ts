// Handlers específicos para ferramentas do Web Chat

interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  ui_action?: {
    type: string;
    payload: any;
  };
}

export async function handleColetarNome(
  params: { pergunta_personalizada: string },
  conversationState: any
): Promise<ToolResult> {
  console.log('[WebChat] ✅ ColetarNome executado:', params);

  return {
    success: true,
    message: params.pergunta_personalizada,
    data: { 
      awaiting: 'nome',
      field: 'nome',
      action: 'collect_name'
    },
    ui_action: {
      type: 'highlight_input',
      payload: { placeholder: 'Digite seu nome completo' }
    }
  };
}

export async function handleColetarWhatsApp(
  params: { motivo: string },
  conversationState: any
): Promise<ToolResult> {
  console.log('[WebChat] ✅ ColetarWhatsApp executado:', params);

  const mensagem = `Para ${params.motivo}, pode me passar seu WhatsApp? (formato: 11 99999-9999)`;

  return {
    success: true,
    message: mensagem,
    data: { 
      awaiting: 'whatsapp',
      field: 'telefone',
      action: 'collect_phone'
    },
    ui_action: {
      type: 'highlight_input',
      payload: { 
        placeholder: '11 99999-9999',
        validation: 'phone'
      }
    }
  };
}

export async function handleColetarEmail(
  params: { contexto: string },
  conversationState: any
): Promise<ToolResult> {
  console.log('[WebChat] ✅ ColetarEmail executado:', params);

  const mensagem = `Para ${params.contexto}, qual seu melhor email?`;

  return {
    success: true,
    message: mensagem,
    data: { 
      awaiting: 'email',
      field: 'email',
      action: 'collect_email'
    },
    ui_action: {
      type: 'highlight_input',
      payload: { 
        placeholder: 'seu@email.com',
        validation: 'email'
      }
    }
  };
}

export async function handleColetarEmpresa(
  params: { opcional?: boolean },
  conversationState: any
): Promise<ToolResult> {
  console.log('[WebChat] Solicitando empresa');

  const mensagem = params.opcional
    ? 'Se quiser, pode me dizer qual empresa você representa? (opcional)'
    : 'Qual empresa você representa?';

  return {
    success: true,
    message: mensagem,
    data: { 
      awaiting: 'empresa',
      field: 'empresa',
      optional: params.opcional || false
    },
    ui_action: {
      type: 'highlight_input',
      payload: { placeholder: 'Nome da empresa' }
    }
  };
}

export async function handleMostrarApresentacaoWeb(
  params: { mensagem_intro: string },
  leadData: any
): Promise<ToolResult> {
  console.log('[WebChat] Mostrando apresentação');

  const apresentacaoUrl = 'https://cdn.prod.website-files.com/66697e9880de27c78a1a1efa/666e93f4c0bec44b58ebf2b1_Apresentac%CC%A7a%CC%83o%20Comercial%20Sagitta%20Digital%20%5B2024%5D.pdf';

  const mensagem = `${params.mensagem_intro}\n\n📄 **[Clique aqui para ver nossa apresentação](${apresentacaoUrl})**\n\nDepois que der uma olhada, me conta o que achou! 😊`;

  return {
    success: true,
    message: mensagem,
    data: { 
      apresentacao_url: apresentacaoUrl,
      sent_at: new Date().toISOString()
    },
    ui_action: {
      type: 'show_link_card',
      payload: {
        title: 'Apresentação Comercial',
        description: 'Sagitta Digital - Soluções em IA',
        url: apresentacaoUrl,
        icon: '📄'
      }
    }
  };
}

export async function handleMostrarSlotsWeb(
  params: { dias_antecedencia?: number },
  supabaseClient: any
): Promise<ToolResult> {
  console.log('[WebChat] ✅ MostrarSlotsWeb executado - buscando slots disponíveis');

  const diasAntecedencia = params.dias_antecedencia || 7;
  const dataInicio = new Date();
  const dataFim = new Date();
  dataFim.setDate(dataFim.getDate() + diasAntecedencia);

  try {
    const { data: slots, error } = await supabaseClient
      .from('calendar_slots')
      .select('*')
      .eq('available', true)
      .gte('date', dataInicio.toISOString().split('T')[0])
      .lte('date', dataFim.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .limit(30);

    if (error) {
      console.error('[WebChat] ❌ Erro ao buscar slots:', error);
      throw error;
    }

    console.log(`[WebChat] 📅 ${slots?.length || 0} slots encontrados`);

    if (!slots || slots.length === 0) {
      return {
        success: true,
        message: 'No momento não tenho horários disponíveis nos próximos dias. 😅\n\nMas não se preocupe! Você pode agendar direto na agenda: https://calendar.app.google/CnGg9rndn1WLWtWL7\n\nOu nossa equipe pode te chamar. Prefere qual opção?',
        data: { slots: [], has_slots: false }
      };
    }

    // Agrupar por data
    const slotsPorData: Record<string, any[]> = {};
    slots.forEach((slot: any) => {
      if (!slotsPorData[slot.date]) {
        slotsPorData[slot.date] = [];
      }
      slotsPorData[slot.date].push({
        time: slot.time,
        duration: slot.duration,
        id: slot.id
      });
    });

    // Criar mensagem amigável
    let mensagem = '📅 **Horários Disponíveis:**\n\n';
    const datas = Object.keys(slotsPorData).slice(0, 5); // Mostrar até 5 dias
    
    datas.forEach(data => {
      const dataObj = new Date(data + 'T00:00:00');
      const dataFormatada = dataObj.toLocaleDateString('pt-BR', { 
        weekday: 'short', 
        day: '2-digit', 
        month: 'short' 
      });
      
      const horarios = slotsPorData[data].slice(0, 4).map(s => s.time.substring(0, 5)).join(', ');
      mensagem += `• **${dataFormatada}**: ${horarios}\n`;
    });

    mensagem += '\nQual dia e horário funcionam melhor para você?';

    return {
      success: true,
      message: mensagem,
      data: { 
        slots: slotsPorData,
        total: slots.length,
        has_slots: true
      },
      ui_action: {
        type: 'show_calendar',
        payload: {
          slots: slotsPorData,
          timezone: 'America/Sao_Paulo'
        }
      }
    };
  } catch (error) {
    console.error('[WebChat] ❌ Erro crítico ao buscar slots:', error);
    return {
      success: false,
      message: 'Ops, tive um problema ao carregar a agenda. 😅\n\nMas você pode agendar direto aqui: https://calendar.app.google/CnGg9rndn1WLWtWL7'
    };
  }
}

export async function handleAgendarReuniaoWeb(
  params: { data: string; horario: string; duracao?: number },
  leadData: any,
  supabaseClient: any
): Promise<ToolResult> {
  console.log('[WebChat] ✅ AgendarReuniaoWeb executado:', { params, leadId: leadData?.id });

  // Validar dados necessários
  if (!leadData || !leadData.nome || !leadData.email || !leadData.telefone) {
    console.log('[WebChat] ❌ Dados incompletos para agendamento:', leadData);
    return {
      success: false,
      message: 'Para confirmar o agendamento, preciso que você complete: nome, email e WhatsApp.',
      data: { 
        missing_fields: true,
        has_nome: !!leadData?.nome,
        has_email: !!leadData?.email,
        has_telefone: !!leadData?.telefone
      }
    };
  }

  try {
    const scheduledDate = `${params.data}T${params.horario}:00`;
    console.log('[WebChat] 📅 Criando meeting para:', scheduledDate);
    
    // Criar meeting
    const { data: meeting, error: meetingError } = await supabaseClient
      .from('meetings')
      .insert({
        lead_id: leadData.id,
        scheduled_date: scheduledDate,
        duration: params.duracao || 30,
        status: 'pending_confirmation'
      })
      .select()
      .single();

    if (meetingError) {
      console.error('[WebChat] ❌ Erro ao criar meeting:', meetingError);
      throw meetingError;
    }

    console.log('[WebChat] ✅ Meeting criado:', meeting.id);

    // Reservar slot
    const { error: slotError } = await supabaseClient
      .from('calendar_slots')
      .update({
        available: false,
        reserved_by: leadData.id,
        reserved_at: new Date().toISOString()
      })
      .eq('date', params.data)
      .eq('time', params.horario);

    if (slotError) {
      console.error('[WebChat] ⚠️ Erro ao reservar slot (não crítico):', slotError);
    } else {
      console.log('[WebChat] ✅ Slot reservado');
    }

    const dataFormatada = new Date(scheduledDate).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });

    const mensagem = `✅ **Reunião Agendada!**\n\n📅 ${dataFormatada}\n⏱️ Duração: ${params.duracao || 30} minutos\n\nVocê receberá confirmação no email **${leadData.email}** e no WhatsApp **${leadData.telefone}**!\n\nNos vemos em breve! 🚀`;

    console.log('[WebChat] ✅ Agendamento concluído com sucesso');

    return {
      success: true,
      message: mensagem,
      data: { 
        meeting_id: meeting.id,
        status: 'pending_confirmation',
        scheduled_date: scheduledDate
      },
      ui_action: {
        type: 'show_confirmation',
        payload: {
          type: 'meeting_scheduled',
          meeting: {
            date: dataFormatada,
            duration: params.duracao || 30,
            email: leadData.email
          }
        }
      }
    };
  } catch (error) {
    console.error('[WebChat] ❌ Erro crítico ao agendar:', error);
    return {
      success: false,
      message: 'Desculpe, tive um problema ao agendar. 😅\n\nMas você pode agendar direto aqui: https://calendar.app.google/CnGg9rndn1WLWtWL7'
    };
  }
}

export async function handleBuscarInformacoesWeb(
  params: { pergunta: string },
  supabaseClient: any
): Promise<ToolResult> {
  console.log('[WebChat] Buscando informações:', params.pergunta);

  try {
    // Buscar na base de conhecimento (implementação simplificada)
    const { data: knowledge, error } = await supabaseClient
      .from('knowledge_base')
      .select('*')
      .ilike('content', `%${params.pergunta}%`)
      .limit(3);

    if (error) throw error;

    if (!knowledge || knowledge.length === 0) {
      return {
        success: true,
        message: 'Não encontrei informações específicas sobre isso aqui. Quer conversar com nossa equipe diretamente? Eles podem te ajudar melhor!',
        data: { found: false }
      };
    }

    let mensagem = 'Encontrei isso para você:\n\n';
    knowledge.forEach((item: any) => {
      mensagem += `**${item.title}**\n${item.content.substring(0, 200)}...\n\n`;
    });

    mensagem += 'Isso responde sua dúvida?';

    return {
      success: true,
      message: mensagem,
      data: { 
        knowledge_items: knowledge.length,
        found: true
      }
    };
  } catch (error) {
    console.error('[WebChat] Erro ao buscar informações:', error);
    return {
      success: false,
      message: 'Tive um problema ao buscar isso. Posso te ajudar com outra coisa?'
    };
  }
}
