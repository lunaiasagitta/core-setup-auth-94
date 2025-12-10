import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface MeetingFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  leadId?: string;
}

export const useMeetings = (filters?: MeetingFilters) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['meetings', filters],
    queryFn: async () => {
      let query = supabase
        .from('meetings')
        .select(`
          *,
          lead:leads(id, nome, email, telefone, empresa)
        `)
        .order('scheduled_date', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.startDate) {
        query = query.gte('scheduled_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('scheduled_date', filters.endDate);
      }
      if (filters?.leadId) {
        query = query.eq('lead_id', filters.leadId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateMeetingStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    }) => {
      // Se for cancelamento, usar edge function que cancela no Google também
      if (status === 'cancelled') {
        const { data, error } = await supabase.functions.invoke(
          'google-calendar-cancel',
          { body: { meetingId: id } }
        );
        
        if (error) throw error;
        if (!data.success) throw new Error('Failed to cancel meeting');
        
        // Retornar dados atualizados
        const { data: meeting } = await supabase
          .from('meetings')
          .select()
          .eq('id', id)
          .single();
        
        return meeting;
      }
      
      // Para outros status, atualizar normalmente
      const updates: any = { status };
      
      const { data, error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      
      const statusLabels = {
        scheduled: 'agendada',
        confirmed: 'confirmada',
        completed: 'concluída',
        cancelled: 'cancelada',
        no_show: 'marcada como no-show',
      };

      toast({
        title: 'Status atualizado',
        description: `Reunião ${statusLabels[variables.status]}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meetings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({
        title: 'Reunião deletada',
        description: 'Reunião deletada com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao deletar reunião',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const generateContext = useMutation({
    mutationFn: async ({ meetingId, leadId }: { meetingId: string; leadId: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-meeting-context', {
        body: { meetingId, leadId }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao gerar contexto');
      
      return data.contexto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast({
        title: 'Contexto gerado',
        description: 'Contexto da reunião gerado com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao gerar contexto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    meetings: query.data || [],
    isLoading: query.isLoading,
    updateMeetingStatus,
    deleteMeeting,
    generateContext,
  };
};
