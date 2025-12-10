import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SendMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadPhone: string;
}

export const SendMessageModal = ({ open, onOpenChange, leadId, leadPhone }: SendMessageModalProps) => {
  const [message, setMessage] = useState('');
  const [sender, setSender] = useState<'luna' | 'samuel'>('luna');
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      // 1. Buscar ou criar conversa
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .limit(1);

      let conversationId = conversations?.[0]?.id;

      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            lead_id: leadId,
            session_id: leadPhone,
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // 2. Inserir mensagem
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: sender === 'luna' ? 'assistant' : 'user',
          content: message,
        });

      if (msgError) throw msgError;

      // 3. Registrar atividade
      await supabase.from('activity_log').insert({
        lead_id: leadId,
        event_type: 'message_sent',
        details: {
          sender,
          message: message.substring(0, 100),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', leadId] });
      queryClient.invalidateQueries({ queryKey: ['activities', leadId] });
      toast({
        title: 'Mensagem enviada',
        description: 'A mensagem foi registrada no histórico.',
      });
      onOpenChange(false);
      setMessage('');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Enviar Mensagem Manual</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Enviar como</Label>
            <RadioGroup value={sender} onValueChange={(v) => setSender(v as 'luna' | 'samuel')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="luna" id="luna" />
                <Label htmlFor="luna" className="font-normal cursor-pointer">
                  Luna (Agente IA)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="samuel" id="samuel" />
                <Label htmlFor="samuel" className="font-normal cursor-pointer">
                  Samuel (Humano)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => sendMessageMutation.mutate()} disabled={!message || sendMessageMutation.isPending}>
            {sendMessageMutation.isPending ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};