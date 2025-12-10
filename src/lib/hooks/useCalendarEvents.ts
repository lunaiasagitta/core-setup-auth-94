import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, addHours } from 'date-fns';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: 'slot' | 'meeting';
    status?: string;
    data: any;
  };
}

export const useCalendarEvents = (viewDate: Date) => {
  return useQuery({
    queryKey: ['calendar-events', viewDate.toISOString()],
    queryFn: async () => {
      const start = startOfMonth(viewDate);
      const end = endOfMonth(viewDate);

      // Fetch slots
      const { data: slots, error: slotsError } = await supabase
        .from('calendar_slots')
        .select('*')
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0]);

      if (slotsError) throw slotsError;

      // Fetch meetings with lead data (excluindo canceladas e no-show do calendário visual)
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select(`
          *,
          lead:leads(id, nome, email, telefone)
        `)
        .gte('scheduled_date', start.toISOString())
        .lte('scheduled_date', end.toISOString())
        .not('status', 'in', '("cancelled","no_show")');

      if (meetingsError) throw meetingsError;

      const events: CalendarEvent[] = [];

      // ✅ MELHORIA: Slots não aparecem no calendário visual (apenas na aba Slots)
      // Calendário mostra apenas reuniões reais para visão limpa e clara

      // Format meetings
      meetings?.forEach((meeting) => {
        // ✅ CORREÇÃO TIMEZONE: Interpretar scheduled_date que já vem em UTC, mas converter para objeto Date corretamente
        const startDate = new Date(meeting.scheduled_date);
        const endDate = addHours(startDate, (meeting.duration || 30) / 60);

        let title = '';
        let status = meeting.status || 'scheduled';

        const leadName = meeting.lead?.nome || 'Lead';

        switch (meeting.status) {
          case 'completed':
            title = `${leadName} - Concluída`;
            break;
          case 'cancelled':
            title = `${leadName} - Cancelada`;
            break;
          case 'no_show':
            title = `${leadName} - No-show`;
            break;
          case 'confirmed':
            title = `${leadName} - Confirmada`;
            break;
          default:
            title = `${leadName} - Reunião`;
        }

        events.push({
          id: `meeting-${meeting.id}`,
          title,
          start: startDate,
          end: endDate,
          resource: {
            type: 'meeting',
            status,
            data: meeting,
          },
        });
      });

      return events;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
