import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Variáveis de ambiente faltando');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { query, top_k = 5, threshold = 0.7 } = await req.json();

    if (!query) {
      throw new Error('Query é obrigatória');
    }

    console.log('RAG Search - Query:', query);
    console.log('RAG Search - Top K:', top_k, 'Threshold:', threshold);

    // 1. Gerar embedding da query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error('Erro ao gerar embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    console.log('Embedding gerado. Dimensão:', queryEmbedding.length);

    // 2. Buscar documentos similares usando pgvector
    const { data: documents, error: searchError } = await supabase.rpc(
      'match_knowledge_base',
      {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: top_k,
      }
    );

    if (searchError) {
      console.error('Erro na busca:', searchError);
      throw searchError;
    }

    console.log('Documentos encontrados:', documents?.length || 0);

    return new Response(JSON.stringify({
      results: documents || [],
      count: documents?.length || 0,
      usage: embeddingData.usage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro em rag-search:', error);
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
