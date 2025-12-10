import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface RescheduleMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: any;
}

export const RescheduleMeetingModal = ({
  open,
  onOpenChange,
  meeting,
}: RescheduleMeetingModalProps) => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (meeting) {
      const meetingDate = new Date(meeting.scheduled_date);
      setDate(meetingDate);
      setTime(format(meetingDate, 'HH:mm'));
      setDuration(meeting.duration || 30);
    }
  }, [meeting]);

  const handleReschedule = async () => {
    if (!date || !meeting) return;

    setIsLoading(true);

    try {
      // ✅ TIMEZONE: Criar timestamp com timezone de São Paulo (-03:00) para conversão correta para UTC
      const scheduledDateStr = `${format(date, 'yyyy-MM-dd')}T${time}:00-03:00`;
      const scheduledDate = new Date(scheduledDateStr);

      const { error } = await supabase
        .from('meetings')
        .update({
          scheduled_date: scheduledDate.toISOString(),
          duration,
          updated_at: new Date().toISOString(),
        })
        .eq('id', meeting.id);

      if (error) throw error;

      await supabase.from('activity_log').insert({
        lead_id: meeting.lead_id,
        event_type: 'reuniao_reagendada',
        details: {
          meeting_id: meeting.id,
          old_date: meeting.scheduled_date,
          new_date: scheduledDate.toISOString(),
        },
      });

      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });

      toast({
        title: 'Reunião reagendada',
        description: 'A reunião foi reagendada com sucesso',
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao reagendar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!meeting) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reagendar Reunião</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nova Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP', { locale: ptBR }) : 'Selecione uma data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={ptBR}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reschedule-time">Novo Horário</Label>
            <Input
              id="reschedule-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reschedule-duration">Duração (minutos)</Label>
            <Input
              id="reschedule-duration"
              type="number"
              min={15}
              max={180}
              step={15}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleReschedule} disabled={!date || isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reagendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
