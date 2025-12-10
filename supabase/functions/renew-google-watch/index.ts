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
    console.log('Checking if watch channel needs renewal...');

    // Em produção, você buscaria o channelId e expiration do banco
    // Por enquanto, vamos apenas chamar google-setup-watch para criar um novo channel
    
    const accessToken = await getAccessToken();
    const projectId = Deno.env.get('SUPABASE_PROJECT_ID') || 'xjcxjotykzhzxapssany';
    
    // Chamar a função de setup para criar um novo watch
    const setupResponse = await fetch(
      `https://${projectId}.supabase.co/functions/v1/google-setup-watch`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!setupResponse.ok) {
      throw new Error('Failed to renew watch channel');
    }

    const result = await setupResponse.json();
    console.log('Watch channel renewed:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Watch channel renewed successfully',
        ...result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in renew-google-watch:', error);
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
