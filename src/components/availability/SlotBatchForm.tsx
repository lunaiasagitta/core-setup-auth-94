import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useSlotBatches, CreateSlotBatchParams } from '@/lib/hooks/useSlotBatches';
import { ArrowLeft, ArrowRight, Calendar, Clock, Wand2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

interface SlotBatchFormProps {
  onSuccess?: () => void;
}

export const SlotBatchForm = ({ onSuccess }: SlotBatchFormProps) => {
  const [step, setStep] = useState(1);
  const { register, handleSubmit, watch, setValue } = useForm<CreateSlotBatchParams>({
    defaultValues: {
      slot_duration: 30,
      gap_minutes: 0,
      days_of_week: [],
    },
  });
  const { createBatch } = useSlotBatches();

  const formValues = watch();

  const onSubmit = async (data: CreateSlotBatchParams) => {
    await createBatch.mutateAsync(data);
    onSuccess?.();
  };

  const calculatePreview = () => {
    if (!formValues.start_date || !formValues.end_date || !formValues.days_of_week?.length) {
      return null;
    }

    const start = new Date(formValues.start_date);
    const end = new Date(formValues.end_date);
    const totalDays = differenceInDays(end, start) + 1;

    // Contar quantos dias da semana selecionados existem no período
    let selectedWeekDays = 0;
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dayOfWeek = currentDate.getDay();
      if (formValues.days_of_week.includes(dayOfWeek)) {
        selectedWeekDays++;
      }
    }

    // Calcular slots por dia
    if (!formValues.start_time || !formValues.end_time) return null;

    const [startHour, startMin] = formValues.start_time.split(':').map(Number);
    const [endHour, endMin] = formValues.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const totalMinutes = endMinutes - startMinutes;

    const slotDuration = formValues.slot_duration || 30;
    const gapMinutes = formValues.gap_minutes || 0;
    const slotsPerDay = Math.floor(totalMinutes / (slotDuration + gapMinutes));

    const totalSlots = selectedWeekDays * slotsPerDay;

    return {
      totalSlots,
      selectedWeekDays,
      slotsPerDay,
    };
  };

  const preview = calculatePreview();

  const toggleDay = (day: number) => {
    const current = formValues.days_of_week || [];
    const newDays = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    setValue('days_of_week', newDays);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Passo 1: Informações Básicas
            </CardTitle>
            <CardDescription>Dê um nome para identificar este lote de slots</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Lote *</Label>
              <Input
                id="name"
                placeholder="Ex: Reuniões de Alinhamento"
                {...register('name', { required: true })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Passo 2: Período e Dias
            </CardTitle>
            <CardDescription>Selecione o período e os dias da semana</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Data Início *</Label>
                <Input id="start_date" type="date" {...register('start_date', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Data Fim *</Label>
                <Input id="end_date" type="date" {...register('end_date', { required: true })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dias da Semana *</Label>
              <div className="grid grid-cols-2 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={formValues.days_of_week?.includes(day.value)}
                      onCheckedChange={() => toggleDay(day.value)}
                    />
                    <Label htmlFor={`day-${day.value}`} className="cursor-pointer">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Passo 3: Horários e Duração
            </CardTitle>
            <CardDescription>Configure os horários e duração dos slots</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Horário Início *</Label>
                <Input id="start_time" type="time" {...register('start_time', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">Horário Fim *</Label>
                <Input id="end_time" type="time" {...register('end_time', { required: true })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slot_duration">Duração do Slot (min) *</Label>
                <Input
                  id="slot_duration"
                  type="number"
                  min="5"
                  step="5"
                  {...register('slot_duration', { required: true, valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gap_minutes">Intervalo entre Slots (min)</Label>
                <Input
                  id="gap_minutes"
                  type="number"
                  min="0"
                  step="5"
                  {...register('gap_minutes', { valueAsNumber: true })}
                />
              </div>
            </div>

            {preview && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Preview:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {preview.selectedWeekDays} dias no período</li>
                  <li>• {preview.slotsPerDay} slots por dia</li>
                  <li className="font-semibold text-foreground">
                    • Total: ~{preview.totalSlots} slots serão criados
                  </li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        {step > 1 && (
          <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        )}
        <div className="flex-1" />
        {step < 3 ? (
          <Button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={
              (step === 1 && !formValues.name) ||
              (step === 2 &&
                (!formValues.start_date ||
                  !formValues.end_date ||
                  !formValues.days_of_week?.length))
            }
          >
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button type="submit" disabled={createBatch.isPending}>
            {createBatch.isPending ? 'Criando...' : 'Criar Slots'}
          </Button>
        )}
      </div>
    </form>
  );
};
