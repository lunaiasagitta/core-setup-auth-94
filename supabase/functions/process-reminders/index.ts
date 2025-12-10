import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendWhatsAppMessage(phone: string, message: string) {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
  const instanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');

  if (!evolutionUrl || !evolutionKey || !instanceName) {
    console.error('Evolution API not configured');
    return false;
  }

  try {
    const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionKey,
      },
      body: JSON.stringify({
        number: phone.replace(/\D/g, ''),
        text: message,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send WhatsApp:', await response.text());
      return false;
    }

    console.log(`WhatsApp message sent to ${phone}`);
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing reminders...');

    // Buscar lembretes pendentes
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select(`
        id,
        meeting_id,
        type,
        scheduled_for,
        meetings (
          id,
          scheduled_date,
          meeting_link,
          status,
          lead_id,
          leads (
            id,
            nome,
            telefone
          )
        )
      `)
      .eq('sent', false)
      .lte('scheduled_for', new Date().toISOString())
      .limit(100);

    if (remindersError) {
      throw remindersError;
    }

    console.log(`Found ${reminders?.length || 0} pending reminders`);

    let processed = 0;
    let failed = 0;

    for (const reminder of reminders || []) {
      try {
        const meeting = reminder.meetings as any;
        const lead = meeting?.leads as any;

        // Pular se reunião foi cancelada
        if (meeting?.status === 'cancelled') {
          await supabase
            .from('reminders')
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq('id', reminder.id);
          continue;
        }

        if (!lead || !meeting) {
          console.error(`Missing data for reminder ${reminder.id}`);
          failed++;
          continue;
        }

        const leadName = lead.nome || 'Cliente';
        const phone = lead.telefone;
        // ✅ TIMEZONE: Sempre mostrar horário de São Paulo nos lembretes
        const meetingTime = new Date(meeting.scheduled_date).toLocaleString('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'America/Sao_Paulo',
        });
        const meetingLink = meeting.meeting_link || 'Link não disponível';

        // Buscar template de mensagem da configuração
        const { data: reminderConfig } = await supabase
          .from('reminder_settings')
          .select('message_template')
          .eq('label', reminder.type)
          .single();

        let message = reminderConfig?.message_template || 
          `🔔 *Lembrete de Reunião*\n\nOlá {nome}!\n\nVocê tem uma reunião com a Sagitta.\n\n📅 Horário: {horario}\n🔗 Link: {link}\n\nNos vemos lá! 👋`;
        
        // Substituir variáveis no template
        message = message
          .replace(/{nome}/g, leadName)
          .replace(/{horario}/g, meetingTime)
          .replace(/{link}/g, meetingLink);

        // Enviar lembrete via WhatsApp
        const sent = await sendWhatsAppMessage(phone, message);

        // Marcar como enviado
        await supabase
          .from('reminders')
          .update({ 
            sent: true, 
            sent_at: new Date().toISOString() 
          })
          .eq('id', reminder.id);

        if (sent) {
          processed++;
        } else {
          failed++;
        }

        // Criar notificação para o sistema
        await supabase
          .from('notifications')
          .insert({
            type: 'reminder',
            title: 'Lembrete enviado',
            description: `Lembrete de reunião enviado para ${leadName}`,
            link: `/leads/${lead.id}`,
          });

      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        failed++;
      }
    }

    const summary = {
      success: true,
      total: reminders?.length || 0,
      processed,
      failed,
    };

    console.log('Reminders processed:', summary);

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in process-reminders:', error);
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
