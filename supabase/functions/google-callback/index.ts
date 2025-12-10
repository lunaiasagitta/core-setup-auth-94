import { exchangeCodeForTokens, saveTokens } from '../google/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return new Response(
        `<html>
          <body>
            <h1>Erro na autenticação</h1>
            <p>Erro: ${error}</p>
            <script>window.close();</script>
          </body>
        </html>`,
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      );
    }

    if (!code) {
      return new Response(
        `<html>
          <body>
            <h1>Código de autorização não fornecido</h1>
            <script>window.close();</script>
          </body>
        </html>`,
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      );
    }

    console.log('Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code);
    
    console.log('Saving tokens...');
    await saveTokens(tokens);

    console.log('Google OAuth successful!');

    // Redirecionar de volta para a página de configurações
    const frontendUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || '';
    
    return new Response(
      `<html>
        <body>
          <h1>✅ Autenticação bem-sucedida!</h1>
          <p>Você pode fechar esta janela e voltar para o sistema.</p>
          <script>
            setTimeout(() => {
              window.opener?.postMessage({ type: 'google-auth-success' }, '*');
              window.close();
            }, 2000);
          </script>
        </body>
      </html>`,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(
      `<html>
        <body>
          <h1>Erro ao processar autenticação</h1>
          <p>${error instanceof Error ? error.message : 'Erro desconhecido'}</p>
          <script>window.close();</script>
        </body>
      </html>`,
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      }
    );
  }
});
