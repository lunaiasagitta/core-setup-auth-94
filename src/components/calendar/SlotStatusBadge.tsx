import { Badge } from '@/components/ui/badge';
import { Check, Clock, Ban, CalendarX } from 'lucide-react';

type SlotStatus = 'available' | 'reserved' | 'unavailable' | 'expired';

interface SlotStatusBadgeProps {
  status: SlotStatus;
}

export const SlotStatusBadge = ({ status }: SlotStatusBadgeProps) => {
  const statusConfig = {
    available: {
      icon: Check,
      label: 'Disponível',
      className: 'bg-green-600 hover:bg-green-600 text-white border-green-700',
    },
    reserved: {
      icon: Clock,
      label: 'Reservado',
      className: 'bg-yellow-500 hover:bg-yellow-500 text-black border-yellow-600',
    },
    unavailable: {
      icon: Ban,
      label: 'Indisponível',
      className: 'bg-gray-500 hover:bg-gray-500 text-white border-gray-600',
    },
    expired: {
      icon: CalendarX,
      label: 'Expirado',
      className: 'bg-red-700 hover:bg-red-700 text-white border-red-800 opacity-70',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
};
