import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useMeetings } from '@/lib/hooks/useMeetings';
import { Loader2 } from 'lucide-react';

interface CancelMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: any;
}

export const CancelMeetingDialog = ({ open, onOpenChange, meeting }: CancelMeetingDialogProps) => {
  const [reason, setReason] = useState('');
  const [notifyLead, setNotifyLead] = useState(true);
  const { updateMeetingStatus } = useMeetings();

  const handleCancel = async () => {
    if (!meeting) return;

    updateMeetingStatus.mutate(
      { id: meeting.id, status: 'cancelled' },
      {
        onSuccess: () => {
          onOpenChange(false);
          setReason('');
          setNotifyLead(true);
        },
      }
    );
  };

  if (!meeting) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar Reunião</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja cancelar esta reunião?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do cancelamento (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Digite o motivo do cancelamento..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify"
              checked={notifyLead}
              onCheckedChange={(checked) => setNotifyLead(checked as boolean)}
            />
            <Label htmlFor="notify">Notificar o lead sobre o cancelamento</Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={updateMeetingStatus.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {updateMeetingStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancelar Reunião
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
