import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { visitorId, message, sessionId } = await req.json();

    if (!visitorId || !message) {
      return new Response(
        JSON.stringify({ error: 'visitorId and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🔍 DETECÇÃO INTELIGENTE DE DUPLICATAS para web chat
    console.log('🔍 [WebChat] Verificando duplicatas antes de criar lead...');
    
    let lead;
    
    // Primeiro: buscar por visitor_id
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('*')
      .eq('metadata->>visitor_id', visitorId)
      .maybeSingle();

    if (existingLeads) {
      lead = existingLeads;
      console.log(`✅ [WebChat] Lead encontrado via visitor_id: ${lead.id}`);
    } else {
      // Verificar duplicatas via email/nome se disponíveis no futuro
      // Por enquanto, criar lead novo
      console.log('🆕 [WebChat] Criando novo lead para visitor...');
      
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          telefone: `web_${visitorId}`,
          nome: 'Visitante Web',
          stage: 'Novo',
          metadata: { visitor_id: visitorId, source: 'web_chat' }
        })
        .select()
        .single();

      if (leadError) throw leadError;
      lead = newLead;
      
      console.log(`✅ [WebChat] Lead criado: ${lead.id}`);
    }

    // Buscar ou criar conversation
    let conversation;
    if (sessionId) {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('channel', 'web')
        .maybeSingle();
      conversation = data;
    }

    if (!conversation) {
      const newSessionId = sessionId || `web_${visitorId}_${Date.now()}`;
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          lead_id: lead.id,
          session_id: newSessionId,
          channel: 'web',
          visitor_id: visitorId,
          metadata: { user_agent: req.headers.get('user-agent') }
        })
        .select()
        .single();

      if (convError) throw convError;
      conversation = newConv;
    }

    // Salvar mensagem do usuário
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: message,
        channel: 'web'
      });

    // Chamar orchestrator
    const orchestratorResponse = await fetch(`${supabaseUrl}/functions/v1/orchestrator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        phone: lead.telefone,
        message: message,
        messageId: `web_${Date.now()}`,
        channel: 'web',
        visitorId: visitorId,
        conversationId: conversation.id
      })
    });

    if (!orchestratorResponse.ok) {
      throw new Error('Orchestrator error');
    }

    const orchestratorData = await orchestratorResponse.json();

    // Buscar última mensagem do assistente
    const { data: lastMessage } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .eq('role', 'assistant')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: conversation.session_id,
        response: lastMessage?.content || orchestratorData.response,
        leadId: lead.id,
        conversationId: conversation.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Web chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});