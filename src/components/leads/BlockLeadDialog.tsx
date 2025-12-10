import { useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface BlockLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadPhone: string;
}

export const BlockLeadDialog = ({ open, onOpenChange, leadId, leadPhone }: BlockLeadDialogProps) => {
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const blockLeadMutation = useMutation({
    mutationFn: async () => {
      // 1. Inserir em blocked_numbers
      const { error: blockError } = await supabase
        .from('blocked_numbers')
        .insert({
          telefone: leadPhone,
          motivo: reason,
        });

      if (blockError) throw blockError;

      // 2. Atualizar lead
      await supabase
        .from('leads')
        .update({ stage: 'Cancelado' })
        .eq('id', leadId);

      // 3. Registrar atividade
      await supabase.from('activity_log').insert({
        lead_id: leadId,
        event_type: 'lead_blocked',
        details: {
          reason,
          phone: leadPhone,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Lead bloqueado',
        description: 'Este número foi bloqueado e não receberá mais mensagens.',
      });
      onOpenChange(false);
      navigate('/leads');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao bloquear lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bloquear Lead</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação bloqueará o número {leadPhone} permanentemente. O lead não receberá mais mensagens automáticas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-2 py-4">
          <Label>Motivo do bloqueio</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva o motivo do bloqueio..."
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => blockLeadMutation.mutate()}
            disabled={!reason || blockLeadMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {blockLeadMutation.isPending ? 'Bloqueando...' : 'Confirmar Bloqueio'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};