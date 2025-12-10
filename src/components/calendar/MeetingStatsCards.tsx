import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';

interface MeetingStatsCardsProps {
  meetings: any[];
}

export const MeetingStatsCards = ({ meetings }: MeetingStatsCardsProps) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const stats = {
    scheduled: meetings.filter(m => m.status === 'scheduled' || m.status === 'confirmed').length,
    confirmed: meetings.filter(m => m.status === 'confirmed').length,
    today: meetings.filter(m => {
      const meetingDate = new Date(m.scheduled_date);
      return meetingDate >= todayStart && meetingDate < todayEnd && 
             (m.status === 'scheduled' || m.status === 'confirmed');
    }).length,
    cancelled: meetings.filter(m => m.status === 'cancelled' || m.status === 'no_show').length,
  };

  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <StatCard
        title="Agendadas"
        value={stats.scheduled}
        icon={Calendar}
        color="primary"
      />
      <StatCard
        title="Confirmadas"
        value={stats.confirmed}
        icon={CheckCircle}
        color="success"
      />
      <StatCard
        title="Hoje"
        value={stats.today}
        icon={Clock}
        color="accent"
      />
      <StatCard
        title="Canceladas"
        value={stats.cancelled}
        icon={XCircle}
        color="destructive"
      />
    </div>
  );
};
