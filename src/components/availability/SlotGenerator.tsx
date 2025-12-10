import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAvailabilityTemplates } from '@/lib/hooks/useAvailabilityTemplates';
import { Loader2, Wand2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface SlotGeneratorProps {
  templateId: string;
}

export const SlotGenerator = ({ templateId }: SlotGeneratorProps) => {
  const { generateSlots } = useAvailabilityTemplates();
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));

  const handleGenerate = async () => {
    await generateSlots.mutateAsync({
      templateId,
      startDate,
      endDate,
    });
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-primary/10 text-primary rounded-lg text-sm">
        ℹ️ Os slots serão gerados baseado nos horários configurados na aba "Horários", respeitando as exceções cadastradas.
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-date">Data Inicial</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end-date">Data Final</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
          />
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={generateSlots.isPending || !startDate || !endDate}
        className="w-full"
      >
        {generateSlots.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <Wand2 className="mr-2 h-4 w-4" />
        Gerar Slots
      </Button>

      {generateSlots.isSuccess && (
        <div className="p-3 bg-primary/10 text-primary rounded-lg text-sm">
          Slots gerados com sucesso! Verifique o calendário para visualizá-los.
        </div>
      )}
    </div>
  );
};
