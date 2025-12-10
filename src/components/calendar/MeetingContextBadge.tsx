import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

interface MeetingContextBadgeProps {
  contexto_reuniao: any;
}

export const MeetingContextBadge = ({ contexto_reuniao }: MeetingContextBadgeProps) => {
  if (!contexto_reuniao) {
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        Aguardando
      </Badge>
    );
  }

  const status = contexto_reuniao.status || 'parcial';

  const statusConfig = {
    completo: {
      icon: CheckCircle2,
      label: 'Completo',
      className: 'bg-success/10 text-success border-success/20',
    },
    parcial: {
      icon: AlertCircle,
      label: 'Parcial',
      className: 'bg-warning/10 text-warning border-warning/20',
    },
    timeout: {
      icon: XCircle,
      label: 'Timeout',
      className: 'bg-destructive/10 text-destructive border-destructive/20',
    },
    aguardando: {
      icon: Clock,
      label: 'Aguardando',
      className: 'bg-muted text-muted-foreground border-border',
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.aguardando;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};
