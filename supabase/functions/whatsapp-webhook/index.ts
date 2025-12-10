import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('📥 Webhook received from Evolution API');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Extrair dados da mensagem
    const { instance, data } = payload;
    
    if (!data || !data.key) {
      console.log('Invalid webhook payload structure');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { key, message, messageTimestamp, pushName } = data;
    const { remoteJid, fromMe, id: messageId } = key;
    
    console.log('📱 pushName from webhook:', pushName);

    // Ignorar mensagens enviadas por nós
    if (fromMe) {
      console.log('⏭️ Ignoring message from self');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ignorar mensagens de grupo
    if (remoteJid.includes('@g.us')) {
      console.log('⏭️ Ignoring group message');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair telefone (remover @s.whatsapp.net)
    const phone = remoteJid.replace('@s.whatsapp.net', '');

    // Extrair texto da mensagem
    let messageText = '';
    if (message.conversation) {
      messageText = message.conversation;
    } else if (message.extendedTextMessage) {
      messageText = message.extendedTextMessage.text;
    } else if (message.speechToText) {
      // ✅ Suporte a áudio com transcrição automática da Evolution
      messageText = message.speechToText;
      console.log('📢 Audio message transcribed:', messageText);
    } else {
      console.log('Message type not supported:', Object.keys(message));
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`💬 Message from ${phone}: ${messageText}`);

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🧪 VERIFICAR MODO TESTE
    console.log('🧪 Checking test mode...');
    const { data: testModeConfig } = await supabase
      .from('test_mode_config')
      .select('enabled')
      .single();
    
    if (testModeConfig?.enabled) {
      console.log('🧪 Test mode is ACTIVE - checking if number is authorized...');
      
      // Verificar se o número está na lista de teste
      const { data: testNumber } = await supabase
        .from('test_numbers')
        .select('ativo')
        .eq('telefone', phone)
        .single();
      
      if (!testNumber || !testNumber.ativo) {
        console.log(`🚫 Number ${phone} is NOT authorized in test mode - ignoring message`);
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Test mode active - number not authorized'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`✅ Number ${phone} is authorized in test mode - processing message`);
    } else {
      console.log('✅ Test mode is OFF - processing normally');
    }

    // 🔍 DETECÇÃO INTELIGENTE DE DUPLICAÇÕES + MERGE COMPLETO
    console.log('🔍 [WhatsAppWebhook] Buscando lead por telefone com detecção de duplicações:', phone);
    
    // Verificar duplicações antes de criar lead
    const { data: potentialDuplicates } = await supabase.rpc('find_potential_duplicates', {
      p_telefone: phone,
      p_email: null,
      p_nome: pushName || null
    });
    
    let leadId: string | undefined;
    let mergeOccurred = false;
    
    // Se encontrou duplicata com score alto, fazer merge completo
    if (potentialDuplicates && potentialDuplicates.length > 0) {
      const bestMatch = potentialDuplicates[0];
      
      if (bestMatch.match_score >= 90) {
        leadId = bestMatch.lead_id;
        console.log(`✅ Lead existente encontrado via duplicação (score: ${bestMatch.match_score}): ${leadId}`);
        
        // 🔥 MERGE COMPLETO (não só telefone)
        const { decideMergeStrategy } = await import('./lib/merge-utils.ts');
        
        // Buscar lead completo existente
        const { data: existingLead } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .single();

        if (existingLead) {
          // Criar dados do novo lead temporário
          const newLeadData = {
            id: leadId,
            nome: pushName || existingLead.nome,
            telefone: phone,
            email: existingLead.email,
            empresa: existingLead.empresa,
            necessidade: existingLead.necessidade,
            proposta_ia: existingLead.proposta_ia,
            stage: existingLead.stage,
            score_bant: existingLead.score_bant,
            bant_details: existingLead.bant_details,
            os_funil_lead: existingLead.os_funil_lead,
            metadata: existingLead.metadata || {},
            created_at: existingLead.created_at,
            updated_at: new Date().toISOString()
          };

          // Executar estratégia de merge
          const { merged, mergeLog } = decideMergeStrategy(existingLead, newLeadData);

          // Atualizar lead existente com dados mesclados
          await supabase
            .from('leads')
            .update({
              ...merged,
              updated_at: new Date().toISOString()
            })
            .eq('id', leadId);

          // Registrar merge
          await supabase.from('lead_merges').insert({
            master_lead_id: leadId,
            merged_lead_id: leadId,
            merge_strategy: 'whatsapp_webhook_auto',
            merged_data: merged,
            merge_decisions: mergeLog,
            notes: `Auto-merge via WhatsApp webhook (score: ${bestMatch.match_score})`
          });

          mergeOccurred = true;
          console.log(`✅ Merge completo executado no lead: ${leadId}`);
        }
      }
    }
    
    // Se não encontrou via duplicação, buscar por telefone exato
    if (!leadId) {
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('telefone', phone)
        .single();
      
      leadId = existingLead?.id;
    }

    if (!leadId) {
      console.log(`Creating new lead for ${phone} with pushName: ${pushName}`);
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          telefone: phone,
          nome: pushName || null, // ✅ Usar pushName como nome inicial
          stage: 'Novo',
          score_bant: 0,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating lead:', createError);
        throw createError;
      }

      leadId = newLead.id;
      console.log(`✅ Lead created with name from pushName: ${pushName}`);
    }

    // Buscar ou criar conversation
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', leadId)
      .single();

    let conversationId = existingConversation?.id;

    if (!existingConversation) {
      console.log(`Creating new conversation for lead ${leadId}`);
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          lead_id: leadId,
          session_id: `whatsapp_${phone}_${Date.now()}`,
        })
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        throw convError;
      }

      conversationId = newConversation.id;
    }

    // 🛡️ DEDUPLICAÇÃO: Verificar se mensagem já foi processada
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('external_message_id', messageId)
      .single();

    if (existingMessage) {
      console.log(`⏭️ Message ${messageId} already processed - skipping duplicate`);
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Duplicate message ignored'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Salvar mensagem com ID externo para deduplicação
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: messageText,
        external_message_id: messageId,
      });

    if (messageError) {
      console.error('Error saving message:', messageError);
      throw messageError;
    }

    // Chamar orchestrator e aguardar resposta
    console.log('Calling orchestrator for phone:', phone);
    const { data: orchestratorResponse, error: orchestratorError } = await supabase.functions.invoke('orchestrator', {
      body: {
        phone,
        message: messageText,
        messageId,
        channel: 'whatsapp'
      }
    });

    if (orchestratorError) {
      console.error('Orchestrator error:', orchestratorError);
      throw orchestratorError;
    }

    console.log('Orchestrator response:', JSON.stringify(orchestratorResponse));

    // Enviar resposta via Evolution API
    if (orchestratorResponse?.response) {
      const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
      const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
      const evolutionInstance = Deno.env.get('EVOLUTION_INSTANCE_NAME');

      if (!evolutionUrl || !evolutionKey || !evolutionInstance) {
        console.error('Evolution credentials not configured');
        throw new Error('Evolution API credentials missing');
      }

      // Extrair apenas a mensagem de texto da resposta JSON
      let messageToSend: string;
      
      try {
        // Tentar parsear a resposta como JSON
        const parsedResponse = JSON.parse(orchestratorResponse.response);
        // Extrair apenas o campo "response" do JSON
        messageToSend = parsedResponse.response || orchestratorResponse.response;
        console.log(`✅ Parsed JSON response, extracted text: ${messageToSend.substring(0, 100)}...`);
      } catch (parseError) {
        // Se não for JSON, usar a resposta diretamente
        messageToSend = orchestratorResponse.response;
        console.log(`ℹ️ Response is not JSON, using as-is: ${messageToSend.substring(0, 100)}...`);
      }

      console.log(`📤 Sending to ${phone} via Evolution...`);

      const sendResponse = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
        method: 'POST',
        headers: {
          'apikey': evolutionKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: phone,
          text: messageToSend,
        }),
      });

      if (!sendResponse.ok) {
        const errorData = await sendResponse.json();
        console.error('❌ Evolution API error:', errorData);
        
        // Tentar enviar mensagem de fallback
        console.log('🔄 Attempting to send fallback message...');
        const fallbackMessage = "Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?";
        
        const fallbackResponse = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
          method: 'POST',
          headers: {
            'apikey': evolutionKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: phone,
            text: fallbackMessage,
          }),
        });
        
        if (fallbackResponse.ok) {
          console.log('✅ Fallback message sent successfully');
        }
        
        throw new Error(`Evolution API failed: ${JSON.stringify(errorData)}`);
      }

      const sendData = await sendResponse.json();
      console.log('✅ Message sent via Evolution successfully');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    // Log security event
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from('security_logs').insert({
        event_type: 'webhook_error',
        severity: 'high',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Check edge function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
