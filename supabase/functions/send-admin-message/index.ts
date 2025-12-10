import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, message, senderId } = await req.json();

    if (!conversationId || !message) {
      throw new Error('conversationId e message são obrigatórios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar informações da conversa
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*, leads(*)')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversa não encontrada');
    }

    const channel = conversation.channel || 'whatsapp';

    // Salvar mensagem do admin no banco
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'admin',
        content: message,
        channel: channel
      });

    if (messageError) throw messageError;

    // Se for WhatsApp, enviar via Evolution API
    if (channel === 'whatsapp' && conversation.leads?.telefone) {
      const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')!;
      const evolutionKey = Deno.env.get('EVOLUTION_API_KEY')!;
      const evolutionInstance = Deno.env.get('EVOLUTION_INSTANCE_NAME')!;

      await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
        method: 'POST',
        headers: {
          'apikey': evolutionKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: conversation.leads.telefone,
          text: message,
        }),
      });
    }

    // Se for web chat, a mensagem já está salva no banco
    // O frontend buscará via realtime ou polling

    return new Response(
      JSON.stringify({ success: true, message: 'Mensagem enviada' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao enviar mensagem admin:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});