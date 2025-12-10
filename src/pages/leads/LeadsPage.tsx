import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus, Search, Download, Filter, MoreHorizontal, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonTable } from '@/components/shared/SkeletonTable';
import { Users } from 'lucide-react';
import { useLeads } from '@/lib/hooks/useLeads';
import { useRealtimeLeads } from '@/lib/hooks/useRealtimeLeads';
import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreateLeadModal } from '@/components/leads/CreateLeadModal';
import { LeadFilters } from '@/components/leads/LeadFilters';
import { getInitials, formatPhone, copyToClipboard, getWhatsAppLink } from '@/lib/utils/format';
import { exportLeadsToCSV } from '@/lib/utils/export';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const stageColors: Record<string, string> = {
  'Novo': 'bg-blue-500',
  'Apresentação Enviada': 'bg-purple-500',
  'Segundo Contato': 'bg-yellow-500',
  'Reunião Agendada': 'bg-green-500',
  'Proposta Enviada': 'bg-orange-500',
  'Fechado': 'bg-emerald-600',
  'Cancelado': 'bg-red-500',
};

const allStages = [
  'Novo',
  'Apresentação Enviada',
  'Segundo Contato',
  'Reunião Agendada',
  'Proposta Enviada',
  'Fechado',
  'Cancelado',
];

export const LeadsPage = () => {
  const navigate = useNavigate();
  useRealtimeLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false);
  const [bulkStage, setBulkStage] = useState('');
  
  // Filtros
  const [filterStages, setFilterStages] = useState<string[]>([]);
  const [filterNecessidades, setFilterNecessidades] = useState<string[]>([]);
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  // Paginação e sorting
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filters = useMemo(() => ({
    search: searchTerm,
    stages: filterStages.length > 0 ? filterStages : undefined,
    necessidades: filterNecessidades.length > 0 ? filterNecessidades : undefined,
    scoreMin: scoreRange[0],
    scoreMax: scoreRange[1],
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    sortBy,
    sortOrder,
    page,
    pageSize,
  }), [searchTerm, filterStages, filterNecessidades, scoreRange, dateRange, sortBy, sortOrder, page, pageSize]);

  const { leads, total, isLoading, deleteLead, bulkDeleteLeads, bulkUpdateStage } = useLeads(filters);

  const totalPages = Math.ceil(total / pageSize);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === leads?.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads?.map(l => l.id) || []);
    }
  };

  const handleSelectLead = (id: string) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter(lid => lid !== id));
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  };

  const handleClearFilters = () => {
    setFilterStages([]);
    setFilterNecessidades([]);
    setScoreRange([0, 100]);
    setDateRange({});
    setSearchTerm('');
  };

  const handleExport = () => {
    if (!leads) return;
    const toExport = selectedLeads.length > 0 
      ? leads.filter(l => selectedLeads.includes(l.id))
      : leads;
    exportLeadsToCSV(toExport);
    toast.success(`${toExport.length} leads exportados`);
  };

  const handleBulkDelete = async () => {
    await bulkDeleteLeads.mutateAsync(selectedLeads);
    setSelectedLeads([]);
    setShowDeleteDialog(false);
  };

  const handleBulkUpdate = async () => {
    if (!bulkStage) return;
    await bulkUpdateStage.mutateAsync({ ids: selectedLeads, stage: bulkStage });
    setSelectedLeads([]);
    setShowBulkUpdateDialog(false);
    setBulkStage('');
  };

  const handleCopyPhone = async (phone: string) => {
    const success = await copyToClipboard(phone);
    if (success) {
      toast.success('Telefone copiado!');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Leads"
        description="Gerencie todos os seus leads"
        breadcrumb={[{ label: 'Leads' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Lead
            </Button>
          </div>
        }
      />

      <div className="flex gap-4">
        {/* Filtros - Desktop */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <LeadFilters
            stages={filterStages}
            onStagesChange={setFilterStages}
            necessidades={filterNecessidades}
            onNecessidadesChange={setFilterNecessidades}
            scoreRange={scoreRange}
            onScoreRangeChange={setScoreRange}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onClear={handleClearFilters}
          />
        </div>

        <div className="flex-1 space-y-4">
          {/* Busca e filtros mobile */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar leads..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtros - Mobile */}
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <LeadFilters
                  stages={filterStages}
                  onStagesChange={setFilterStages}
                  necessidades={filterNecessidades}
                  onNecessidadesChange={setFilterNecessidades}
                  scoreRange={scoreRange}
                  onScoreRangeChange={setScoreRange}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  onClear={handleClearFilters}
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* Barra de ações em massa */}
          {selectedLeads.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selecionado{selectedLeads.length > 1 ? 's' : ''}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkUpdateDialog(true)}
                >
                  Atualizar Stage
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                >
                  Exportar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Deletar
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLeads([])}
              >
                Limpar Seleção
              </Button>
            </div>
          )}

          {isLoading ? (
            <SkeletonTable rows={5} columns={8} />
          ) : !leads || leads.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum lead encontrado"
              description="Comece criando seu primeiro lead ou ajuste os filtros."
              action={{
                label: 'Criar Lead',
                onClick: () => setCreateModalOpen(true),
              }}
            />
          ) : (
            <>
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedLeads.length === leads.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => handleSort('nome')}
                      >
                        Nome {sortBy === 'nome' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Necessidade</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => handleSort('stage')}
                      >
                        Stage {sortBy === 'stage' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => handleSort('score_bant')}
                      >
                        Score {sortBy === 'score_bant' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => handleSort('updated_at')}
                      >
                        Última Atividade {sortBy === 'updated_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow 
                        key={lead.id} 
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => navigate(`/leads/${lead.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedLeads.includes(lead.id)}
                            onCheckedChange={() => handleSelectLead(lead.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{getInitials(lead.nome)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{lead.nome || 'Sem nome'}</div>
                              {lead.empresa && (
                                <div className="text-xs text-muted-foreground">{lead.empresa}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{formatPhone(lead.telefone)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => handleCopyPhone(lead.telefone)}
                            >
                              📋
                            </Button>
                            <a
                              href={getWhatsAppLink(lead.telefone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700"
                            >
                              💬
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.necessidade ? (
                            <Badge variant="outline">{lead.necessidade}</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={stageColors[lead.stage] || 'bg-gray-500'}>
                            {lead.stage}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${
                                  lead.score_bant >= 70 ? 'bg-green-500' :
                                  lead.score_bant >= 40 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${lead.score_bant}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{lead.score_bant}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground" title={format(new Date(lead.updated_at), 'PPpp', { locale: ptBR })}>
                            {formatDistanceToNow(new Date(lead.updated_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/leads/${lead.id}`)}>
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteLead.mutate(lead.id)}>
                                Deletar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Mostrando {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} de {total}
                  </span>
                  <Select value={pageSize.toString()} onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(0);
                  }}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm">
                    Página {page + 1} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <CreateLeadModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen} 
      />

      {/* Dialog Bulk Update */}
      <Dialog open={showBulkUpdateDialog} onOpenChange={setShowBulkUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={bulkStage} onValueChange={setBulkStage}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o novo stage" />
              </SelectTrigger>
              <SelectContent>
                {allStages.map(stage => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowBulkUpdateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleBulkUpdate} disabled={!bulkStage || bulkUpdateStage.isPending}>
                {bulkUpdateStage.isPending ? 'Atualizando...' : 'Atualizar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Bulk Delete */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
