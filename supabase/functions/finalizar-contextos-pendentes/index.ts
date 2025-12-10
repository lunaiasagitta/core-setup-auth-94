import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

  try {
    console.log('[FinalizarContextosPendentes] Iniciando varredura...');

    // Buscar reuniões com mais de 24h sem contexto
    const dataLimite = new Date();
    dataLimite.setHours(dataLimite.getHours() - 24);

    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select(`
        id, 
        lead_id,
        scheduled_date,
        conversations!inner(id)
      `)
      .eq('status', 'scheduled')
      .is('contexto_reuniao', null)
      .lt('created_at', dataLimite.toISOString());

    if (meetingsError) {
      console.error('[FinalizarContextosPendentes] Erro ao buscar reuniões:', meetingsError);
      throw meetingsError;
    }

    if (!meetings || meetings.length === 0) {
      console.log('[FinalizarContextosPendentes] Nenhuma reunião pendente encontrada');
      return new Response(
        JSON.stringify({ finalizados: 0, message: 'Nenhuma reunião pendente' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[FinalizarContextosPendentes] ${meetings.length} reuniões pendentes encontradas`);

    let finalizados = 0;

    for (const meeting of meetings) {
      try {
        console.log(`[FinalizarContextosPendentes] Processando meeting ${meeting.id}...`);

        // Buscar conversation_id para este lead
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select('id')
          .eq('lead_id', meeting.lead_id)
          .single();

        if (convError || !conversation) {
          console.error(`[FinalizarContextosPendentes] Conversa não encontrada para meeting ${meeting.id}`);
          continue;
        }

        // Buscar mensagens da conversa
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('role, content')
          .eq('conversation_id', conversation.id)
          .order('timestamp', { ascending: true });

        if (msgError) {
          console.error(`[FinalizarContextosPendentes] Erro ao buscar mensagens: ${msgError.message}`);
          continue;
        }

        // Gerar resumo IA
        let resumo = 'Resumo não disponível - timeout automático';

        if (lovableApiKey && messages && messages.length > 0) {
          const conversaCompleta = messages
            .map((m: any) => `${m.role === 'user' ? 'Cliente' : 'Agente'}: ${m.content}`)
            .join('\n');

          try {
            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                  {
                    role: 'system',
                    content: 'Você é um assistente que resume conversas de vendas. Resuma em 3-5 frases focando em: necessidade principal, contexto do projeto, expectativas mencionadas, e informações relevantes para a reunião.'
                  },
                  {
                    role: 'user',
                    content: `Resume esta conversa de vendas:\n\n${conversaCompleta}`
                  }
                ],
                max_completion_tokens: 300
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              resumo = aiData.choices?.[0]?.message?.content || resumo;
            }
          } catch (aiError) {
            console.error(`[FinalizarContextosPendentes] Erro ao gerar resumo IA:`, aiError);
          }
        }

        // Atualizar meeting com resumo de timeout
        const { error: updateError } = await supabase
          .from('meetings')
          .update({
            contexto_reuniao: {
              perguntas_e_respostas: [],
              resumo_conversa: resumo,
              status: 'timeout',
              motivo_incompleto: 'Lead não respondeu perguntas de contexto após 24h',
              total_respondidas: 0,
              total_perguntas: 0,
              coletado_em: new Date().toISOString(),
              total_mensagens: messages?.length || 0
            }
          })
          .eq('id', meeting.id);

        if (updateError) {
          console.error(`[FinalizarContextosPendentes] Erro ao atualizar meeting: ${updateError.message}`);
          continue;
        }

        // Log de atividade
        await supabase.from('activity_log').insert({
          lead_id: meeting.lead_id,
          event_type: 'contexto_reuniao_timeout',
          details: {
            meeting_id: meeting.id,
            motivo: 'Contexto finalizado automaticamente após 24h sem resposta'
          }
        });

        finalizados++;
        console.log(`[FinalizarContextosPendentes] ✅ Meeting ${meeting.id} finalizado`);
      } catch (error) {
        console.error(`[FinalizarContextosPendentes] Erro ao processar meeting ${meeting.id}:`, error);
      }
    }

    console.log(`[FinalizarContextosPendentes] ✅ ${finalizados} reuniões finalizadas`);

    return new Response(
      JSON.stringify({ 
        finalizados, 
        total_processados: meetings.length,
        message: `${finalizados} contextos finalizados com sucesso` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[FinalizarContextosPendentes] Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        finalizados: 0 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
