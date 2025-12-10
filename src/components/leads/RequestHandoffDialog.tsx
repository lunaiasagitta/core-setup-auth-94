import { useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RequestHandoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
}

export const RequestHandoffDialog = ({ open, onOpenChange, leadId }: RequestHandoffDialogProps) => {
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState<'alta' | 'media' | 'baixa'>('media');
  const queryClient = useQueryClient();

  const requestHandoffMutation = useMutation({
    mutationFn: async () => {
      // 1. Atualizar conversa com flag de handoff
      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .limit(1)
        .single();

      if (conversation) {
        const currentState = (conversation.state as Record<string, any>) || {};
        await supabase
          .from('conversations')
          .update({
            state: {
              ...currentState,
              handoff_requested: true,
              handoff_reason: reason,
              handoff_urgency: urgency,
              handoff_at: new Date().toISOString(),
            },
          })
          .eq('id', conversation.id);
      }

      // 2. Registrar atividade
      await supabase.from('activity_log').insert({
        lead_id: leadId,
        event_type: 'handoff_requested',
        details: {
          reason,
          urgency,
        },
      });

      // 3. Criar notificação para Samuel
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'handoff_requested',
          title: '🚨 Handoff solicitado',
          description: `Motivo: ${reason}`,
          link: `/leads/${leadId}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', leadId] });
      queryClient.invalidateQueries({ queryKey: ['activities', leadId] });
      toast({
        title: 'Handoff solicitado',
        description: 'Samuel foi notificado e entrará em contato em breve.',
      });
      onOpenChange(false);
      setReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao solicitar handoff',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Solicitar Handoff para Samuel</AlertDialogTitle>
        </AlertDialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Por que este lead precisa de atenção humana?"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Urgência</Label>
            <Select value={urgency} onValueChange={(v) => setUrgency(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">🔴 Alta - Responder imediatamente</SelectItem>
                <SelectItem value="media">🟡 Média - Responder hoje</SelectItem>
                <SelectItem value="baixa">🟢 Baixa - Quando possível</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => requestHandoffMutation.mutate()}
            disabled={!reason || requestHandoffMutation.isPending}
          >
            {requestHandoffMutation.isPending ? 'Solicitando...' : 'Solicitar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};