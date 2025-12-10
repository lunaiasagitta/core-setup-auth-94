import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTemplateRules } from '@/lib/hooks/useTemplateRules';
import { Trash2, Plus } from 'lucide-react';

interface WeeklyScheduleProps {
  templateId: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

export const WeeklySchedule = ({ templateId }: WeeklyScheduleProps) => {
  const { rules, createRule, updateRule, deleteRule } = useTemplateRules(templateId);
  const [editingRules, setEditingRules] = useState<Record<number, any>>({});

  const getRuleForDay = (dayOfWeek: number) => {
    return rules.find(r => r.day_of_week === dayOfWeek);
  };

  const handleToggleDay = async (dayOfWeek: number, enabled: boolean) => {
    const existingRule = getRuleForDay(dayOfWeek);

    if (enabled && !existingRule) {
      await createRule.mutateAsync({
        template_id: templateId,
        day_of_week: dayOfWeek,
        start_time: '09:00:00',
        end_time: '18:00:00',
        slot_duration: 30,
        buffer_minutes: 0,
        priority: 0,
      });
    } else if (!enabled && existingRule) {
      await deleteRule.mutateAsync(existingRule.id);
    }
  };

  const handleUpdateRule = async (ruleId: string, field: string, value: any) => {
    await updateRule.mutateAsync({
      id: ruleId,
      updates: { [field]: value },
    });
  };

  return (
    <div className="space-y-4">
      {rules.length === 0 && (
        <div className="p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
          Configure pelo menos um dia da semana para começar a gerar slots automaticamente
        </div>
      )}
      
      {DAYS_OF_WEEK.map(day => {
        const rule = getRuleForDay(day.value);
        const isEnabled = !!rule;

        return (
          <div key={day.value} className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2 w-32">
              <Checkbox
                checked={isEnabled}
                onCheckedChange={(checked) => handleToggleDay(day.value, checked as boolean)}
              />
              <Label className="font-medium">{day.label}</Label>
            </div>

            {isEnabled && rule && (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={rule.start_time}
                    onChange={(e) => handleUpdateRule(rule.id, 'start_time', e.target.value)}
                    className="w-32"
                  />
                  <span>-</span>
                  <Input
                    type="time"
                    value={rule.end_time}
                    onChange={(e) => handleUpdateRule(rule.id, 'end_time', e.target.value)}
                    className="w-32"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={15}
                    max={180}
                    step={15}
                    value={rule.slot_duration}
                    onChange={(e) => handleUpdateRule(rule.id, 'slot_duration', parseInt(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Buffer:</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    step={5}
                    value={rule.buffer_minutes}
                    onChange={(e) => handleUpdateRule(rule.id, 'buffer_minutes', parseInt(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteRule.mutate(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}

            {isEnabled && !rule && (
              <span className="text-sm text-muted-foreground">Carregando...</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
