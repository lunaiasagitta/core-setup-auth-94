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

    const { leadId, scheduledDate, duration } = await req.json();

    if (!leadId || !scheduledDate) {
      throw new Error('leadId and scheduledDate are required');
    }

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('nome, email')
      .eq('id', leadId)
      .single();

    if (leadError) throw leadError;

    const startTime = new Date(scheduledDate).toISOString();
    const endTime = new Date(new Date(scheduledDate).getTime() + (duration || 30) * 60000).toISOString();

    // Normalizar e-mail antes de passar ao Google Calendar
    const normalizedEmail = lead.email ? lead.email.toLowerCase().trim() : null;
    console.log('[GoogleCalendar] Email normalizado:', lead.email, '->', normalizedEmail);

    // Create Google Calendar event
    const { eventId, meetingLink } = await createEvent({
      summary: `Reunião com ${lead.nome || 'Lead'}`,
      startTime,
      endTime,
      attendees: normalizedEmail ? [normalizedEmail] : [],
      description: `Reunião agendada com ${lead.nome || 'Lead'}`,
    });

    console.log('Google Calendar event created:', { eventId, meetingLink });

    return new Response(
      JSON.stringify({
        success: true,
        eventId,
        meetingLink,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
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
