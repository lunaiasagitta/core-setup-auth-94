import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { listEvents, deleteEvent } from '../google/calendar.ts';

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

    console.log('Starting Google Calendar sync...');

    // Buscar eventos do Google Calendar (próximos 30 dias)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const googleEvents = await listEvents(
      now.toISOString(),
      thirtyDaysFromNow.toISOString()
    );

    console.log(`Found ${googleEvents.length} events in Google Calendar`);
    
    console.log('🔍 RAW EVENTS FROM GOOGLE:', JSON.stringify(googleEvents, null, 2));

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const event of googleEvents) {
      try {
        console.log(`🔍 RAW EVENT STRUCTURE:`, JSON.stringify(event, null, 2));
        
        // Pular eventos sem horário definido (eventos de dia inteiro)
        if (!event.start?.dateTime || !event.end?.dateTime) {
          console.log(`⏭️ Skipping all-day event: ${event.id}`, {
            hasStartDateTime: !!event.start?.dateTime,
            hasEndDateTime: !!event.end?.dateTime,
            startData: event.start,
            endData: event.end,
          });
          skipped++;
          continue;
        }

        console.log(`📋 Processing event ${event.id}:`, {
          summary: event.summary,
          status: event.status,
          start: event.start.dateTime,
        });

        // Buscar meeting por google_event_id
        const { data: existingMeeting } = await supabase
          .from('meetings')
          .select('*')
          .eq('google_event_id', event.id)
          .single();

        if (existingMeeting) {
          // Verificar se precisa atualizar
          const eventDate = new Date(event.start.dateTime);
          const existingDate = new Date(existingMeeting.scheduled_date);
          
          const dateChanged = eventDate.getTime() !== existingDate.getTime();
          const googleCancelled = event.status === 'cancelled';
          const localCancelled = existingMeeting.status === 'cancelled';
          const statusChanged = googleCancelled !== localCancelled;
          
          if (dateChanged || statusChanged) {
            console.log(`Meeting ${existingMeeting.id} needs update:`, {
              dateChanged,
              statusChanged,
              googleStatus: event.status,
              localStatus: existingMeeting.status
            });
            
            const updateData: any = {
              scheduled_date: event.start.dateTime,
              meeting_link: event.hangoutLink || existingMeeting.meeting_link,
              updated_at: new Date().toISOString(),
            };
            
            // CORREÇÃO CRÍTICA: Se está cancelado localmente mas ativo no Google
            // → CANCELAR NO GOOGLE também (não reativar no sistema!)
            if (localCancelled && !googleCancelled) {
              console.log(`🔴 Local cancelled but Google active. Cancelling in Google: ${event.id}`);
              try {
                await deleteEvent(event.id);
                console.log(`✅ Event cancelled in Google Calendar`);
              } catch (error) {
                console.error(`⚠️ Failed to cancel in Google:`, error);
              }
              skipped++;
              continue; // Pular atualização local - manter cancelado
            }
            
        // Se foi cancelado no Google, atualizar status local
        if (googleCancelled && !localCancelled) {
          updateData.status = 'cancelled';
          updateData.cancelled_at = new Date().toISOString();
          console.log(`🔴 Cancelling meeting ${existingMeeting.id}`);
          
          // ✅ LIBERAR O SLOT CORRESPONDENTE
          if (existingMeeting.lead_id) {
            const scheduledDate = new Date(event.start.dateTime);
            
            // Converter para BRT
            const dateStrBRT = scheduledDate.toLocaleDateString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).split('/').reverse().join('-');

            const timeStrBRT = scheduledDate.toLocaleTimeString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }).substring(0, 5);

            console.log(`🔓 Liberando slot cancelado pelo Google: ${dateStrBRT} ${timeStrBRT}`);

            await supabase
              .from('calendar_slots')
              .update({
                available: true,
                reserved_by: null,
                reserved_at: null
              })
              .eq('date', dateStrBRT)
              .eq('time', timeStrBRT)
              .eq('reserved_by', existingMeeting.lead_id);

            console.log(`✅ Slot liberado após cancelamento no Google`);
          }
        }
            
            // Atualizar meeting
            await supabase
              .from('meetings')
              .update(updateData)
              .eq('id', existingMeeting.id);
            
            updated++;
            console.log(`✅ Updated meeting ${existingMeeting.id}`);
          } else {
            skipped++;
          }
        } else {
          // Criar novo meeting
          // 🚨 CORREÇÃO: Se evento está cancelado, não criar nada
          if (event.status === 'cancelled') {
            console.log(`⏭️ Skipping cancelled event creation: ${event.id}`);
            skipped++;
            continue;
          }
          
          // Tentar encontrar lead pelo email dos participantes
          let leadId = null;
          
          if (event.attendees && event.attendees.length > 0) {
            const attendeeEmail = event.attendees[0].email;
            const { data: lead } = await supabase
              .from('leads')
              .select('id')
              .eq('email', attendeeEmail)
              .single();
            
            if (lead) {
              leadId = lead.id;
            } else {
              // Criar lead básico com status correto
              const { data: newLead } = await supabase
                .from('leads')
                .insert({
                  email: attendeeEmail,
                  nome: event.attendees[0].displayName || attendeeEmail.split('@')[0],
                  telefone: 'N/A',
                  stage: 'Reunião Agendada', // Aqui está OK pois só cria se NÃO está cancelado
                })
                .select()
                .single();
              
              if (newLead) {
                leadId = newLead.id;
              }
            }
          }

          // Calcular duração
          const startTime = new Date(event.start.dateTime);
          const endTime = new Date(event.end.dateTime);
          const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

          const finalStatus = event.status === 'cancelled' ? 'cancelled' : 'scheduled';
          console.log(`🆕 Creating new meeting:`, {
            eventId: event.id,
            googleStatus: event.status,
            finalStatus,
            duration,
          });

          // Inserir meeting
          await supabase
            .from('meetings')
            .insert({
              lead_id: leadId,
              scheduled_date: event.start.dateTime,
              duration,
              status: finalStatus,
              google_event_id: event.id,
              meeting_link: event.hangoutLink,
            });

          // Bloquear slot correspondente se reunião não está cancelada
          if (leadId && finalStatus !== 'cancelled') {
            // Extrair horário local diretamente do event.start.dateTime (mantém timezone original)
            const eventDateTime = event.start.dateTime; // Ex: "2025-11-24T08:00:00-03:00"
            const [datePart, timePart] = eventDateTime.split('T');
            const slotDate = datePart; // "2025-11-24"
            const slotTime = timePart.substring(0, 5); // "08:00" (horário local BRT)
            
            console.log(`🔒 Blocking slot for meeting from Google:`, { slotDate, slotTime, duration });
            
            const { error: slotError } = await supabase
              .from('calendar_slots')
              .update({
                available: false,
                reserved_by: leadId,
                reserved_at: new Date().toISOString(),
              })
              .eq('date', slotDate)
              .eq('time', slotTime)
              .eq('duration', duration);
            
            if (slotError) {
              console.error(`⚠️ Failed to block slot:`, slotError);
            } else {
              console.log(`✅ Slot blocked successfully`);
            }
          }

          created++;
          console.log(`✅ Created new meeting from event ${event.id} with status: ${finalStatus}`);
        }
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        errors.push(`Event ${event.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const summary = {
      success: true,
      total: googleEvents.length,
      created,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Sync completed:', summary);

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in google-calendar-sync:', error);
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
