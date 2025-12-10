import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type BantField = 'budget' | 'authority' | 'need' | 'timeline';
type Confidence = 'high' | 'medium' | 'low';
type Urgency = 'alta' | 'media' | 'baixa';

interface EditBantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  currentBant: any;
}

export const EditBantModal = ({ open, onOpenChange, leadId, currentBant }: EditBantModalProps) => {
  const [field, setField] = useState<BantField>('budget');
  const [value, setValue] = useState('');
  const [confidence, setConfidence] = useState<Confidence>('medium');
  const [urgency, setUrgency] = useState<Urgency>('media');
  const queryClient = useQueryClient();

  const updateBantMutation = useMutation({
    mutationFn: async () => {
      const updatedBant = {
        ...currentBant,
        [field]: {
          value,
          confidence,
          ...(field === 'need' && { urgency }),
          updated_at: new Date().toISOString(),
        },
      };

      // Recalcular score BANT
      const score = calculateBantScore(updatedBant);

      const { error } = await supabase
        .from('leads')
        .update({
          bant_details: updatedBant,
          score_bant: score,
        })
        .eq('id', leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      toast({
        title: 'BANT atualizado',
        description: 'As informações foram atualizadas com sucesso.',
      });
      onOpenChange(false);
      setValue('');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar BANT',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const calculateBantScore = (bant: any) => {
    let score = 0;
    const fields = ['budget', 'authority', 'need', 'timeline'];
    
    fields.forEach(field => {
      if (bant[field]?.value) {
        const confidenceScore = {
          high: 25,
          medium: 15,
          low: 10,
        }[bant[field].confidence] || 0;
        
        score += confidenceScore;
      }
    });

    return score;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Qualificação BANT</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Campo</Label>
            <Select value={field} onValueChange={(v) => setField(v as BantField)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="budget">Budget (Orçamento)</SelectItem>
                <SelectItem value="authority">Authority (Autoridade)</SelectItem>
                <SelectItem value="need">Need (Necessidade)</SelectItem>
                <SelectItem value="timeline">Timeline (Prazo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor</Label>
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Descreva o que você descobriu..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Nível de Confiança</Label>
            <Select value={confidence} onValueChange={(v) => setConfidence(v as Confidence)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">⭐⭐⭐ Alta</SelectItem>
                <SelectItem value="medium">⭐⭐ Média</SelectItem>
                <SelectItem value="low">⭐ Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {field === 'need' && (
            <div className="space-y-2">
              <Label>Urgência</Label>
              <Select value={urgency} onValueChange={(v) => setUrgency(v as Urgency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">🔴 Alta</SelectItem>
                  <SelectItem value="media">🟡 Média</SelectItem>
                  <SelectItem value="baixa">🟢 Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => updateBantMutation.mutate()} disabled={!value || updateBantMutation.isPending}>
            {updateBantMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};