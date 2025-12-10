import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SlotBatch {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  slot_duration: number;
  gap_minutes: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSlotBatchParams {
  name: string;
  start_date: string;
  end_date: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  slot_duration: number;
  gap_minutes: number;
}

export const useSlotBatches = () => {
  const queryClient = useQueryClient();

  // Buscar todos os batches
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['slot-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slot_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SlotBatch[];
    },
  });

  // Criar batch e gerar slots
  const createBatch = useMutation({
    mutationFn: async (params: CreateSlotBatchParams) => {
      // 1. Criar o batch
      const { data: batch, error: batchError } = await supabase
        .from('slot_batches')
        .insert({
          name: params.name,
          start_date: params.start_date,
          end_date: params.end_date,
          days_of_week: params.days_of_week,
          start_time: params.start_time,
          end_time: params.end_time,
          slot_duration: params.slot_duration,
          gap_minutes: params.gap_minutes,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // 2. Gerar os slots usando a função SQL
      const { data: slotsCount, error: slotsError } = await supabase.rpc(
        'generate_slots_from_batch',
        {
          p_batch_id: batch.id,
          p_start_date: params.start_date,
          p_end_date: params.end_date,
          p_days_of_week: params.days_of_week,
          p_start_time: params.start_time,
          p_end_time: params.end_time,
          p_slot_duration: params.slot_duration,
          p_gap_minutes: params.gap_minutes,
        }
      );

      if (slotsError) throw slotsError;

      return { batch, slotsCount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['slot-batches'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast.success(`${data.slotsCount} slots criados com sucesso!`);
    },
    onError: (error) => {
      console.error('Erro ao criar batch:', error);
      toast.error('Erro ao criar lote de slots');
    },
  });

  // Deletar batch (e seus slots)
  const deleteBatch = useMutation({
    mutationFn: async (batchId: string) => {
      // Primeiro deletar os slots do batch
      const { error: slotsError } = await supabase
        .from('calendar_slots')
        .delete()
        .eq('batch_id', batchId);

      if (slotsError) throw slotsError;

      // Depois deletar o batch
      const { error: batchError } = await supabase
        .from('slot_batches')
        .delete()
        .eq('id', batchId);

      if (batchError) throw batchError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slot-batches'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast.success('Lote deletado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar batch:', error);
      toast.error('Erro ao deletar lote');
    },
  });

  // Ativar/desativar batch
  const toggleBatchActive = useMutation({
    mutationFn: async ({ batchId, active }: { batchId: string; active: boolean }) => {
      const { error } = await supabase
        .from('slot_batches')
        .update({ active })
        .eq('id', batchId);

      if (error) throw error;

      // Atualizar disponibilidade dos slots do batch
      const { error: slotsError } = await supabase
        .from('calendar_slots')
        .update({ available: active })
        .eq('batch_id', batchId);

      if (slotsError) throw slotsError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['slot-batches'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast.success(
        variables.active ? 'Lote ativado com sucesso!' : 'Lote desativado com sucesso!'
      );
    },
    onError: (error) => {
      console.error('Erro ao alternar batch:', error);
      toast.error('Erro ao alternar status do lote');
    },
  });

  // Atualizar batch e regenerar slots
  const updateBatch = useMutation({
    mutationFn: async ({ batchId, params }: { batchId: string; params: CreateSlotBatchParams }) => {
      // 1. Deletar slots antigos do batch
      const { error: deleteError } = await supabase
        .from('calendar_slots')
        .delete()
        .eq('batch_id', batchId);

      if (deleteError) throw deleteError;

      // 2. Atualizar o batch
      const { data: batch, error: updateError } = await supabase
        .from('slot_batches')
        .update({
          name: params.name,
          start_date: params.start_date,
          end_date: params.end_date,
          days_of_week: params.days_of_week,
          start_time: params.start_time,
          end_time: params.end_time,
          slot_duration: params.slot_duration,
          gap_minutes: params.gap_minutes,
        })
        .eq('id', batchId)
        .select()
        .single();

      if (updateError) throw updateError;

      // 3. Gerar novos slots
      const { data: slotsCount, error: slotsError } = await supabase.rpc(
        'generate_slots_from_batch',
        {
          p_batch_id: batchId,
          p_start_date: params.start_date,
          p_end_date: params.end_date,
          p_days_of_week: params.days_of_week,
          p_start_time: params.start_time,
          p_end_time: params.end_time,
          p_slot_duration: params.slot_duration,
          p_gap_minutes: params.gap_minutes,
        }
      );

      if (slotsError) throw slotsError;

      return { batch, slotsCount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['slot-batches'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast.success(`Lote atualizado! ${data.slotsCount} slots recriados.`);
    },
    onError: (error) => {
      console.error('Erro ao atualizar batch:', error);
      toast.error('Erro ao atualizar lote');
    },
  });

  return {
    batches,
    isLoading,
    createBatch,
    deleteBatch,
    toggleBatchActive,
    updateBatch,
  };
};
