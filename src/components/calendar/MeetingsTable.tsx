import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Copy, 
  MoreVertical, 
  Eye, 
  User, 
  CheckCircle, 
  XCircle, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  MessageCircle,
  CalendarCheck
} from 'lucide-react';
import { useMeetings } from '@/lib/hooks/useMeetings';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { getInitials } from '@/lib/utils/format';
import { getRelativeTime, getWhatsAppLink } from '@/lib/utils/format';
import { cn, getColorFromString } from '@/lib/utils';
import { MeetingStatsCards } from './MeetingStatsCards';
import { MeetingContextBadge } from './MeetingContextBadge';

interface MeetingsTableProps {
  onViewDetails: (meeting: any) => void;
  onReschedule: (meeting: any) => void;
  onCancel: (meeting: any) => void;
}

export const MeetingsTable = ({ onViewDetails, onReschedule, onCancel }: MeetingsTableProps) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeetings, setSelectedMeetings] = useState<Set<string>>(new Set());
  const [showHistorical, setShowHistorical] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const navigate = useNavigate();

  const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
  const { meetings, updateMeetingStatus } = useMeetings(filters);

  // Ordenação inteligente e filtragem
  const { displayedMeetings } = useMemo(() => {
    const now = new Date();
    
    const filtered = meetings.filter((meeting) => {
      const leadName = meeting.lead?.nome?.toLowerCase() || '';
      const leadEmail = meeting.lead?.email?.toLowerCase() || '';
      const leadCompany = meeting.lead?.empresa?.toLowerCase() || '';
      const search = searchTerm.toLowerCase();
      return leadName.includes(search) || leadEmail.includes(search) || leadCompany.includes(search);
    });

    // Separar ativas e históricas
    const active = filtered.filter(m => ['scheduled', 'confirmed'].includes(m.status || ''));
    const historical = filtered.filter(m => ['completed', 'cancelled', 'no_show'].includes(m.status || ''));

    // Ordenar ativas: hoje primeiro, depois por data
    const sortedActive = active.sort((a, b) => {
      const dateA = new Date(a.scheduled_date);
      const dateB = new Date(b.scheduled_date);
      
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      
      const aIsToday = dateA >= todayStart && dateA < todayEnd;
      const bIsToday = dateB >= todayStart && dateB < todayEnd;
      
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;
      
      return dateA.getTime() - dateB.getTime();
    });

    // Ordenar históricas: mais recente primeiro
    const sortedHistorical = historical.sort((a, b) => 
      new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
    );

    // Combinar se showHistorical estiver ativo
    const displayed = showHistorical ? [...sortedActive, ...sortedHistorical] : sortedActive;

    return {
      displayedMeetings: displayed,
      activeCount: sortedActive.length,
      historicalCount: sortedHistorical.length
    };
  }, [meetings, searchTerm, showHistorical]);

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-500',
    confirmed: 'bg-green-500',
    completed: 'bg-green-700',
    cancelled: 'bg-red-500',
    no_show: 'bg-orange-500',
  };

  const statusLabels: Record<string, string> = {
    scheduled: 'Agendada',
    confirmed: 'Confirmada',
    completed: 'Concluída',
    cancelled: 'Cancelada',
    no_show: 'No-show',
  };

  const copyMeetingLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copiado',
      description: 'Link do Google Meet copiado',
    });
  };

  const openMeetingLink = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const handleSelectMeeting = (meetingId: string, checked: boolean) => {
    const newSelected = new Set(selectedMeetings);
    if (checked) {
      newSelected.add(meetingId);
    } else {
      newSelected.delete(meetingId);
    }
    setSelectedMeetings(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelected = new Set(selectedMeetings);
    displayedMeetings.forEach(m => {
      if (checked) {
        newSelected.add(m.id);
      } else {
        newSelected.delete(m.id);
      }
    });
    setSelectedMeetings(newSelected);
  };

  const handleBulkAction = (action: 'confirm' | 'cancel') => {
    selectedMeetings.forEach(id => {
      if (action === 'confirm') {
        updateMeetingStatus.mutate({ id, status: 'confirmed' });
      } else if (action === 'cancel') {
        const meeting = meetings.find(m => m.id === id);
        if (meeting) onCancel(meeting);
      }
    });
    setSelectedMeetings(new Set());
  };

  const isHistoricalMeeting = (meeting: any) => {
    return ['completed', 'cancelled', 'no_show'].includes(meeting.status || '');
  };

  return (
    <div className="space-y-6">
      <MeetingStatsCards meetings={meetings} />

      {/* Filtros sem borda */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="scheduled">Agendada</SelectItem>
            <SelectItem value="confirmed">Confirmada</SelectItem>
            <SelectItem value="completed">Concluída</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
            <SelectItem value="no_show">No-show</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Buscar por nome, email ou empresa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />

        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-2">
            <Switch
              id="compact-view"
              checked={compactView}
              onCheckedChange={setCompactView}
            />
            <Label htmlFor="compact-view" className="text-sm cursor-pointer">Compacto</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="show-historical"
              checked={showHistorical}
              onCheckedChange={setShowHistorical}
            />
            <Label htmlFor="show-historical" className="text-sm cursor-pointer">Mostrar Históricas</Label>
          </div>
        </div>
      </div>

      {/* Barra de ações em lote */}
      {selectedMeetings.size > 0 && (
        <div className="p-3 bg-accent/10 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedMeetings.size} reunião(ões) selecionada(s)
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('confirm')}>
              Confirmar Todas
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('cancel')}>
              Cancelar Todas
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedMeetings(new Set())}>
              Limpar Seleção
            </Button>
          </div>
        </div>
      )}

      {/* Tabela unificada sem border/card */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={displayedMeetings.length > 0 && displayedMeetings.every(m => selectedMeetings.has(m.id))}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contexto</TableHead>
              <TableHead>Link Meet</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedMeetings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <CalendarCheck className="h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground font-medium">Nenhuma reunião encontrada</p>
                    <p className="text-sm text-muted-foreground">
                      {showHistorical 
                        ? 'Ajuste os filtros para ver mais reuniões' 
                        : 'As reuniões agendadas aparecerão aqui'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayedMeetings.map((meeting) => {
                const leadName = meeting.lead?.nome || 'Lead';
                const leadEmail = meeting.lead?.email || '';
                const initials = getInitials(leadName);
                const avatarColor = getColorFromString(leadName);
                const isSelected = selectedMeetings.has(meeting.id);
                const isHistorical = isHistoricalMeeting(meeting);

                return (
                  <TableRow 
                    key={meeting.id}
                    className={cn(
                      'transition-all hover:bg-muted/50',
                      isHistorical && 'opacity-60',
                      isSelected && 'bg-accent/10'
                    )}
                  >
                    <TableCell className="w-12">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectMeeting(meeting.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className={cn('h-9 w-9', compactView && 'h-7 w-7')} style={{ backgroundColor: avatarColor }}>
                          <AvatarFallback className="text-xs text-white font-medium" style={{ backgroundColor: avatarColor }}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className={cn('font-medium', compactView && 'text-sm')}>{leadName}</div>
                          {leadEmail && (
                            <div className="text-xs text-muted-foreground">{leadEmail}</div>
                          )}
                          {meeting.lead?.empresa && (
                            <div className="text-xs text-muted-foreground">
                              {meeting.lead.empresa}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className={cn('font-medium', compactView && 'text-sm')}>
                          {getRelativeTime(meeting.scheduled_date)}
                        </div>
                        {!compactView && (
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(meeting.scheduled_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={cn(compactView && 'text-sm')}>{meeting.duration} min</TableCell>
                    <TableCell>
                      <Badge className={statusColors[meeting.status || 'scheduled']}>
                        {statusLabels[meeting.status || 'scheduled']}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <MeetingContextBadge contexto_reuniao={meeting.contexto_reuniao} />
                    </TableCell>
                    <TableCell>
                      {meeting.meeting_link && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyMeetingLink(meeting.meeting_link)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openMeetingLink(meeting.meeting_link)}
                            className="h-8 w-8 p-0"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {!isHistorical && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewDetails(meeting)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {meeting.lead?.telefone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(getWhatsAppLink(meeting.lead.telefone), '_blank')}
                                className="h-8 w-8 p-0"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onViewDetails(meeting)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/leads/${meeting.lead_id}`)}>
                              <User className="mr-2 h-4 w-4" />
                              Ver Lead
                            </DropdownMenuItem>
                            {meeting.lead?.telefone && (
                              <DropdownMenuItem onClick={() => window.open(getWhatsAppLink(meeting.lead.telefone), '_blank')}>
                                <MessageCircle className="mr-2 h-4 w-4" />
                                WhatsApp
                              </DropdownMenuItem>
                            )}
                            {meeting.status === 'scheduled' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateMeetingStatus.mutate({ id: meeting.id, status: 'confirmed' })
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Confirmar
                                </DropdownMenuItem>
                              </>
                            )}
                            {(meeting.status === 'scheduled' || meeting.status === 'confirmed') && (
                              <>
                                <DropdownMenuItem onClick={() => onReschedule(meeting)}>
                                  <CalendarCheck className="mr-2 h-4 w-4" />
                                  Reagendar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onCancel(meeting)}
                                  className="text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancelar
                                </DropdownMenuItem>
                              </>
                            )}
                            {(meeting.status === 'scheduled' || meeting.status === 'confirmed') &&
                              new Date(meeting.scheduled_date) < new Date() && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateMeetingStatus.mutate({ id: meeting.id, status: 'completed' })
                                    }
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                    Marcar como Concluída
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateMeetingStatus.mutate({ id: meeting.id, status: 'no_show' })
                                    }
                                  >
                                    <AlertCircle className="mr-2 h-4 w-4 text-orange-600" />
                                    Marcar como No-show
                                  </DropdownMenuItem>
                                </>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
