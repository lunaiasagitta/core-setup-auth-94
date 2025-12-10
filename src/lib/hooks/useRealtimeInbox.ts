import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useRealtimeInbox = (channelFilter: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('inbox-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages' 
        },
        (payload) => {
          console.log('Nova mensagem recebida:', payload);
          
          // Invalidar queries para atualizar a UI
          queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          
          // Mostrar notificação
          if (payload.new.role === 'user') {
            toast.info('Nova mensagem recebida', {
              description: 'Um lead enviou uma nova mensagem'
            });
            
            // Tocar som (opcional)
            playNotificationSound();
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations' 
        },
        (payload) => {
          console.log('Conversa atualizada:', payload);
          queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelFilter, queryClient]);
};

// Função auxiliar para tocar som de notificação
function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGF0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltzy1oEwBSV+zPLaizsIGGS56+mjUBELTKXh8bllHAU2jdXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXyzn4tBSh6ye/glkYMEmS76+ijThEKTKXh8bllHAU1jNXy');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignorar erros de autoplay
    });
  } catch (error) {
    console.error('Erro ao tocar som:', error);
  }
}