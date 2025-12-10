import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const useWebChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visitorId, setVisitorId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');

  // Gerar ou recuperar visitorId
  useEffect(() => {
    let id = localStorage.getItem('web_chat_visitor_id');
    if (!id) {
      id = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('web_chat_visitor_id', id);
    }
    setVisitorId(id);

    const storedSessionId = sessionStorage.getItem('web_chat_session_id');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      loadHistory(storedSessionId);
    }
  }, []);

  const loadHistory = async (session: string) => {
    try {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('session_id', session)
        .eq('channel', 'web')
        .maybeSingle();

      if (conversation) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('timestamp', { ascending: true });

        if (msgs) {
          setMessages(msgs.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.timestamp)
          })));
        }
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!visitorId || !content.trim()) return;

    const userMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('web-chat', {
        body: { visitorId, message: content.trim(), sessionId }
      });

      if (error) throw error;

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
        sessionStorage.setItem('web_chat_session_id', data.sessionId);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [visitorId, sessionId]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId('');
    sessionStorage.removeItem('web_chat_session_id');
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat
  };
};