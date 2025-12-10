import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

interface MessageThreadProps {
  messages: Message[];
  isLoading?: boolean;
}

export const MessageThread = ({ messages, isLoading }: MessageThreadProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="space-y-4" ref={scrollRef}>
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        
        return (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3",
              isUser ? "flex-row-reverse" : "flex-row"
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className={cn(
                isUser 
                  ? "bg-primary/10 text-primary" 
                  : "bg-accent text-accent-foreground"
              )}>
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>

            <div className={cn(
              "flex flex-col gap-1 max-w-[70%]",
              isUser ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "rounded-2xl px-3 py-2",
                isUser 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted"
              )}>
                {isUser ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
              
              <span className="text-xs text-muted-foreground">
                {format(new Date(msg.timestamp), "HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-accent text-accent-foreground">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="bg-muted rounded-2xl px-3 py-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};