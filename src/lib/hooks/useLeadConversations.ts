import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  tools_used: any;
  timestamp: string;
}

export const useLeadConversations = (leadId: string) => {
  return useQuery({
    queryKey: ['conversations', leadId],
    queryFn: async () => {
      // Primeiro buscar a conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (convError) throw convError;
      if (!conversation) return [];

      // Buscar mensagens da conversation
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('timestamp', { ascending: true });

      if (msgError) throw msgError;
      return messages as Message[];
    },
    enabled: !!leadId,
  });
};
