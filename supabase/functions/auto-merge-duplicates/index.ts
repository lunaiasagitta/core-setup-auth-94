import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 [Auto-Merge] Iniciando processo de unificação automática...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { decideMergeStrategy } = await import('../lib/merge-utils.ts');

    let totalMerged = 0;
    let totalFlagged = 0;
    let totalUnflagged = 0;
    const errors: string[] = [];

    // ============= FASE 1: PROCESSAR LEADS FLAGGED =============
    console.log('📋 FASE 1: Processando leads flagged...');
    
    const { data: flaggedLeads } = await supabase
      .from('leads')
      .select('*')
      .not('metadata->>potential_duplicate_of', 'is', null);

    if (flaggedLeads && flaggedLeads.length > 0) {
      console.log(`🏷️ Encontrados ${flaggedLeads.length} leads flagged`);

      for (const lead of flaggedLeads) {
        try {
          const duplicateId = lead.metadata?.potential_duplicate_of;
          
          if (!duplicateId) continue;

          // Re-verificar duplicata
          const { data: recheck } = await supabase.rpc('find_potential_duplicates', {
            p_telefone: lead.telefone,
            p_email: lead.email,
            p_nome: lead.nome,
            p_exclude_id: lead.id
          });

          if (!recheck || recheck.length === 0) {
            // Não é mais duplicata - remover flag
            await supabase
              .from('leads')
              .update({
                metadata: { ...lead.metadata, potential_duplicate_of: null }
              })
              .eq('id', lead.id);
            
            totalUnflagged++;
            console.log(`🔓 Lead ${lead.id} não é mais duplicata - flag removida`);
            continue;
          }

          const bestMatch = recheck[0];

          // Score perfeito (100) - auto-merge
          if (bestMatch.match_score === 100) {
            console.log(`🔥 Auto-merge de lead flagged ${lead.id} (score 100)`);
            
            const { data: masterLead } = await supabase
              .from('leads')
              .select('*')
              .eq('id', duplicateId)
              .single();

            if (masterLead) {
              const { merged, mergeLog } = decideMergeStrategy(masterLead, lead);

              // Atualizar master lead
              await supabase
                .from('leads')
                .update({ ...merged, updated_at: new Date().toISOString() })
                .eq('id', duplicateId);

              // Transferir conversas
              await supabase
                .from('conversations')
                .update({ lead_id: duplicateId })
                .eq('lead_id', lead.id);

              // Registrar merge
              await supabase.from('lead_merges').insert({
                master_lead_id: duplicateId,
                merged_lead_id: lead.id,
                merge_strategy: 'auto_cron',
                merged_data: merged,
                merge_decisions: mergeLog,
                notes: `Auto-merge via CronJob (score: 100)`
              });

              // Deletar lead mesclado
              await supabase
                .from('leads')
                .delete()
                .eq('id', lead.id);

              totalMerged++;
              console.log(`✅ Lead ${lead.id} mesclado com ${duplicateId}`);
            }
          } else if (bestMatch.match_score >= 60) {
            // Score 60-99 - manter flag
            totalFlagged++;
            console.log(`🏷️ Lead ${lead.id} mantém flag (score: ${bestMatch.match_score})`);
          } else {
            // Score < 60 - remover flag
            await supabase
              .from('leads')
              .update({
                metadata: { ...lead.metadata, potential_duplicate_of: null }
              })
              .eq('id', lead.id);
            
            totalUnflagged++;
            console.log(`🔓 Lead ${lead.id} não é mais duplicata significativa - flag removida`);
          }
        } catch (error) {
          const msg = `Erro ao processar lead flagged ${lead.id}: ${error}`;
          console.error(msg);
          errors.push(msg);
        }
      }
    } else {
      console.log('ℹ️ Nenhum lead flagged encontrado');
    }

    // ============= FASE 2: VARREDURA COMPLETA (FAILSAFE) =============
    console.log('🔍 FASE 2: Varredura completa de duplicatas (failsafe)...');
    
    const { data: allLeads } = await supabase
      .from('leads')
      .select('id, telefone, email, nome')
      .order('created_at', { ascending: true });

    if (allLeads && allLeads.length > 0) {
      console.log(`📊 Analisando ${allLeads.length} leads...`);
      
      const processed = new Set<string>();

      for (const lead of allLeads) {
        if (processed.has(lead.id)) continue;

        try {
          const { data: duplicates } = await supabase.rpc('find_potential_duplicates', {
            p_telefone: lead.telefone,
            p_email: lead.email,
            p_nome: lead.nome,
            p_exclude_id: lead.id
          });

          if (duplicates && duplicates.length > 0) {
            for (const dup of duplicates) {
              if (processed.has(dup.lead_id)) continue;

              // Apenas score 100 no failsafe
              if (dup.match_score === 100) {
                console.log(`🚨 Duplicata perfeita não detectada anteriormente! ${lead.id} <-> ${dup.lead_id}`);
                
                const { data: leadA } = await supabase.from('leads').select('*').eq('id', lead.id).single();
                const { data: leadB } = await supabase.from('leads').select('*').eq('id', dup.lead_id).single();

                if (leadA && leadB) {
                  const { merged, mergeLog } = decideMergeStrategy(leadA, leadB);

                  await supabase
                    .from('leads')
                    .update({ ...merged, updated_at: new Date().toISOString() })
                    .eq('id', leadA.id);

                  await supabase
                    .from('conversations')
                    .update({ lead_id: leadA.id })
                    .eq('lead_id', leadB.id);

                  await supabase.from('lead_merges').insert({
                    master_lead_id: leadA.id,
                    merged_lead_id: leadB.id,
                    merge_strategy: 'failsafe_cron',
                    merged_data: merged,
                    merge_decisions: mergeLog,
                    notes: `Failsafe auto-merge (score: 100)`
                  });

                  await supabase.from('leads').delete().eq('id', leadB.id);

                  processed.add(leadB.id);
                  totalMerged++;
                  console.log(`✅ Failsafe merge: ${leadB.id} -> ${leadA.id}`);
                }
              }
            }
          }

          processed.add(lead.id);
        } catch (error) {
          const msg = `Erro no failsafe para lead ${lead.id}: ${error}`;
          console.error(msg);
          errors.push(msg);
        }
      }
    }

    // ============= FASE 3: RELATÓRIO E NOTIFICAÇÃO =============
    console.log('📊 FASE 3: Gerando relatório...');

    const report = {
      timestamp: new Date().toISOString(),
      total_merged: totalMerged,
      total_flagged: totalFlagged,
      total_unflagged: totalUnflagged,
      errors: errors.length,
      error_details: errors
    };

    console.log('📄 RELATÓRIO FINAL:', JSON.stringify(report, null, 2));

    // Criar notificação para admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (profile) {
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'system',
        title: '🤖 Unificação Automática Concluída',
        description: `${totalMerged} leads mesclados | ${totalFlagged} aguardando revisão | ${totalUnflagged} flags removidas`,
        link: '/leads'
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        report
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ [Auto-Merge] Erro fatal:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
