import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InboxSidebar } from '@/components/inbox/InboxSidebar';
import { ConversationListPanel } from '@/components/inbox/ConversationListPanel';
import { MessagePanel } from '@/components/inbox/MessagePanel';
import { useLeadConversations } from '@/lib/hooks/useLeadConversations';
import { useRealtimeInbox } from '@/lib/hooks/useRealtimeInbox';

const InboxPage = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  // Realtime updates
  useRealtimeInbox(channelFilter);

  // Fetch conversations
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['inbox-conversations', channelFilter],
    queryFn: async () => {
      let query = supabase
        .from('conversations')
        .select(`
          *,
          leads!inner (id, nome, telefone, email, empresa, stage)
        `)
        .order('updated_at', { ascending: false });

      if (channelFilter !== 'all') {
        query = query.eq('channel', channelFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get last message for each conversation
      const conversationsWithMessages = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('timestamp', { ascending: false })
            .limit(1);

          return {
            ...conv,
            lastMessage: messages?.[0] || null
          };
        })
      );

      return conversationsWithMessages;
    }
  });

  // Fetch selected conversation details
  const { data: selectedConvData } = useQuery({
    queryKey: ['conversation-detail', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return null;
      
      const { data: conv } = await supabase
        .from('conversations')
        .select('*, leads(*)')
        .eq('lead_id', selectedConversation)
        .single();

      return conv;
    },
    enabled: !!selectedConversation
  });

  const { data: messages, isLoading: messagesLoading } = useLeadConversations(selectedConversation);

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden">
      {/* Sidebar Esquerda - Filtros */}
      <InboxSidebar onChannelFilter={setChannelFilter} />
      
      {/* Lista de Conversas - Centro */}
      <ConversationListPanel
        conversations={conversations || []}
        selectedId={selectedConversation}
        onSelect={setSelectedConversation}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* Thread + Detalhes - Direita */}
      <MessagePanel
        selectedLead={selectedConvData?.leads}
        messages={messages || []}
        conversationId={selectedConvData?.id}
        channel={selectedConvData?.channel}
        isLoading={messagesLoading}
      />
    </div>
  );
};

export default InboxPage;