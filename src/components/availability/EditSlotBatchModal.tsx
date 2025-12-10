import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { useSlotBatches, SlotBatch, CreateSlotBatchParams } from '@/lib/hooks/useSlotBatches';
import { CalendarDays, Clock } from 'lucide-react';

interface EditSlotBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: SlotBatch;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

export const EditSlotBatchModal = ({ open, onOpenChange, batch }: EditSlotBatchModalProps) => {
  const { updateBatch } = useSlotBatches();
  const [selectedDays, setSelectedDays] = useState<number[]>(batch.days_of_week);

  const { register, handleSubmit, watch, setValue } = useForm<CreateSlotBatchParams>({
    defaultValues: {
      name: batch.name,
      start_date: batch.start_date,
      end_date: batch.end_date,
      days_of_week: batch.days_of_week,
      start_time: batch.start_time,
      end_time: batch.end_time,
      slot_duration: batch.slot_duration,
      gap_minutes: batch.gap_minutes,
    },
  });

  useEffect(() => {
    setValue('days_of_week', selectedDays);
  }, [selectedDays, setValue]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const onSubmit = (data: CreateSlotBatchParams) => {
    updateBatch.mutate(
      { batchId: batch.id, params: data },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lote: {batch.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Lote</Label>
            <Input
              id="name"
              {...register('name', { required: true })}
              placeholder="Ex: Reuniões de Alinhamento"
            />
          </div>

          {/* Período */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data Inicial</Label>
              <Input id="start_date" type="date" {...register('start_date', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Data Final</Label>
              <Input id="end_date" type="date" {...register('end_date', { required: true })} />
            </div>
          </div>

          {/* Dias da Semana */}
          <div className="space-y-2">
            <Label>Dias da Semana</Label>
            <div className="flex gap-2 flex-wrap">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                    {day.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Horários */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Hora Inicial</Label>
              <Input
                id="start_time"
                type="time"
                {...register('start_time', { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Hora Final</Label>
              <Input id="end_time" type="time" {...register('end_time', { required: true })} />
            </div>
          </div>

          {/* Duração e Gap */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slot_duration">Duração do Slot (min)</Label>
              <Input
                id="slot_duration"
                type="number"
                min="15"
                step="15"
                {...register('slot_duration', { required: true, valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gap_minutes">Intervalo entre slots (min)</Label>
              <Input
                id="gap_minutes"
                type="number"
                min="0"
                step="5"
                {...register('gap_minutes', { required: true, valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Preview */}
          <Card className="bg-muted">
            <CardContent className="pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Período:</span>
                  <span>
                    {watch('start_date')} até {watch('end_date')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Horários:</span>
                  <span>
                    {watch('start_time')} - {watch('end_time')}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs mt-2">
                  ⚠️ Os slots antigos serão deletados e novos serão criados com as novas
                  configurações.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateBatch.isPending || selectedDays.length === 0}>
              {updateBatch.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
