import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { deleteEvent } from '../google/calendar.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId } = await req.json();

    if (!meetingId) {
      throw new Error('meetingId is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar reunião
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('google_event_id, status')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      throw new Error('Meeting not found');
    }

    // Se tem google_event_id, cancelar no Google
    if (meeting.google_event_id) {
      console.log(`🔴 Cancelling Google Calendar event: ${meeting.google_event_id}`);
      
      try {
        await deleteEvent(meeting.google_event_id);
        console.log(`✅ Event cancelled in Google Calendar`);
      } catch (error) {
        console.error(`⚠️ Failed to cancel in Google:`, error);
        // Não falhar se Google der erro (pode já estar deletado)
      }
    }

    // Buscar detalhes da reunião para liberar o slot
    const { data: meetingDetails, error: detailsError } = await supabase
      .from('meetings')
      .select('scheduled_date, duration, lead_id')
      .eq('id', meetingId)
      .single();

    // Atualizar status local
    await supabase
      .from('meetings')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', meetingId);

    // Liberar o slot correspondente
    if (meetingDetails && !detailsError) {
      const scheduledDate = new Date(meetingDetails.scheduled_date);
      
      // ✅ CORREÇÃO: Converter para timezone BRT antes de extrair date/time
      const dateStrBRT = scheduledDate.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split('/').reverse().join('-'); // "DD/MM/YYYY" → "YYYY-MM-DD"

      const timeStrBRT = scheduledDate.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).substring(0, 5); // "HH:MM:SS" → "HH:MM"

      console.log(`🔓 Liberando slot: date=${dateStrBRT}, time=${timeStrBRT}`);

      const { error: slotError } = await supabase
        .from('calendar_slots')
        .update({
          available: true,
          reserved_by: null,
          reserved_at: null
        })
        .eq('date', dateStrBRT)
        .eq('time', timeStrBRT)
        .eq('reserved_by', meetingDetails.lead_id);

      if (slotError) {
        console.error('⚠️ Erro ao liberar slot:', slotError);
      } else {
        console.log('✅ Slot liberado com sucesso');
      }
    }

    console.log(`✅ Meeting ${meetingId} cancelled successfully`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error cancelling meeting:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
