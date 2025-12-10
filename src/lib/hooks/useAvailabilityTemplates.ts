import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useAvailabilityTemplates = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['availability-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability_templates')
        .select(`
          *,
          rules:availability_template_rules(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: { name: string; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from('availability_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-templates'] });
      toast({
        title: 'Template criado',
        description: 'Template de disponibilidade criado com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('availability_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-templates'] });
      toast({
        title: 'Template atualizado',
        description: 'Template de disponibilidade atualizado com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('availability_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-templates'] });
      toast({
        title: 'Template deletado',
        description: 'Template de disponibilidade deletado com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao deletar template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const generateSlots = useMutation({
    mutationFn: async ({
      templateId,
      startDate,
      endDate,
    }: {
      templateId: string;
      startDate: string;
      endDate: string;
    }) => {
      const { data, error } = await supabase.rpc('generate_slots_from_template', {
        p_template_id: templateId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (slotsCreated: number) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast({
        title: 'Slots gerados',
        description: `${slotsCreated} slots foram criados com sucesso`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao gerar slots',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    templates: query.data || [],
    isLoading: query.isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    generateSlots,
  };
};
