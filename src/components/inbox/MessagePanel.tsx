import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageThread } from './MessageThread';
import { ContactSidebar } from './ContactSidebar';
import { ChannelIcon } from './ChannelIcon';
import { OnlineIndicator } from './OnlineIndicator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

interface MessagePanelProps {
  selectedLead?: {
    id: string;
    nome: string | null;
    telefone: string;
    email: string | null;
    empresa: string | null;
  };
  messages: Message[];
  conversationId?: string;
  channel?: string;
  isLoading?: boolean;
}

export const MessagePanel = ({ 
  selectedLead, 
  messages, 
  conversationId, 
  channel,
  isLoading 
}: MessagePanelProps) => {
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversationId || !selectedLead) return;

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-admin-message', {
        body: {
          conversationId,
          message: messageText,
          leadPhone: selectedLead.telefone
        }
      });

      if (error) throw error;

      setMessageText('');
      toast.success('Mensagem enviada!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'V';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!selectedLead) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <p className="text-muted-foreground">Selecione uma conversa para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-w-0">
      {/* Thread de Mensagens */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b px-4 py-3 h-[57px] flex items-center">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(selectedLead.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{selectedLead.nome || 'Visitante'}</h3>
                <OnlineIndicator />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {channel && <ChannelIcon channel={channel} size={14} />}
                <span>{channel === 'web' ? 'Web Chat' : 'WhatsApp'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 md:p-6">
          <MessageThread messages={messages} isLoading={isLoading} />
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4">
          <Textarea
            placeholder="Digite sua mensagem..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="min-h-[80px] resize-none"
          />
          <div className="flex justify-end mt-2">
            <Button 
              onClick={handleSendMessage} 
              disabled={!messageText.trim() || sending}
            >
              {sending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar Direita - Detalhes do Contato */}
      <ContactSidebar contact={selectedLead} />
    </div>
  );
};
