import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(): Promise<string> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: token, error } = await supabase
    .from('oauth_tokens')
    .select('access_token, expires_at, refresh_token')
    .eq('provider', 'google')
    .single();

  if (error || !token) {
    throw new Error('No Google OAuth token found');
  }

  // Verificar se token expirou
  const expiresAt = new Date(token.expires_at);
  if (expiresAt <= new Date()) {
    throw new Error('Token expired, please re-authenticate');
  }

  return token.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = await getAccessToken();
    
    // Configurar watch channel
    const projectId = Deno.env.get('SUPABASE_PROJECT_ID') || 'xjcxjotykzhzxapssany';
    const webhookUrl = `https://${projectId}.supabase.co/functions/v1/google-webhook`;
    const channelId = `sagitta-calendar-${Date.now()}`;
    const token = 'sagitta-webhook-token';
    
    // Expiration: 7 dias a partir de agora
    const expiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime();

    console.log('Setting up watch channel:', { webhookUrl, channelId, expiration });

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events/watch',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          token,
          expiration,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to setup watch:', error);
      throw new Error(`Failed to setup watch: ${error}`);
    }

    const data = await response.json();
    console.log('Watch channel created:', data);

    // Salvar informações do channel no banco (criar tabela se necessário)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Por enquanto, apenas retornar sucesso
    // Em produção, você salvaria channelId, resourceId e expiration em uma tabela

    return new Response(
      JSON.stringify({
        success: true,
        channelId: data.id,
        resourceId: data.resourceId,
        expiration: new Date(parseInt(data.expiration)).toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in google-setup-watch:', error);
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
