import { supabase } from '@/integrations/supabase/client';
import { set, addHours, format, parse } from 'date-fns';

interface AvailabilityResult {
  available: boolean;
  reason?: string;
  suggestions?: Date[];
}

export const useAvailabilityCheck = () => {
  const checkAvailability = async (
    date: Date,
    time: string,
    duration: number
  ): Promise<AvailabilityResult> => {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const requestedStart = set(date, { hours, minutes, seconds: 0, milliseconds: 0 });
      const requestedEnd = addHours(requestedStart, duration / 60);

      // 1. Validar data não está no passado
      if (requestedStart < new Date()) {
        return {
          available: false,
          reason: 'Não é possível agendar no passado',
        };
      }

      // 2. Verificar se existe slot disponível
      const dateOnly = format(date, 'yyyy-MM-dd');
      const { data: availableSlot } = await supabase
        .from('calendar_slots')
        .select('*')
        .eq('date', dateOnly)
        .eq('time', time)
        .eq('available', true)
        .maybeSingle();

      if (!availableSlot) {
        // Sugerir próximos 3 horários disponíveis
        const suggestions = await findNextAvailableSlots(date, 3);
        return {
          available: false,
          reason: 'Não há slot disponível neste horário',
          suggestions,
        };
      }

      // 3. Verificar conflitos com reuniões existentes
      const { data: meetings } = await supabase
        .from('meetings')
        .select('*')
        .gte('scheduled_date', format(requestedStart, "yyyy-MM-dd'T'00:00:00"))
        .lte('scheduled_date', format(requestedStart, "yyyy-MM-dd'T'23:59:59"))
        .in('status', ['scheduled', 'confirmed']);

      const hasMeetingConflict = (meetings || []).some((meeting) => {
        const meetingStart = new Date(meeting.scheduled_date);
        const meetingEnd = addHours(meetingStart, (meeting.duration || 30) / 60);
        return (
          (requestedStart >= meetingStart && requestedStart < meetingEnd) ||
          (requestedEnd > meetingStart && requestedEnd <= meetingEnd)
        );
      });

      if (hasMeetingConflict) {
        const suggestions = await findNextAvailableSlots(date, 3);
        return {
          available: false,
          reason: 'Horário já ocupado',
          suggestions,
        };
      }

      return { available: true };
    } catch (error) {
      console.error('Error checking availability:', error);
      return {
        available: false,
        reason: 'Erro ao verificar disponibilidade',
      };
    }
  };

  return { checkAvailability };
};

async function findNextAvailableSlots(
  startDate: Date,
  count: number
): Promise<Date[]> {
  const suggestions: Date[] = [];
  let currentDate = new Date(startDate);
  const maxDays = 14; // Buscar até 2 semanas à frente
  let daysChecked = 0;

  while (suggestions.length < count && daysChecked < maxDays) {
    // Buscar slots disponíveis no dia
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const { data: availableSlots } = await supabase
      .from('calendar_slots')
      .select('*')
      .eq('date', dateStr)
      .eq('available', true)
      .limit(1);

    if (availableSlots && availableSlots.length > 0) {
      const slot = availableSlots[0];
      const slotTime = parse(slot.time, 'HH:mm', currentDate);
      suggestions.push(slotTime);
    }

    currentDate.setDate(currentDate.getDate() + 1);
    daysChecked++;
  }

  return suggestions;
}
