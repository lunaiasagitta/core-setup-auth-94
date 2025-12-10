import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useAvailabilityExceptions = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['availability-exceptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability_exceptions')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const createException = useMutation({
    mutationFn: async (exception: any) => {
      const { data, error } = await supabase
        .from('availability_exceptions')
        .insert(exception)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({
        title: 'Exceção criada',
        description: 'Exceção de disponibilidade criada com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar exceção',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateException = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('availability_exceptions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({
        title: 'Exceção atualizada',
        description: 'Exceção de disponibilidade atualizada com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar exceção',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteException = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('availability_exceptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({
        title: 'Exceção deletada',
        description: 'Exceção de disponibilidade deletada com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao deletar exceção',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    exceptions: query.data || [],
    isLoading: query.isLoading,
    createException,
    updateException,
    deleteException,
  };
};
