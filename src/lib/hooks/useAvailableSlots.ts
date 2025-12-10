import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export const useAvailableSlots = (date: Date | undefined) => {
  return useQuery({
    queryKey: ['available-slots', date ? format(date, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!date) return [];

      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Buscar slots disponíveis para o dia (VIEW já filtra slots passados automaticamente)
      const { data: slots, error: slotsError } = await supabase
        .from('available_slots_view')
        .select('*')
        .eq('date', formattedDate)
        .eq('is_future_slot', true)
        .order('time', { ascending: true });

      if (slotsError) throw slotsError;
      if (!slots) return [];

      // ✅ TIMEZONE: Buscar reuniões do dia em horário de São Paulo
      // Convertendo o range de datas para UTC considerando o offset de -03:00
      const startOfDayBRT = `${formattedDate}T00:00:00-03:00`;
      const endOfDayBRT = `${formattedDate}T23:59:59-03:00`;
      
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('scheduled_date, duration')
        .gte('scheduled_date', new Date(startOfDayBRT).toISOString())
        .lt('scheduled_date', new Date(endOfDayBRT).toISOString())
        .in('status', ['scheduled', 'confirmed']);

      if (meetingsError) throw meetingsError;

      const availableSlots = slots.filter(slot => {
        // ✅ TIMEZONE: Interpretar slot como horário de São Paulo (-03:00) e converter para UTC
        const slotDateTime = new Date(`${formattedDate}T${slot.time}-03:00`);
        const slotEndTime = new Date(slotDateTime.getTime() + (slot.duration || 30) * 60000);

        // ✅ FILTRO ADICIONAL: Verificar se o slot não está no passado (double-check da VIEW)
        const now = new Date();
        if (slotDateTime <= now) {
          return false; // Slot já passou
        }

        // Verificar se há conflito com alguma reunião
        const hasConflict = meetings?.some(meeting => {
          const meetingStart = new Date(meeting.scheduled_date);
          const meetingEnd = new Date(meetingStart.getTime() + (meeting.duration || 30) * 60000);

          return (
            (slotDateTime >= meetingStart && slotDateTime < meetingEnd) ||
            (slotEndTime > meetingStart && slotEndTime <= meetingEnd) ||
            (slotDateTime <= meetingStart && slotEndTime >= meetingEnd)
          );
        });

        return !hasConflict;
      });
      
      console.log('[DEBUG useAvailableSlots]', {
        date: formattedDate,
        totalSlots: slots.length,
        meetingsCount: meetings?.length || 0,
        availableSlotsCount: availableSlots.length,
        availableSlots: availableSlots.map(s => ({ id: s.id, time: s.time, duration: s.duration }))
      });

      return availableSlots;
    },
    enabled: !!date,
  });
};
