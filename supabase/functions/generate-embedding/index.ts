import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const { input, model = 'text-embedding-3-small' } = await req.json();

    if (!input) {
      throw new Error('Input é obrigatório');
    }

    console.log('Gerando embedding para texto de tamanho:', 
      Array.isArray(input) ? input.join(' ').length : input.length);

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Erro da OpenAI:', error);
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    console.log('Embedding gerado. Dimensão:', data.data[0].embedding.length);
    console.log('Tokens usados:', data.usage.total_tokens);

    // Se foi um array de inputs, retorna array de embeddings
    if (Array.isArray(input)) {
      return new Response(JSON.stringify({
        embeddings: data.data.map((d: any) => d.embedding),
        usage: data.usage,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Se foi um único input, retorna um único embedding
    return new Response(JSON.stringify({
      embedding: data.data[0].embedding,
      usage: data.usage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro em generate-embedding:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
