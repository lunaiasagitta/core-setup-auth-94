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
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
    const evolutionInstance = Deno.env.get('EVOLUTION_INSTANCE_NAME');

    console.log('Testing Evolution API connection...');
    console.log('URL:', evolutionUrl);
    console.log('Instance:', evolutionInstance);

    if (!evolutionUrl || !evolutionKey || !evolutionInstance) {
      console.error('Missing Evolution API credentials');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Credenciais da Evolution API não configuradas',
          details: {
            hasUrl: !!evolutionUrl,
            hasKey: !!evolutionKey,
            hasInstance: !!evolutionInstance
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Testar conexão com a API Evolution
    const testUrl = `${evolutionUrl}/instance/connectionState/${evolutionInstance}`;
    console.log('Testing connection to:', testUrl);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': evolutionKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Evolution API response:', data);

    if (!response.ok) {
      console.error('Evolution API error:', data);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Falha ao conectar com Evolution API',
          details: data,
          status: response.status
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Log de sucesso
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from('activity_log').insert({
      event_type: 'evolution_connection_test',
      details: {
        success: true,
        state: data.state || data.instance?.state,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conexão com Evolution API estabelecida com sucesso',
        data: {
          instance: evolutionInstance,
          state: data.state || data.instance?.state || 'connected',
          response: data
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Test connection error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro ao testar conexão',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
