import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LeadFiltersProps {
  stages: string[];
  onStagesChange: (stages: string[]) => void;
  necessidades: string[];
  onNecessidadesChange: (necessidades: string[]) => void;
  scoreRange: [number, number];
  onScoreRangeChange: (range: [number, number]) => void;
  dateRange: { from?: Date; to?: Date };
  onDateRangeChange: (range: { from?: Date; to?: Date }) => void;
  onClear: () => void;
}

const allStages = [
  'Novo',
  'Apresentação Enviada',
  'Segundo Contato',
  'Reunião Agendada',
  'Proposta Enviada',
  'Fechado',
  'Cancelado',
];

const allNecessidades = [
  'Websites',
  'Sistemas e Aplicativos',
  'Gestão de Redes Sociais',
  'Identidade Visual',
];

export const LeadFilters = ({
  stages,
  onStagesChange,
  necessidades,
  onNecessidadesChange,
  scoreRange,
  onScoreRangeChange,
  dateRange,
  onDateRangeChange,
  onClear,
}: LeadFiltersProps) => {
  const handleStageToggle = (stage: string) => {
    if (stages.includes(stage)) {
      onStagesChange(stages.filter(s => s !== stage));
    } else {
      onStagesChange([...stages, stage]);
    }
  };

  const handleNecessidadeToggle = (necessidade: string) => {
    if (necessidades.includes(necessidade)) {
      onNecessidadesChange(necessidades.filter(n => n !== necessidade));
    } else {
      onNecessidadesChange([...necessidades, necessidade]);
    }
  };

  return (
    <Card className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filtros</h3>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      </div>

      {/* Stage Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Stage</Label>
        <div className="space-y-2">
          {allStages.map(stage => (
            <div key={stage} className="flex items-center space-x-2">
              <Checkbox
                id={`stage-${stage}`}
                checked={stages.includes(stage)}
                onCheckedChange={() => handleStageToggle(stage)}
              />
              <label
                htmlFor={`stage-${stage}`}
                className="text-sm cursor-pointer"
              >
                {stage}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Necessidade Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Necessidade</Label>
        <div className="space-y-2">
          {allNecessidades.map(necessidade => (
            <div key={necessidade} className="flex items-center space-x-2">
              <Checkbox
                id={`need-${necessidade}`}
                checked={necessidades.includes(necessidade)}
                onCheckedChange={() => handleNecessidadeToggle(necessidade)}
              />
              <label
                htmlFor={`need-${necessidade}`}
                className="text-sm cursor-pointer"
              >
                {necessidade}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Score Range */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Score BANT: {scoreRange[0]} - {scoreRange[1]}
        </Label>
        <Slider
          min={0}
          max={100}
          step={5}
          value={scoreRange}
          onValueChange={(value) => onScoreRangeChange(value as [number, number])}
          className="w-full"
        />
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Data de Criação</Label>
        <div className="flex flex-col gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                ) : (
                  <span>Data início</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(date) => onDateRangeChange({ ...dateRange, from: date })}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.to ? (
                  format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })
                ) : (
                  <span>Data fim</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(date) => onDateRangeChange({ ...dateRange, to: date })}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </Card>
  );
};
