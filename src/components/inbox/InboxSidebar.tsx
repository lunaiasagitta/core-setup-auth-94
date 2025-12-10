import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChannelItemProps {
  icon: string;
  label: string;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
}

const ChannelItem = ({ icon, label, badge, active, onClick }: ChannelItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
      "hover:bg-accent/50",
      active && "bg-accent"
    )}
  >
    <div className="flex items-center gap-2">
      <span className="text-base">{icon}</span>
      <span className="text-foreground">{label}</span>
    </div>
    {badge !== undefined && badge > 0 && (
      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
        {badge}
      </Badge>
    )}
  </button>
);

interface InboxSidebarProps {
  onChannelFilter?: (channel: string) => void;
}

export const InboxSidebar = ({ onChannelFilter }: InboxSidebarProps) => {
  return (
    <aside className="hidden md:flex w-48 lg:w-56 border-r bg-background flex-col shrink-0">
      <div className="px-4 py-3 border-b h-[57px] flex items-center">
        <h2 className="font-semibold text-sm">Canais</h2>
      </div>

      <nav className="flex-1 p-2">
        <ChannelItem 
          icon="💬" 
          label="WhatsApp" 
          badge={5}
          onClick={() => onChannelFilter?.('whatsapp')}
        />
        <ChannelItem 
          icon="🌐" 
          label="Web Chat" 
          badge={2}
          onClick={() => onChannelFilter?.('web')}
        />
        <ChannelItem 
          icon="📷" 
          label="Instagram"
          onClick={() => onChannelFilter?.('instagram')}
        />
        <ChannelItem 
          icon="✈️" 
          label="Telegram"
          onClick={() => onChannelFilter?.('telegram')}
        />
      </nav>
    </aside>
  );
};
