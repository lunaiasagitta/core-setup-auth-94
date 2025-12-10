import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAvailabilityExceptions } from '@/lib/hooks/useAvailabilityExceptions';
import { Calendar, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ExceptionManager = () => {
  const { exceptions, createException, deleteException } = useAvailabilityExceptions();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    type: 'unavailable' as 'unavailable' | 'custom_hours',
    reason: '',
    custom_start_time: '09:00',
    custom_end_time: '18:00',
    slot_duration: 30,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const exceptionData: any = {
      date: formData.date,
      type: formData.type,
      reason: formData.reason,
    };

    if (formData.type === 'custom_hours') {
      exceptionData.custom_start_time = formData.custom_start_time;
      exceptionData.custom_end_time = formData.custom_end_time;
      exceptionData.slot_duration = formData.slot_duration;
    }

    await createException.mutateAsync(exceptionData);
    setShowForm(false);
    setFormData({
      date: '',
      type: 'unavailable',
      reason: '',
      custom_start_time: '09:00',
      custom_end_time: '18:00',
      slot_duration: 30,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Exceções e Horários Especiais</h3>
          <p className="text-sm text-muted-foreground">
            Adicione feriados ou horários especiais que substituem as regras padrão
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Exceção
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unavailable">Indisponível</SelectItem>
                <SelectItem value="custom_hours">Horário Customizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Ex: Feriado Nacional, Evento Especial"
            />
          </div>

          {formData.type === 'custom_hours' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Início</Label>
                  <Input
                    id="start"
                    type="time"
                    value={formData.custom_start_time}
                    onChange={(e) => setFormData({ ...formData, custom_start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Fim</Label>
                  <Input
                    id="end"
                    type="time"
                    value={formData.custom_end_time}
                    onChange={(e) => setFormData({ ...formData, custom_end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duração do Slot (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  max={180}
                  step={15}
                  value={formData.slot_duration}
                  onChange={(e) => setFormData({ ...formData, slot_duration: parseInt(e.target.value) })}
                />
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={createException.isPending}>
              Criar Exceção
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {exceptions.length === 0 && (
          <div className="p-6 bg-muted/50 rounded-lg text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma exceção cadastrada. Adicione feriados ou horários especiais conforme necessário.
            </p>
          </div>
        )}

        {exceptions.map((exception) => (
          <div
            key={exception.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {format(new Date(exception.date + 'T00:00:00'), 'PPP', { locale: ptBR })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {exception.type === 'unavailable' ? 'Indisponível' : 
                   `${exception.custom_start_time} - ${exception.custom_end_time}`}
                  {exception.reason && ` • ${exception.reason}`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteException.mutate(exception.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
