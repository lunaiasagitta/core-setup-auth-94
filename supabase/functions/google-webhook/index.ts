import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-goog-channel-token, x-goog-resource-state',
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

    // Verificar headers do Google
    const channelToken = req.headers.get('X-Goog-Channel-Token');
    const resourceState = req.headers.get('X-Goog-Resource-State');
    const resourceId = req.headers.get('X-Goog-Resource-Id');

    console.log('Webhook received:', {
      channelToken,
      resourceState,
      resourceId,
    });

    // Validar token (opcional, mas recomendado)
    const expectedToken = Deno.env.get('GOOGLE_WEBHOOK_TOKEN') || 'sagitta-webhook-token';
    if (channelToken !== expectedToken) {
      console.error('Invalid webhook token');
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Se é apenas sync (handshake inicial), retornar OK
    if (resourceState === 'sync') {
      console.log('Sync handshake received');
      return new Response(
        JSON.stringify({ success: true, message: 'Sync acknowledged' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Para outros estados (exists, not_exists, updated), buscar eventos atualizados
    if (resourceState === 'exists' || resourceState === 'updated') {
      console.log('Triggering automatic calendar sync due to changes');
      
      // ⏱️ Aguardar 2 segundos para garantir que a API do Google propagou a mudança
      console.log('Waiting 2s for Google API propagation...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        // Chamar função de sync automaticamente
        const projectId = Deno.env.get('SUPABASE_PROJECT_ID') || 'xjcxjotykzhzxapssany';
        const syncResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/google-calendar-sync`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (syncResponse.ok) {
          console.log('Automatic sync completed successfully');
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Changes detected and synced automatically',
              resourceState,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.error('Sync failed:', await syncResponse.text());
        }
      } catch (error) {
        console.error('Error calling sync:', error);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Changes detected, manual sync recommended',
          resourceState,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in google-webhook:', error);
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
