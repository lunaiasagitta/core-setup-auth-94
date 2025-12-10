import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { content, title, metadata: customMetadata } = await req.json();

    if (!content || !title) {
      throw new Error('Content e title são obrigatórios');
    }

    console.log(`Processando documento: ${title}`);

    // Chunking simples
    function chunkText(text: string, maxTokens: number = 600): string[] {
      const maxChars = maxTokens * 4;
      const chunks: string[] = [];
      const paragraphs = text.split('\n\n');
      let currentChunk = '';

      for (const para of paragraphs) {
        if ((currentChunk + para).length > maxChars && currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = para;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + para;
        }
      }

      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }

      return chunks;
    }

    // Gerar embedding
    async function generateEmbedding(text: string): Promise<number[]> {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    }

    // Deletar chunks antigos deste documento
    await supabase
      .from('knowledge_base')
      .delete()
      .eq('title', title);

    const chunks = chunkText(content);
    console.log(`Criados ${chunks.length} chunks`);

    let processedCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        const embedding = await generateEmbedding(chunk);
        
        const { error } = await supabase
          .from('knowledge_base')
          .insert({
            title,
            content: chunk,
            chunk_index: i,
            embedding: JSON.stringify(embedding),
            metadata: {
              total_chunks: chunks.length,
              chunk_size: chunk.length,
              processed_at: new Date().toISOString(),
              ...customMetadata // Merge custom metadata
            },
          });

        if (error) {
          console.error(`Erro ao salvar chunk ${i}:`, error);
        } else {
          processedCount++;
        }

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Erro no chunk ${i}:`, error);
      }
    }

    console.log(`Processamento completo: ${processedCount}/${chunks.length} chunks`);

    return new Response(JSON.stringify({
      success: true,
      title,
      chunks: processedCount,
      total: chunks.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in knowledge-base-process:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
