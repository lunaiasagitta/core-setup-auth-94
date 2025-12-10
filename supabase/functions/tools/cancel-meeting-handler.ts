interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
}

export async function handleCancelarReuniaoWhatsApp(
  params: { meeting_id: string; motivo: string },
  leadId: string,
  supabaseClient: any
): Promise<ToolResult> {
  console.log('[WhatsApp] ❌ Cancelando reunião:', params.meeting_id, 'Motivo:', params.motivo);

  try {
    // Buscar reunião
    const { data: meeting, error: fetchError } = await supabaseClient
      .from('meetings')
      .select('*')
      .eq('id', params.meeting_id)
      .eq('lead_id', leadId)
      .single();

    if (fetchError || !meeting) {
      console.error('[WhatsApp] Reunião não encontrada:', fetchError);
      return {
        success: false,
        message: 'Não encontrei essa reunião para cancelar. Pode verificar se o ID está correto?'
      };
    }

    if (meeting.status === 'cancelled') {
      return {
        success: false,
        message: 'Esta reunião já foi cancelada anteriormente.'
      };
    }

    // Chamar edge function de cancelamento (que cancela no Google também)
    const { data: cancelResponse, error: cancelError } = await supabaseClient.functions.invoke(
      'google-calendar-cancel',
      { body: { meetingId: params.meeting_id } }
    );

    if (cancelError) {
      console.error('[WhatsApp] Erro ao cancelar:', cancelError);
      return {
        success: false,
        message: 'Tive um problema ao cancelar a reunião. Vou avisar a equipe para ajudar.'
      };
    }

    if (!cancelResponse?.success) {
      console.error('[WhatsApp] Cancelamento falhou:', cancelResponse);
      return {
        success: false,
        message: 'Não consegui cancelar a reunião. A equipe vai verificar isso para você.'
      };
    }

    const dataReuniao = new Date(meeting.scheduled_date);
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

    console.log('[WhatsApp] ✅ Reunião cancelada com sucesso');
    
    return {
      success: true,
      message: `✅ Reunião de ${dataFormatada} às ${horaFormatada} cancelada com sucesso!`,
      data: { 
        cancelled_meeting: {
          id: meeting.id,
          scheduled_date: meeting.scheduled_date,
          status: 'cancelled'
        }
      }
    };
  } catch (error) {
    console.error('[WhatsApp] Erro ao cancelar reunião:', error);
    return {
      success: false,
      message: 'Erro inesperado ao cancelar. Por favor, tente novamente em alguns instantes.'
    };
  }
}
