import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (leadId: string) => void;
}

export const ConversationList = ({ conversations, selectedId, onSelect }: ConversationListProps) => {
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return '💬';
      case 'web': return '🌐';
      case 'instagram': return '📷';
      case 'telegram': return '✈️';
      default: return '💬';
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'web': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'instagram': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      case 'telegram': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      default: return 'bg-muted/10 text-muted-foreground border-border';
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

  return (
    <div className="space-y-2">
      {conversations.map((conv) => {
        const isSelected = selectedId === conv.leads?.id;
        const displayName = conv.leads?.nome || 'Visitante Web';
        
        return (
          <div
            key={conv.id}
            onClick={() => conv.leads?.id && onSelect(conv.leads.id)}
            className={cn(
              "p-4 rounded-lg border cursor-pointer transition-all duration-200",
              "hover:shadow-md hover:scale-[1.02]",
              isSelected 
                ? "bg-accent border-primary shadow-sm" 
                : "bg-card hover:bg-accent/50"
            )}
          >
            <div className="flex items-start gap-3">
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{getChannelIcon(conv.channel)}</span>
                    <span className="font-semibold text-sm truncate">
                      {displayName}
                    </span>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs shrink-0", getChannelColor(conv.channel))}
                  >
                    {conv.channel}
                  </Badge>
                </div>

                {conv.lastMessage && (
                  <>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                      {conv.lastMessage.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(conv.lastMessage.timestamp), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </>
                )}

                {conv.leads?.stage && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {conv.leads.stage}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};