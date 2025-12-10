import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMergeLead } from '@/lib/hooks/useDuplicateDetection';
import { decideMergeStrategy } from '@/lib/utils/mergeStrategy';
import { Lead, MERGE_RULES } from '@/lib/types/merge';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MergeLeadsModalProps {
  masterLeadId: string;
  duplicateLeadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MergeLeadsModal = ({
  masterLeadId,
  duplicateLeadId,
  open,
  onOpenChange
}: MergeLeadsModalProps) => {
  const [leadA, setLeadA] = useState<Lead | null>(null);
  const [leadB, setLeadB] = useState<Lead | null>(null);
  const [mergeDecisions, setMergeDecisions] = useState<Record<string, 'A' | 'B'>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isMerging, setIsMerging] = useState(false);
  
  const { mergeLead } = useMergeLead();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const fetchLeads = async () => {
      setIsLoading(true);
      try {
        const [{ data: dataA }, { data: dataB }] = await Promise.all([
          supabase.from('leads').select('*').eq('id', masterLeadId).single(),
          supabase.from('leads').select('*').eq('id', duplicateLeadId).single()
        ]);
        
        if (dataA && dataB) {
          setLeadA(dataA);
          setLeadB(dataB);
          
          // Calcular decisões automáticas
          const autoMerge = decideMergeStrategy(dataA, dataB);
          const initialDecisions: Record<string, 'A' | 'B'> = {};
          
          autoMerge.mergeLog.forEach(decision => {
            if (decision.chosen === 'A' || decision.chosen === 'B') {
              initialDecisions[decision.field] = decision.chosen;
            }
          });
          
          setMergeDecisions(initialDecisions);
        }
      } catch (error) {
        console.error('Erro ao carregar leads:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados dos leads.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (open) {
      fetchLeads();
    }
  }, [masterLeadId, duplicateLeadId, open]);
  
  const handleMerge = async () => {
    if (!leadA || !leadB) return;
    
    setIsMerging(true);
    try {
      // Construir objeto mesclado baseado nas decisões
      const mergedData: any = { id: masterLeadId };
      const mergeLog: any[] = [];
      
      Object.keys(MERGE_RULES).forEach(field => {
        const chosen = mergeDecisions[field] || 'A';
        const sourceLead = chosen === 'A' ? leadA : leadB;
        mergedData[field] = sourceLead[field as keyof Lead];
        
        mergeLog.push({
          field,
          chosen,
          valueA: leadA[field as keyof Lead],
          valueB: leadB[field as keyof Lead],
          reason: `Escolhido manualmente: ${chosen}`
        });
      });
      
      await mergeLead(
        masterLeadId,
        duplicateLeadId,
        mergedData,
        mergeLog,
        'manual'
      );
      
      toast({
        title: '✅ Leads mesclados com sucesso!',
        description: 'Os dados foram unificados e o lead duplicado foi removido.'
      });
      
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', masterLeadId] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-detection'] });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao mesclar leads:', error);
      toast({
        title: 'Erro ao mesclar',
        description: 'Não foi possível mesclar os leads. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsMerging(false);
    }
  };
  
  const formatValue = (value: any, field: string): string => {
    if (!value) return '-';
    
    if (field === 'created_at' || field === 'updated_at') {
      return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    
    return String(value);
  };
  
  const fieldsToCompare = [
    'nome',
    'telefone',
    'email',
    'empresa',
    'necessidade',
    'stage',
    'score_bant'
  ];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mesclar Leads Duplicados</DialogTitle>
          <DialogDescription>
            Escolha os dados que deseja manter para cada campo. O lead da esquerda (A) será mantido e o lead da direita (B) será removido.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-6 py-4">
              {/* Lead A */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Lead A (Manter)</Badge>
                  <span className="text-sm text-muted-foreground">ID: {masterLeadId.slice(0, 8)}...</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Criado em: {leadA && format(new Date(leadA.created_at!), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
              
              <ArrowRight className="h-6 w-6 self-center text-muted-foreground" />
              
              {/* Lead B */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Lead B (Remover)</Badge>
                  <span className="text-sm text-muted-foreground">ID: {duplicateLeadId.slice(0, 8)}...</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Criado em: {leadB && format(new Date(leadB.created_at!), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h4 className="font-medium">Escolha os dados que deseja manter:</h4>
              
              {fieldsToCompare.map((field) => {
                const valueA = leadA?.[field as keyof Lead];
                const valueB = leadB?.[field as keyof Lead];
                
                // Se ambos valores são iguais, não mostrar opção
                if (valueA === valueB) return null;
                
                return (
                  <div key={field} className="grid grid-cols-[120px_1fr] gap-4 items-start">
                    <Label className="pt-2 font-medium capitalize">
                      {field.replace('_', ' ')}:
                    </Label>
                    
                    <RadioGroup
                      value={mergeDecisions[field] || 'A'}
                      onValueChange={(value: 'A' | 'B') =>
                        setMergeDecisions((prev) => ({ ...prev, [field]: value }))
                      }
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2 p-2 rounded border hover:bg-accent">
                        <RadioGroupItem value="A" id={`${field}-a`} />
                        <Label htmlFor={`${field}-a`} className="flex-1 cursor-pointer">
                          {formatValue(valueA, field)}
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 p-2 rounded border hover:bg-accent">
                        <RadioGroupItem value="B" id={`${field}-b`} />
                        <Label htmlFor={`${field}-b`} className="flex-1 cursor-pointer">
                          {formatValue(valueB, field)}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                );
              })}
            </div>
          </>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMerging}>
            Cancelar
          </Button>
          <Button onClick={handleMerge} disabled={isLoading || isMerging}>
            {isMerging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
