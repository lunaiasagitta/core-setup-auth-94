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

interface SetupWatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export const SetupWatchDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: SetupWatchDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Configurar Google Calendar Watch</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Isso configurará um watch channel com o Google Calendar para receber
              notificações automáticas de mudanças.
            </p>
            <p className="font-semibold">
              O watch channel tem validade de 7 dias e será renovado automaticamente.
            </p>
            <p className="text-sm text-muted-foreground">
              Após a configuração, qualquer evento criado, editado ou deletado no
              Google Calendar será automaticamente sincronizado com o sistema.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Configurando...' : 'Configurar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
