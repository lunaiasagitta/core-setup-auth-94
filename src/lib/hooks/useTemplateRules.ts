import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useTemplateRules = (templateId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['template-rules', templateId],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from('availability_template_rules')
        .select('*')
        .eq('template_id', templateId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!templateId,
  });

  const createRule = useMutation({
    mutationFn: async (rule: any) => {
      const { data, error } = await supabase
        .from('availability_template_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-rules', templateId] });
      queryClient.invalidateQueries({ queryKey: ['availability-templates'] });
      toast({
        title: 'Regra criada',
        description: 'Regra de disponibilidade criada com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar regra',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('availability_template_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-rules', templateId] });
      queryClient.invalidateQueries({ queryKey: ['availability-templates'] });
      toast({
        title: 'Regra atualizada',
        description: 'Regra de disponibilidade atualizada com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar regra',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('availability_template_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-rules', templateId] });
      queryClient.invalidateQueries({ queryKey: ['availability-templates'] });
      toast({
        title: 'Regra deletada',
        description: 'Regra de disponibilidade deletada com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao deletar regra',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    rules: query.data || [],
    isLoading: query.isLoading,
    createRule,
    updateRule,
    deleteRule,
  };
};
