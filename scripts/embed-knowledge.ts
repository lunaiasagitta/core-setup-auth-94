/**
 * Script para embedar a base de conhecimento no Supabase
 * Uso: deno run --allow-net --allow-read --allow-env scripts/embed-knowledge.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente faltando!');
  console.error('Necessário: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

function chunkText(text: string, maxTokens: number = 600): string[] {
  // Aproximação: 1 token ≈ 4 caracteres
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

async function embedKnowledgeBase() {
  console.log('🚀 Iniciando embedding da base de conhecimento...\n');
  
  const knowledgeDir = './knowledge-base';
  const files = await readdir(knowledgeDir);
  const markdownFiles = files.filter(f => f.endsWith('.md'));
  
  console.log(`📁 Encontrados ${markdownFiles.length} arquivos:\n`);
  
  // Limpar knowledge_base existente
  console.log('🧹 Limpando base de conhecimento existente...');
  const { error: deleteError } = await supabase
    .from('knowledge_base')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (deleteError) {
    console.error('❌ Erro ao limpar base:', deleteError);
  } else {
    console.log('✅ Base limpa com sucesso\n');
  }
  
  let totalChunks = 0;
  let totalEmbedded = 0;
  
  for (const file of markdownFiles) {
    const filePath = join(knowledgeDir, file);
    const content = await readFile(filePath, 'utf-8');
    const title = file.replace('.md', '');
    
    console.log(`📄 Processando: ${file}`);
    
    const chunks = chunkText(content);
    console.log(`   ├─ ${chunks.length} chunks criados`);
    totalChunks += chunks.length;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Gerar embedding
        const embedding = await generateEmbedding(chunk);
        
        // Salvar no banco
        const { error } = await supabase
          .from('knowledge_base')
          .insert({
            title,
            content: chunk,
            chunk_index: i,
            embedding: JSON.stringify(embedding),
            metadata: {
              file: file,
              total_chunks: chunks.length,
              chunk_size: chunk.length,
            },
          });
        
        if (error) {
          console.error(`   ❌ Erro ao salvar chunk ${i}:`, error.message);
        } else {
          totalEmbedded++;
          process.stdout.write(`   ├─ Chunk ${i + 1}/${chunks.length} embedado ✓\r`);
        }
        
        // Rate limit da OpenAI: 3000 RPM (50 por segundo)
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`   ❌ Erro no chunk ${i}:`, error);
      }
    }
    
    console.log(`   ✅ ${file} completo\n`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Processo concluído!`);
  console.log(`📊 Total de chunks processados: ${totalChunks}`);
  console.log(`📊 Total embedado com sucesso: ${totalEmbedded}`);
  console.log('='.repeat(50) + '\n');
  
  // Verificar se foram salvos
  const { count } = await supabase
    .from('knowledge_base')
    .select('*', { count: 'exact', head: true });
  
  console.log(`🔍 Verificação: ${count} registros na base de conhecimento`);
}

// Executar
embedKnowledgeBase().catch(console.error);
