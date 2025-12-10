import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ExternalLink, Clock } from 'lucide-react';
import { useMeetings } from '@/lib/hooks/useMeetings';
import { format, formatDistanceToNow, isToday, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export const AgendaTodayCard = () => {
  const navigate = useNavigate();
  const { meetings } = useMeetings();

  const upcomingMeetings = meetings
    .filter((m) => {
      const meetingDate = new Date(m.scheduled_date);
      return (isToday(meetingDate) || isFuture(meetingDate)) && m.status !== 'cancelled';
    })
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'bg-chart-2',
      confirmed: 'bg-chart-1',
      completed: 'bg-chart-4',
      cancelled: 'bg-destructive',
      no_show: 'bg-chart-5',
    };
    return colors[status as keyof typeof colors] || 'bg-muted';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      scheduled: 'Agendada',
      confirmed: 'Confirmada',
      completed: 'Concluída',
      cancelled: 'Cancelada',
      no_show: 'No-show',
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Agenda de Hoje
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>
          Ver Agenda
        </Button>
      </CardHeader>
      <CardContent>
        {upcomingMeetings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma reunião agendada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingMeetings.map((meeting) => {
              const meetingDate = new Date(meeting.scheduled_date);
              const lead = meeting.lead as any;

              return (
                <div
                  key={meeting.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">
                        {lead?.nome || 'Lead sem nome'}
                      </p>
                      <Badge
                        variant="secondary"
                        className={getStatusColor(meeting.status || 'scheduled')}
                      >
                        {getStatusLabel(meeting.status || 'scheduled')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(meetingDate, 'HH:mm')}
                      </span>
                      {isToday(meetingDate) && (
                        <span className="text-primary font-medium">
                          {formatDistanceToNow(meetingDate, {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      )}
                      {!isToday(meetingDate) && (
                        <span>
                          {format(meetingDate, "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                  {meeting.meeting_link && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(meeting.meeting_link, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
