import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isBefore, startOfDay, endOfWeek, startOfWeek, addDays, addWeeks, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Trash2, Ban, Calendar, Filter, X, User, Check, Clock, CalendarDays, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SlotStatusBadge } from './SlotStatusBadge';
import { CreateMeetingModal } from './CreateMeetingModal';

type SlotStatus = 'available' | 'reserved' | 'unavailable' | 'expired';

export const SlotsListView = () => {
  const navigate = useNavigate();
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [schedulingSlot, setSchedulingSlot] = useState<any>(null);
  const [createMeetingOpen, setCreateMeetingOpen] = useState(false);
  const ITEMS_PER_PAGE = 50;
  const queryClient = useQueryClient();

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['all-slots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_slots')
        .select('*, reserved_by:leads(nome)')
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const deleteMultipleSlots = useMutation({
    mutationFn: async (slotIds: string[]) => {
      const { error } = await supabase
        .from('calendar_slots')
        .delete()
        .in('id', slotIds);
      if (error) throw error;
    },
    onSuccess: (_, slotIds) => {
      queryClient.invalidateQueries({ queryKey: ['all-slots'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast.success(`${slotIds.length} slot(s) deletado(s) com sucesso`);
      setSelectedSlots([]);
      setDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao deletar slots: ${error.message}`);
    },
  });

  const deactivateMultipleSlots = useMutation({
    mutationFn: async (slotIds: string[]) => {
      const { error } = await supabase
        .from('calendar_slots')
        .update({ available: false })
        .in('id', slotIds);
      if (error) throw error;
      return slotIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['all-slots'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast.success(`${count} slot(s) desativado(s) com sucesso!`);
      setSelectedSlots([]);
      setShowDeactivateDialog(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desativar slots: ${error.message}`);
    },
  });

  const activateSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase
        .from('calendar_slots')
        .update({ available: true })
        .eq('id', slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-slots'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast.success('Slot ativado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao ativar slot: ${error.message}`);
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase
        .from('calendar_slots')
        .delete()
        .eq('id', slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-slots'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast.success('Slot deletado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao deletar slot: ${error.message}`);
    },
  });

  const toggleSlot = (slotId: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
    );
  };

  const toggleAll = () => {
    if (selectedSlots.length === filteredSlots.length) {
      setSelectedSlots([]);
    } else {
      setSelectedSlots(filteredSlots.map((s) => s.id));
    }
  };

  const handleScheduleFromSlot = (slot: any) => {
    setSchedulingSlot(slot);
    setCreateMeetingOpen(true);
  };

  const handleDeactivateSlot = (slotId: string) => {
    deactivateMultipleSlots.mutate([slotId]);
  };

  const handleActivateSlot = (slotId: string) => {
    activateSlotMutation.mutate(slotId);
  };

  const handleDeleteSlot = (slotId: string) => {
    deleteSlotMutation.mutate(slotId);
  };

  const isInTimeRange = (slotDate: string, filter: string): boolean => {
    const now = new Date();
    const slot = new Date(slotDate);
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);

    switch (filter) {
      case 'today':
        return format(slot, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      case 'tomorrow':
        return format(slot, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd');
      case 'this_week':
        return slot >= startOfWeek(today, { locale: ptBR }) && slot <= endOfWeek(today, { locale: ptBR });
      case 'next_week':
        const nextWeekStart = addWeeks(startOfWeek(today, { locale: ptBR }), 1);
        const nextWeekEnd = endOfWeek(nextWeekStart, { locale: ptBR });
        return slot >= nextWeekStart && slot <= nextWeekEnd;
      case 'this_month':
        return slot >= startOfMonth(today) && slot <= endOfMonth(today);
      case 'next_month':
        const nextMonthStart = startOfMonth(addMonths(today, 1));
        const nextMonthEnd = endOfMonth(nextMonthStart);
        return slot >= nextMonthStart && slot <= nextMonthEnd;
      default:
        return true;
    }
  };

  const getSlotStatus = (slot: any): SlotStatus => {
    const slotDateTime = new Date(`${slot.date}T${slot.time}`);
    const isPast = isBefore(slotDateTime, new Date());

    if (isPast) return 'expired';
    if (!slot.available && slot.reserved_by) return 'reserved';
    if (!slot.available) return 'unavailable';
    return 'available';
  };

  const filteredSlots = slots.filter((slot) => {
    const slotStatus = getSlotStatus(slot);

    if (statusFilter !== 'all' && slotStatus !== statusFilter) {
      return false;
    }

    if (timeFilter !== 'all' && !isInTimeRange(slot.date, timeFilter)) {
      return false;
    }

    if (searchQuery) {
      const leadName = (slot.reserved_by as any)?.nome?.toLowerCase() || '';
      if (!leadName.includes(searchQuery.toLowerCase())) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredSlots.length / ITEMS_PER_PAGE);
  const paginatedSlots = filteredSlots.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const selectedReservedCount = selectedSlots.filter((id) =>
    slots.find((s) => s.id === id && s.reserved_by)
  ).length;

  const stats = {
    total: slots.length,
    available: slots.filter((s) => getSlotStatus(s) === 'available').length,
    reserved: slots.filter((s) => getSlotStatus(s) === 'reserved').length,
    today: slots.filter((s) => format(new Date(s.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length,
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando slots...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Disponíveis</p>
                <p className="text-2xl font-bold text-green-600">{stats.available}</p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reservados</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.reserved}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="available">✓ Disponível</SelectItem>
            <SelectItem value="reserved">⏱ Reservado</SelectItem>
            <SelectItem value="unavailable">🚫 Indisponível</SelectItem>
            <SelectItem value="expired">❌ Expirado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="tomorrow">Amanhã</SelectItem>
            <SelectItem value="this_week">Esta Semana</SelectItem>
            <SelectItem value="next_week">Próxima Semana</SelectItem>
            <SelectItem value="this_month">Este Mês</SelectItem>
            <SelectItem value="next_month">Próximo Mês</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Buscar por lead..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {(statusFilter !== 'all' || timeFilter !== 'all' || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setTimeFilter('all');
              setSearchQuery('');
              setCurrentPage(1);
            }}
          >
            <X className="mr-2 h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      {/* Barra de seleção */}
      {selectedSlots.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedSlots.length} slot(s) selecionado(s)
            {selectedReservedCount > 0 && (
              <span className="text-orange-600 ml-2">({selectedReservedCount} reservado(s))</span>
            )}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeactivateDialog(true)}
              disabled={selectedSlots.length === 0 || deactivateMultipleSlots.isPending}
            >
              <Ban className="h-4 w-4 mr-2" />
              Desativar
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Deletar
            </Button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedSlots.length === filteredSlots.length && filteredSlots.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reservado por</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSlots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum slot encontrado
                </TableCell>
              </TableRow>
            ) : (
              paginatedSlots.map((slot) => {
                const slotStatus = getSlotStatus(slot);
                return (
                  <TableRow key={slot.id}>
                    <TableCell>
                      <Checkbox checked={selectedSlots.includes(slot.id)} onCheckedChange={() => toggleSlot(slot.id)} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        className="p-0 h-auto font-normal hover:underline hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (slotStatus === 'available') {
                            handleScheduleFromSlot(slot);
                          } else {
                            toast.info('Este slot não está disponível');
                          }
                        }}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(slot.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </Button>
                    </TableCell>
                    <TableCell>{slot.time.substring(0, 5)}</TableCell>
                    <TableCell>{slot.duration} min</TableCell>
                    <TableCell>
                      <SlotStatusBadge status={slotStatus} />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const reservedBy = slot.reserved_by as any;
                        if (!reservedBy || typeof reservedBy !== 'object' || !reservedBy.nome) {
                          return <span className="text-muted-foreground">-</span>;
                        }
                        return (
                          <Button
                            variant="link"
                            className="p-0 h-auto font-normal text-blue-600 hover:text-blue-800"
                            onClick={(e) => {
                              e.stopPropagation();
                              const leadId = slot.reserved_by;
                              if (leadId) {
                                navigate(`/leads/${leadId}`);
                              }
                            }}
                          >
                            <User className="h-3 w-3 mr-1" />
                            {String(reservedBy.nome)}
                          </Button>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {slotStatus === 'available' ? (
                            <>
                              <DropdownMenuItem onClick={() => handleScheduleFromSlot(slot)}>
                                <Calendar className="mr-2 h-4 w-4" />
                                Agendar Reunião
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeactivateSlot(slot.id)}>
                                <Ban className="mr-2 h-4 w-4" />
                                Desativar
                              </DropdownMenuItem>
                            </>
                          ) : slotStatus === 'reserved' ? (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  const leadId = (slot as any).reserved_by;
                                  if (leadId) {
                                    navigate(`/leads/${leadId}`);
                                  }
                                }}
                              >
                                <User className="mr-2 h-4 w-4" />
                                Ver Lead
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleActivateSlot(slot.id)}>
                                <Check className="mr-2 h-4 w-4" />
                                Liberar Slot
                              </DropdownMenuItem>
                            </>
                          ) : slotStatus === 'unavailable' ? (
                            <DropdownMenuItem onClick={() => handleActivateSlot(slot.id)}>
                              <Check className="mr-2 h-4 w-4" />
                              Ativar Slot
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteSlot(slot.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {filteredSlots.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredSlots.length)} de{' '}
            {filteredSlots.length} slots
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar slots selecionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a deletar {selectedSlots.length} slot(s).
              {selectedReservedCount > 0 && (
                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-orange-800">
                  <strong>Atenção:</strong> {selectedReservedCount} slot(s) estão reservados. Deletar pode afetar reuniões
                  agendadas.
                </div>
              )}
              <div className="mt-2">Esta ação não pode ser desfeita.</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMultipleSlots.mutate(selectedSlots)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar {selectedSlots.length} slots?</AlertDialogTitle>
            <AlertDialogDescription>
              Os slots serão marcados como indisponíveis mas não serão deletados.
              {selectedReservedCount > 0 && (
                <span className="block mt-2 text-destructive font-semibold">
                  ⚠️ {selectedReservedCount} slot(s) reservado(s) também será(ão) desativado(s)!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivateMultipleSlots.mutate(selectedSlots)}
              disabled={deactivateMultipleSlots.isPending}
            >
              {deactivateMultipleSlots.isPending ? 'Desativando...' : 'Desativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateMeetingModal
        open={createMeetingOpen}
        onOpenChange={setCreateMeetingOpen}
        preselectedDate={schedulingSlot ? new Date(schedulingSlot.date) : undefined}
        preselectedTime={schedulingSlot?.time.substring(0, 5)}
      />
    </div>
  );
};
