import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import { useMeetings } from '@/lib/hooks/useMeetings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, addDays } from 'date-fns';

export const AgendaMetricsCard = () => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const weekEnd = addDays(now, 7);

  const { meetings } = useMeetings({
    startDate: monthStart.toISOString(),
    endDate: monthEnd.toISOString(),
  });

  const { data: slots = [] } = useQuery({
    queryKey: ['slots-next-7-days'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_slots')
        .select('*')
        .gte('date', now.toISOString().split('T')[0])
        .lte('date', weekEnd.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Métricas
  const totalMeetingsThisMonth = meetings.length;
  const completedMeetings = meetings.filter((m) => m.status === 'completed').length;
  const noShowMeetings = meetings.filter((m) => m.status === 'no_show').length;
  const attendanceRate =
    completedMeetings + noShowMeetings > 0
      ? Math.round((completedMeetings / (completedMeetings + noShowMeetings)) * 100)
      : 100;

  const availableSlotsNext7Days = slots.filter((slot: any) => {
    const slotDate = new Date(slot.date);
    return (
      slot.available &&
      !slot.reserved_by &&
      slotDate >= now &&
      slotDate <= weekEnd
    );
  }).length;

  const metrics = [
    {
      label: 'Reuniões este mês',
      value: totalMeetingsThisMonth,
      icon: Calendar,
      color: 'text-chart-2',
    },
    {
      label: 'Taxa de comparecimento',
      value: `${attendanceRate}%`,
      icon: CheckCircle,
      color: attendanceRate >= 80 ? 'text-chart-1' : 'text-destructive',
    },
    {
      label: 'Slots disponíveis (7 dias)',
      value: availableSlotsNext7Days,
      icon: TrendingUp,
      color: 'text-chart-3',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Métricas de Agenda
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
                <span className="text-sm font-medium">{metric.label}</span>
              </div>
              <span className={`text-2xl font-bold ${metric.color}`}>{metric.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
