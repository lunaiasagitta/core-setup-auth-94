import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createEvent } from '../google/calendar.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Buscando reuniões sem Google Event ID...');

    // Buscar reuniões que não estão no Google Calendar ainda
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select(`
        id,
        scheduled_date,
        duration,
        status,
        lead_id,
        lead:leads!inner(id, nome, email)
      `)
      .is('google_event_id', null)
      .in('status', ['scheduled', 'confirmed'])
      .order('scheduled_date', { ascending: true });

    if (meetingsError) {
      console.error('Erro ao buscar reuniões:', meetingsError);
      throw meetingsError;
    }

    console.log(`📊 Encontradas ${meetings?.length || 0} reuniões para exportar`);

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    // Processar cada reunião
    for (const meeting of meetings || []) {
      try {
        console.log(`\n📤 Exportando reunião ${meeting.id}...`);

        const lead = Array.isArray(meeting.lead) ? meeting.lead[0] : meeting.lead;

        const startTime = new Date(meeting.scheduled_date).toISOString();
        const endTime = new Date(
          new Date(meeting.scheduled_date).getTime() + (meeting.duration || 30) * 60000
        ).toISOString();

        // Criar evento no Google Calendar
        const { eventId, meetingLink } = await createEvent({
          summary: `Reunião com ${lead?.nome || 'Lead'}`,
          startTime,
          endTime,
          attendees: lead?.email ? [lead.email] : [],
          description: `Reunião agendada com ${lead?.nome || 'Lead'}`,
        });

        // Atualizar reunião no banco
        const { error: updateError } = await supabase
          .from('meetings')
          .update({
            google_event_id: eventId,
            meeting_link: meetingLink,
          })
          .eq('id', meeting.id);

        if (updateError) {
          console.error(`Erro ao atualizar reunião ${meeting.id}:`, updateError);
          errorCount++;
          errors.push({ meeting_id: meeting.id, error: updateError.message });
        } else {
          console.log(`✅ Reunião ${meeting.id} exportada com sucesso!`);
          successCount++;
        }
      } catch (error) {
        console.error(`Erro ao processar reunião ${meeting.id}:`, error);
        errorCount++;
        errors.push({ 
          meeting_id: meeting.id, 
          error: error instanceof Error ? error.message : 'Erro desconhecido' 
        });
      }
    }

    console.log(`\n📊 Resumo da exportação:`);
    console.log(`✅ Sucesso: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        total: meetings?.length || 0,
        exported: successCount,
        errors: errorCount,
        errorDetails: errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro na exportação para Google Calendar:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
