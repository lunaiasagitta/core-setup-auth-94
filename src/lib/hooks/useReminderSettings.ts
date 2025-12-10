import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReminderSetting {
  id: string;
  interval_minutes: number;
  label: string;
  enabled: boolean;
  message_template: string;
  created_at: string;
  updated_at: string;
}

export function useReminderSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['reminder-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminder_settings')
        .select('*')
        .order('interval_minutes', { ascending: true });

      if (error) throw error;
      return data as ReminderSetting[];
    }
  });

  const updateSetting = useMutation({
    mutationFn: async ({ id, enabled, message_template }: { 
      id: string; 
      enabled?: boolean; 
      message_template?: string;
    }) => {
      const updateData: any = {};
      if (enabled !== undefined) updateData.enabled = enabled;
      if (message_template !== undefined) updateData.message_template = message_template;

      const { error } = await supabase
        .from('reminder_settings')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Configuração de lembrete atualizada');
      queryClient.invalidateQueries({ queryKey: ['reminder-settings'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar configuração: ' + error.message);
    }
  });

  return {
    settings,
    isLoading,
    updateSetting
  };
}
