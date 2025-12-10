import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ChannelIcon } from './ChannelIcon';

interface Conversation {
  id: string;
  channel: string;
  updated_at: string;
  leads?: {
    id: string;
    nome: string | null;
    telefone: string;
    stage: string | null;
  };
  lastMessage?: {
    content: string;
    timestamp: string;
    role: string;
  };
}

interface ConversationListPanelProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (leadId: string) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const ConversationListPanel = ({ 
  conversations, 
  selectedId, 
  onSelect,
  activeTab = 'all',
  onTabChange
}: ConversationListPanelProps) => {
  const getInitials = (name: string | null) => {
    if (!name) return 'V';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return 'bg-green-500/10 text-green-600';
      case 'web': return 'bg-blue-500/10 text-blue-600';
      case 'instagram': return 'bg-pink-500/10 text-pink-600';
      case 'telegram': return 'bg-cyan-500/10 text-cyan-600';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  return (
    <div className="w-full sm:w-[300px] md:w-[320px] lg:w-[380px] xl:w-[400px] border-r flex flex-col bg-background shrink-0">
      {/* Header */}
      <div className="border-b px-4 py-3 h-[57px] flex items-center justify-between">
        <h2 className="font-semibold">Conversas</h2>
        <Badge variant="secondary">{conversations.length}</Badge>
      </div>

      {/* Lista de Conversas */}
      <ScrollArea className="flex-1">
        {conversations.map((conv) => {
          const isSelected = selectedId === conv.leads?.id;
          const displayName = conv.leads?.nome || 'Visitante Web';

          return (
            <div
              key={conv.id}
              onClick={() => conv.leads?.id && onSelect(conv.leads.id)}
              className={cn(
                "px-4 py-3 border-b cursor-pointer transition-colors",
                "hover:bg-accent/50",
                isSelected && "bg-accent border-l-4 border-l-primary"
              )}
            >
              <div className="flex gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className={cn(
                    "text-sm font-semibold",
                    getChannelColor(conv.channel)
                  )}>
                    {getInitials(conv.leads?.nome)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <ChannelIcon channel={conv.channel} size={14} />
                      <span className="font-medium text-sm truncate">
                        {displayName}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {conv.lastMessage && format(new Date(conv.lastMessage.timestamp), "dd/MM", { locale: ptBR })}
                    </span>
                  </div>

                  {conv.lastMessage && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                      {conv.lastMessage.content}
                    </p>
                  )}

                  {conv.leads?.stage && (
                    <Badge variant="outline" className="text-xs h-5">
                      {conv.leads.stage}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {conversations.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
