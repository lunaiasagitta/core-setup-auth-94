import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useRealtimeLeads = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.invalidateQueries({ queryKey: ['lead-analytics'] });
          
          toast({
            title: '🎉 Novo lead!',
            description: `${payload.new.nome || 'Lead sem nome'} foi adicionado.`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.invalidateQueries({ queryKey: ['lead', payload.new.id] });
          queryClient.invalidateQueries({ queryKey: ['lead-analytics'] });

          // Notificar se lead foi qualificado
          if (payload.new.score_bant >= 70 && payload.old.score_bant < 70) {
            toast({
              title: '⭐ Lead qualificado!',
              description: `${payload.new.nome} atingiu score ${payload.new.score_bant}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};