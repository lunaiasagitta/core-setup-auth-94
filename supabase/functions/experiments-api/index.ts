import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(p => p);
  
  try {
    // POST /experiments - Criar
    if (req.method === 'POST' && pathParts.length === 1) {
      const { name, description, variants } = await req.json();
      
      const { data, error } = await supabase
        .from('experiments')
        .insert({
          name,
          description,
          variants,
          active: true
        })
        .select()
        .single();
      
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // GET /experiments/:id/results
    if (req.method === 'GET' && pathParts[pathParts.length - 1] === 'results') {
      const experimentId = pathParts[pathParts.length - 2];
      
      // Buscar experiment
      const { data: experiment } = await supabase
        .from('experiments')
        .select('*')
        .eq('id', experimentId)
        .single();
      
      if (!experiment) {
        return new Response(JSON.stringify({ error: 'Experiment not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Calcular métricas por variant
      const results = [];
      
      for (const variant of experiment.variants) {
        // Total de leads nessa variant
        const { count: totalLeads } = await supabase
          .from('experiment_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('experiment_id', experimentId)
          .eq('variant', variant.name);
        
        // Leads que enviaram apresentação
        const { data: apresentacaoEnviada } = await supabase
          .from('experiment_results')
          .select('lead_id')
          .eq('experiment_id', experimentId)
          .eq('variant', variant.name)
          .eq('metric', 'apresentacao_enviada');
        
        // Leads que agendaram reunião
        const { data: reuniaoAgendada } = await supabase
          .from('experiment_results')
          .select('lead_id')
          .eq('experiment_id', experimentId)
          .eq('variant', variant.name)
          .eq('metric', 'reuniao_agendada');
        
        // Leads qualificados (score >= 70)
        const { data: qualificados } = await supabase
          .from('experiment_results')
          .select('lead_id')
          .eq('experiment_id', experimentId)
          .eq('variant', variant.name)
          .eq('metric', 'qualificado');
        
        results.push({
          variant: variant.name,
          total_leads: totalLeads || 0,
          apresentacao_enviada: apresentacaoEnviada?.length || 0,
          reuniao_agendada: reuniaoAgendada?.length || 0,
          qualificados: qualificados?.length || 0,
          taxa_apresentacao: totalLeads ? ((apresentacaoEnviada?.length || 0) / totalLeads * 100).toFixed(1) : 0,
          taxa_agendamento: totalLeads ? ((reuniaoAgendada?.length || 0) / totalLeads * 100).toFixed(1) : 0,
          taxa_qualificacao: totalLeads ? ((qualificados?.length || 0) / totalLeads * 100).toFixed(1) : 0
        });
      }
      
      return new Response(JSON.stringify({
        experiment,
        results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // GET /experiments - Listar todos
    if (req.method === 'GET' && pathParts.length === 1) {
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
