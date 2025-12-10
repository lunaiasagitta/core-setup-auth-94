import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useSlotBatches } from '@/lib/hooks/useSlotBatches';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EditSlotBatchModal } from './EditSlotBatchModal';

const DAYS_MAP: { [key: number]: string } = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

export const SlotBatchList = () => {
  const { batches, isLoading, deleteBatch, toggleBatchActive } = useSlotBatches();
  const [editingBatch, setEditingBatch] = useState<any>(null);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Nenhum lote de slots criado ainda. Crie seu primeiro lote acima!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {batches.map((batch) => (
        <Card key={batch.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  {batch.name}
                  <Badge variant={batch.active ? 'default' : 'secondary'}>
                    {batch.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Criado em {format(new Date(batch.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={batch.active}
                  onCheckedChange={(checked) =>
                    toggleBatchActive.mutate({ batchId: batch.id, active: checked })
                  }
                  disabled={toggleBatchActive.isPending}
                />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingBatch(batch)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deletar Lote de Slots?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Todos os slots deste lote serão deletados permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteBatch.mutate(batch.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Deletar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(batch.start_date), 'dd/MM/yyyy')} -{' '}
                  {format(new Date(batch.end_date), 'dd/MM/yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {batch.start_time} - {batch.end_time}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Dias: </span>
                {batch.days_of_week
                  .sort((a, b) => a - b)
                  .map((day) => DAYS_MAP[day])
                  .join(', ')}
              </div>
              <div>
                <span className="text-muted-foreground">Duração: </span>
                {batch.slot_duration}min
              </div>
              <div>
                <span className="text-muted-foreground">Intervalo: </span>
                {batch.gap_minutes}min
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {editingBatch && (
        <EditSlotBatchModal
          open={!!editingBatch}
          onOpenChange={(open) => !open && setEditingBatch(null)}
          batch={editingBatch}
        />
      )}
    </div>
  );
};
