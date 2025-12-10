import { cn } from '@/lib/utils';

interface ChannelIconProps {
  channel: string;
  size?: number;
  className?: string;
}

const CHANNEL_CONFIG = {
  whatsapp: { icon: '💬', color: 'text-green-600' },
  web: { icon: '🌐', color: 'text-blue-600' },
  instagram: { icon: '📷', color: 'text-pink-600' },
  telegram: { icon: '✈️', color: 'text-cyan-600' }
};

export const ChannelIcon = ({ channel, size = 16, className }: ChannelIconProps) => {
  const config = CHANNEL_CONFIG[channel as keyof typeof CHANNEL_CONFIG] || { 
    icon: '💬', 
    color: 'text-muted-foreground' 
  };

  return (
    <span 
      className={cn(config.color, className)} 
      style={{ fontSize: size }}
    >
      {config.icon}
    </span>
  );
};
