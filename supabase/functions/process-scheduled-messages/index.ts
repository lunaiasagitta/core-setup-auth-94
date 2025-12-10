import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')!;
const evolutionKey = Deno.env.get('EVOLUTION_API_KEY')!;
const evolutionInstance = Deno.env.get('EVOLUTION_INSTANCE_NAME')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Buscar mensagens pendentes
    const { data: pending, error } = await supabase
      .from('scheduled_messages')
      .select('*, leads(*)')
      .eq('sent', false)
      .eq('canceled', false)
      .lte('scheduled_for', new Date().toISOString())
      .limit(50);
    
    if (error) throw error;
    
    console.log(`Processing ${pending?.length || 0} scheduled messages`);
    
    const results = [];
    
    for (const msg of pending || []) {
      // Verificar se lead mudou de stage (skip se sim)
      const { data: currentLead } = await supabase
        .from('leads')
        .select('stage')
        .eq('id', msg.lead_id)
        .single();
      
      // Se stage mudou pra "Reunião Agendada" ou superior, cancelar follow-up
      if (currentLead && ['Reunião Agendada', 'Proposta Enviada', 'Fechado', 'Cancelado'].includes(currentLead.stage)) {
        await supabase
          .from('scheduled_messages')
          .update({ canceled: true, cancel_reason: 'Lead avançou no funil' })
          .eq('id', msg.id);
        
        results.push({ id: msg.id, status: 'canceled', reason: 'Lead avançou' });
        continue;
      }
      
      // Enviar via Evolution API
      try {
        const sendResponse = await fetch(
          `${evolutionUrl}/message/sendText/${evolutionInstance}`,
          {
            method: 'POST',
            headers: {
              'apikey': evolutionKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              number: msg.leads.telefone,
              text: msg.message
            })
          }
        );
        
        if (!sendResponse.ok) throw new Error('Failed to send via Evolution');
        
        // Marcar como enviado
        await supabase
          .from('scheduled_messages')
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq('id', msg.id);
        
        // Salvar no histórico
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('lead_id', msg.lead_id)
          .single();
        
        if (conv) {
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            role: 'assistant',
            content: msg.message
          });
        }
        
        // Log activity
        await supabase.from('activity_log').insert({
          lead_id: msg.lead_id,
          event_type: 'follow_up_enviado',
          details: { message_id: msg.id }
        });
        
        results.push({ id: msg.id, status: 'sent' });
        
      } catch (sendError) {
        console.error('Error sending message:', sendError);
        const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown error';
        results.push({ id: msg.id, status: 'error', error: errorMessage });
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
