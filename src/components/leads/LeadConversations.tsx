import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLeadConversations } from '@/lib/hooks/useLeadConversations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface LeadConversationsProps {
  leadId: string;
}

export const LeadConversations = ({ leadId }: LeadConversationsProps) => {
  const { data: messages, isLoading } = useLeadConversations(leadId);
  const [openToolsIndex, setOpenToolsIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma conversa registrada ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Conversas</CardTitle>
          <Badge variant="secondary">{messages.length} mensagens</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : message.role === 'assistant'
                    ? 'bg-muted'
                    : 'bg-accent'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">
                    {message.role === 'user' ? 'Lead' : message.role === 'assistant' ? 'Luna' : 'Sistema'}
                  </span>
                  <span className="text-xs opacity-70">
                    {format(new Date(message.timestamp), 'dd/MM HH:mm', { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {message.tools_used && message.tools_used.length > 0 && (
                  <Collapsible
                    open={openToolsIndex === index}
                    onOpenChange={(open) => setOpenToolsIndex(open ? index : null)}
                  >
                    <CollapsibleTrigger className="text-xs mt-2 underline opacity-70 hover:opacity-100">
                      🔧 {openToolsIndex === index ? 'Ocultar' : 'Ver'} ferramentas usadas
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 p-2 bg-background/50 rounded text-xs">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(message.tools_used, null, 2)}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
