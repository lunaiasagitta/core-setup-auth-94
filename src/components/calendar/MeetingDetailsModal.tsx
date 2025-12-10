import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  ExternalLink,
  Copy,
  User,
  CheckCircle,
  XCircle,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useMeetings } from '@/lib/hooks/useMeetings';
import { useNavigate } from 'react-router-dom';

interface MeetingDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: any;
  onReschedule: () => void;
  onCancel: () => void;
}

export const MeetingDetailsModal = ({
  open,
  onOpenChange,
  meeting,
  onReschedule,
  onCancel,
}: MeetingDetailsModalProps) => {
  const { updateMeetingStatus } = useMeetings();
  const navigate = useNavigate();

  if (!meeting) return null;

  const meetingDate = new Date(meeting.scheduled_date);
  const leadName = meeting.lead?.nome || 'Lead';
  const initials = leadName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-500',
    confirmed: 'bg-green-500',
    completed: 'bg-green-700',
    cancelled: 'bg-red-500',
    no_show: 'bg-orange-500',
  };

  const statusLabels: Record<string, string> = {
    scheduled: 'Agendada',
    confirmed: 'Confirmada',
    completed: 'Concluída',
    cancelled: 'Cancelada',
    no_show: 'No-show',
  };

  const copyMeetingLink = () => {
    if (meeting.meeting_link) {
      navigator.clipboard.writeText(meeting.meeting_link);
      toast({
        title: 'Link copiado',
        description: 'Link do Google Meet copiado para a área de transferência',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes da Reunião</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{leadName}</div>
              {meeting.lead?.empresa && (
                <div className="text-sm text-muted-foreground">{meeting.lead.empresa}</div>
              )}
              {meeting.lead?.telefone && (
                <div className="text-sm text-muted-foreground">{meeting.lead.telefone}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(meetingDate, 'PPP', { locale: ptBR })}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{format(meetingDate, 'HH:mm')}</span>
            <span className="text-muted-foreground">•</span>
            <span>{meeting.duration} minutos</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge className={statusColors[meeting.status || 'scheduled']}>
              {statusLabels[meeting.status || 'scheduled']}
            </Badge>
          </div>

          {meeting.meeting_link && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Link do Google Meet</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyMeetingLink} className="flex-1">
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(meeting.meeting_link, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir
                </Button>
              </div>
            </div>
          )}

          {meeting.google_event_id && (
            <div className="text-xs text-muted-foreground">
              Google Event ID: {meeting.google_event_id}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/leads/${meeting.lead_id}`)}>
            <User className="mr-2 h-4 w-4" />
            Ver Lead
          </Button>

          {meeting.status === 'scheduled' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateMeetingStatus.mutate({ id: meeting.id, status: 'confirmed' });
                onOpenChange(false);
              }}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirmar
            </Button>
          )}

          {(meeting.status === 'scheduled' || meeting.status === 'confirmed') && (
            <>
              <Button variant="outline" size="sm" onClick={onReschedule}>
                <CalendarClock className="mr-2 h-4 w-4" />
                Reagendar
              </Button>
              <Button variant="destructive" size="sm" onClick={onCancel}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </>
          )}

          {/* Marcar como Concluída ou No-show (apenas se reunião já passou) */}
          {(meeting.status === 'scheduled' || meeting.status === 'confirmed') &&
            meetingDate < new Date() && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-green-50 hover:bg-green-100 text-green-700"
                  onClick={() => {
                    updateMeetingStatus.mutate({ id: meeting.id, status: 'completed' });
                    onOpenChange(false);
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Marcar como Concluída
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-orange-50 hover:bg-orange-100 text-orange-700"
                  onClick={() => {
                    updateMeetingStatus.mutate({ id: meeting.id, status: 'no_show' });
                    onOpenChange(false);
                  }}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Marcar como No-show
                </Button>
              </>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
