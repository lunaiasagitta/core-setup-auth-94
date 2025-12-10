import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Check, Loader2 } from 'lucide-react';
import { format, addMinutes, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAvailableSlots } from '@/lib/hooks/useAvailableSlots';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ScheduleMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
}

export const ScheduleMeetingModal = ({
  open,
  onOpenChange,
  leadId,
}: ScheduleMeetingModalProps) => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  
  const { data: availableSlots, isLoading: isLoadingSlots } = useAvailableSlots(selectedDate);

  const scheduleMeetingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot || !selectedDate) throw new Error('Selecione um horário disponível');

      const slotTime = parse(selectedSlot.time, 'HH:mm:ss', new Date());
      const scheduledDate = new Date(selectedDate);
      scheduledDate.setHours(slotTime.getHours(), slotTime.getMinutes(), 0);

      // Create event in Google Calendar
      const { data: eventData, error: eventError } = await supabase.functions.invoke(
        'google-calendar-create',
        {
          body: {
            summary: `Reunião com Lead`,
            startTime: scheduledDate.toISOString(),
            duration: selectedSlot.duration,
          },
        }
      );

      if (eventError) throw eventError;

      // Insert meeting
      const { error: meetingError } = await supabase.from('meetings').insert({
        lead_id: leadId,
        scheduled_date: scheduledDate.toISOString(),
        duration: selectedSlot.duration,
        google_event_id: eventData?.eventId,
        meeting_link: eventData?.meetingLink,
        status: 'scheduled',
      });

      if (meetingError) throw meetingError;

      // Reservar o slot
      await supabase
        .from('calendar_slots')
        .update({ 
          reserved_by: leadId, 
          reserved_at: new Date().toISOString(),
          available: false
        })
        .eq('id', selectedSlot.id);

      // Atualizar stage do lead
      await supabase
        .from('leads')
        .update({ stage: 'Reunião Agendada' })
        .eq('id', leadId);

      // Registrar atividade
      await supabase.from('activity_log').insert({
        lead_id: leadId,
        event_type: 'meeting_scheduled',
        details: {
          meeting_date: scheduledDate.toISOString(),
          duration: selectedSlot.duration,
        },
      });

      // Criar notificação
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'meeting_scheduled',
          title: 'Reunião agendada',
          description: `Reunião marcada para ${format(scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
          link: `/leads/${leadId}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['activities', leadId] });

      toast({
        title: 'Reunião agendada',
        description: 'A reunião foi agendada com sucesso',
      });

      onOpenChange(false);
      setSelectedDate(undefined);
      setSelectedSlot(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao agendar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Agendar Reunião</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Calendário */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Selecione a Data</h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedSlot(null);
                }}
                locale={ptBR}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="pointer-events-auto border rounded-lg"
              />
            </div>
          </div>

          {/* Lista de horários disponíveis */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">
                Horários Disponíveis
                {selectedDate && ` - ${format(selectedDate, 'PPP', { locale: ptBR })}`}
              </h3>
              
              {!selectedDate && (
                <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Selecione uma data para ver os horários disponíveis
                  </p>
                </div>
              )}

              {selectedDate && isLoadingSlots && (
                <div className="flex items-center justify-center h-64 border rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {selectedDate && !isLoadingSlots && (
                <ScrollArea className="h-[400px] border rounded-lg p-4">
                  {availableSlots && availableSlots.length > 0 ? (
                    <div className="space-y-2">
                      {availableSlots.map((slot) => {
                        const startTime = parse(slot.time, 'HH:mm:ss', new Date());
                        const endTime = addMinutes(startTime, slot.duration);
                        
                        return (
                          <Button
                            key={slot.id}
                            variant={selectedSlot?.id === slot.id ? 'default' : 'outline'}
                            className="w-full justify-between"
                            onClick={() => setSelectedSlot(slot)}
                          >
                            <span className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {slot.duration} min
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Nenhum horário disponível para esta data
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tente selecionar outra data ou configure novos horários
                      </p>
                    </div>
                  )}
                </ScrollArea>
              )}
            </div>

            {selectedSlot && (
              <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-5 w-5 text-primary" />
                  <span className="font-medium">Horário selecionado</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate!, 'PPP', { locale: ptBR })} às{' '}
                  {format(parse(selectedSlot.time, 'HH:mm:ss', new Date()), 'HH:mm')}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => scheduleMeetingMutation.mutate()}
            disabled={!selectedSlot || scheduleMeetingMutation.isPending}
          >
            {scheduleMeetingMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Agendar Reunião
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
