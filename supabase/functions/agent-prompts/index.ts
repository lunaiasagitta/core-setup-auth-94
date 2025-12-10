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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // GET - Listar todas as versões (com filtro opcional por canal)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const channel = url.searchParams.get('channel');

      let query = supabase
        .from('agent_prompts')
        .select('*');

      if (channel) {
        query = query.eq('channel', channel);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Criar nova versão
    if (req.method === 'POST') {
      const body = await req.json();
      const { name, channel, prompt_text, config, notes } = body;

      if (!channel || !['whatsapp', 'web'].includes(channel)) {
        return new Response(JSON.stringify({ error: 'Canal inválido. Use "whatsapp" ou "web"' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Buscar última versão do canal específico
      const { data: lastVersion } = await supabase
        .from('agent_prompts')
        .select('version')
        .eq('channel', channel)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      // Incrementar versão (v1 -> v2, v2 -> v3, etc) por canal
      const versionNumber = lastVersion 
        ? parseInt(lastVersion.version.replace('v', '')) + 1 
        : 1;
      const newVersion = `v${versionNumber}`;

      const { data, error } = await supabase
        .from('agent_prompts')
        .insert({
          version: newVersion,
          channel,
          name,
          prompt_text,
          config: config || { temperature: 0.7, max_tokens: 500 },
          notes,
          is_active: false, // Nova versão não é ativada automaticamente
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT - Ativar versão específica
    if (req.method === 'PUT') {
      const body = await req.json();
      const { id } = body;

      // Desativar todas as versões
      await supabase
        .from('agent_prompts')
        .update({ is_active: false })
        .neq('id', id);

      // Ativar a versão específica
      const { data, error } = await supabase
        .from('agent_prompts')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH - Atualizar prompt existente (sem criar nova versão)
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { id, name, prompt_text, config, notes } = body;

      const { data, error } = await supabase
        .from('agent_prompts')
        .update({
          name,
          prompt_text,
          config,
          notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in agent-prompts:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
