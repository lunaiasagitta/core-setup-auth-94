import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar, Clock, Ban, CalendarOff, UserPlus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ManageSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: {
    id: string;
    date: string;
    time: string;
    duration: number;
    available: boolean;
    reserved_by?: string;
  };
  onScheduleMeeting?: () => void;
}

export const ManageSlotModal = ({ open, onOpenChange, slot, onScheduleMeeting }: ManageSlotModalProps) => {
  const queryClient = useQueryClient();

  const deactivateSlot = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase
        .from('calendar_slots')
        .update({ available: false })
        .eq('id', slotId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast.success('Slot desativado com sucesso');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Erro ao desativar slot');
    },
  });

  const deactivateDay = useMutation({
    mutationFn: async (date: string) => {
      const { error } = await supabase
        .from('calendar_slots')
        .update({ available: false })
        .eq('date', date);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast.success('Todos os slots do dia foram desativados');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Erro ao desativar slots do dia');
    },
  });

  const deactivateTime = useMutation({
    mutationFn: async ({ date, time }: { date: string; time: string }) => {
      const { error } = await supabase
        .from('calendar_slots')
        .update({ available: false })
        .eq('time', time);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast.success('Todos os slots deste horário foram desativados');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Erro ao desativar slots do horário');
    },
  });

  const slotDate = new Date(slot.date + 'T00:00:00');
  const formattedDate = format(slotDate, "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Slot</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Slot */}
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium capitalize">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{slot.time.substring(0, 5)}</span>
              <Badge variant={slot.available ? 'default' : 'secondary'}>
                {slot.available ? 'Disponível' : 'Desativado'}
              </Badge>
            </div>
            {slot.reserved_by && (
              <Badge variant="outline" className="mt-2">
                Reservado
              </Badge>
            )}
          </div>

          {/* Ações */}
          {slot.available && !slot.reserved_by && (
            <div className="space-y-2">
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={() => {
                  onScheduleMeeting?.();
                  onOpenChange(false);
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Agendar Reunião
              </Button>

              <Separator className="my-2" />

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => deactivateSlot.mutate(slot.id)}
                disabled={deactivateSlot.isPending}
              >
                <Ban className="mr-2 h-4 w-4" />
                Desativar apenas este slot
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => deactivateDay.mutate(slot.date)}
                disabled={deactivateDay.isPending}
              >
                <CalendarOff className="mr-2 h-4 w-4" />
                Desativar todos os slots do dia {format(slotDate, 'dd/MM', { locale: ptBR })}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => deactivateTime.mutate({ date: slot.date, time: slot.time })}
                disabled={deactivateTime.isPending}
              >
                <Clock className="mr-2 h-4 w-4" />
                Desativar todos os slots às {slot.time.substring(0, 5)}
              </Button>
            </div>
          )}

          {slot.reserved_by && (
            <p className="text-sm text-muted-foreground text-center">
              ⚠️ Este slot está reservado e não pode ser desativado
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
