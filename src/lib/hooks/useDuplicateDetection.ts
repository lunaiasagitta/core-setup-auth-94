import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DuplicateMatch } from '@/lib/types/merge';

export const useDuplicateDetection = (leadId: string | undefined) => {
  return useQuery({
    queryKey: ['duplicate-detection', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      // Buscar dados do lead atual
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();
      
      if (leadError || !lead) {
        console.error('Erro ao buscar lead:', leadError);
        return [];
      }
      
      // Buscar duplicatas potenciais
      const { data: duplicates, error: duplicatesError } = await supabase.rpc(
        'find_potential_duplicates',
        {
          p_telefone: lead.telefone || null,
          p_email: lead.email || null,
          p_nome: lead.nome || null,
          p_exclude_id: leadId
        }
      );
      
      if (duplicatesError) {
        console.error('Erro ao buscar duplicatas:', duplicatesError);
        return [];
      }
      
      return (duplicates || []) as DuplicateMatch[];
    },
    enabled: !!leadId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

export const useMergeLead = () => {
  const mergeLead = async (
    masterLeadId: string,
    mergedLeadId: string,
    mergedData: any,
    mergeDecisions: any[],
    strategy: string
  ) => {
    try {
      // 1. Atualizar lead master com dados mesclados
      const { error: updateError } = await supabase
        .from('leads')
        .update(mergedData)
        .eq('id', masterLeadId);
      
      if (updateError) throw updateError;
      
      // 2. Registrar merge no histórico
      const { error: mergeError } = await supabase
        .from('lead_merges')
        .insert({
          master_lead_id: masterLeadId,
          merged_lead_id: mergedLeadId,
          merge_strategy: strategy,
          merged_data: mergedData,
          merge_decisions: mergeDecisions,
          merged_by: 'manual'
        });
      
      if (mergeError) throw mergeError;
      
      // 3. Transferir conversas e mensagens para o lead master
      const { error: conversationsError } = await supabase
        .from('conversations')
        .update({ lead_id: masterLeadId })
        .eq('lead_id', mergedLeadId);
      
      if (conversationsError) {
        console.warn('Aviso ao transferir conversas:', conversationsError);
      }
      
      // 4. Transferir reuniões para o lead master
      const { error: meetingsError } = await supabase
        .from('meetings')
        .update({ lead_id: masterLeadId })
        .eq('lead_id', mergedLeadId);
      
      if (meetingsError) {
        console.warn('Aviso ao transferir reuniões:', meetingsError);
      }
      
      // 5. Deletar lead duplicado
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('id', mergedLeadId);
      
      if (deleteError) throw deleteError;
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao mesclar leads:', error);
      throw error;
    }
  };
  
  return { mergeLead };
};
