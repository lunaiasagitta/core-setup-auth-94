import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths, getMonth, getYear, setMonth, setYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, ChevronLeft, ChevronRight, RefreshCcw, FileText, UserPlus, Settings } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCalendarEvents } from '@/lib/hooks/useCalendarEvents';
import { MeetingDetailsModal } from '@/components/calendar/MeetingDetailsModal';
import { RescheduleMeetingModal } from '@/components/calendar/RescheduleMeetingModal';
import { CancelMeetingDialog } from '@/components/calendar/CancelMeetingDialog';
import { MeetingsTable } from '@/components/calendar/MeetingsTable';
import { MeetingReportModal } from '@/components/calendar/MeetingReportModal';
import { ExportButton } from '@/components/calendar/ExportButton';
import { SetupWatchDialog } from '@/components/calendar/SetupWatchDialog';
import { CreateMeetingModal } from '@/components/calendar/CreateMeetingModal';
import { SlotsListView } from '@/components/calendar/SlotsListView';
import { ManageSlotModal } from '@/components/calendar/ManageSlotModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar.css';

const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export const CalendarPage = () => {
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(new Date());
  const [view, setView] = useState<View>('month');
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [meetingDetailsOpen, setMeetingDetailsOpen] = useState(false);
  const [rescheduleMeetingOpen, setRescheduleMeetingOpen] = useState(false);
  const [cancelMeetingOpen, setCancelMeetingOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [showWatchSetup, setShowWatchSetup] = useState(false);
  const [createMeetingOpen, setCreateMeetingOpen] = useState(false);
  const [manageSlotOpen, setManageSlotOpen] = useState(false);

  const { data: events = [], isLoading, refetch } = useCalendarEvents(viewDate);
  const queryClient = useQueryClient();

  // Mutation para sincronizar com Google Calendar (bidirecionalmente)
  const syncGoogleCalendar = useMutation({
    mutationFn: async () => {
      // Primeiro importar do Google
      const { data: importData, error: importError } = await supabase.functions.invoke('google-calendar-sync');
      if (importError) throw importError;

      // Depois exportar para o Google
      const { data: exportData, error: exportError } = await supabase.functions.invoke('push-to-google-calendar');
      if (exportError) throw exportError;

      return {
        import: importData,
        export: exportData,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast({
        title: 'Sincronização bidirecional concluída',
        description: `Google→Banco: ${data.import.created} criados, ${data.import.updated} atualizados | Banco→Google: ${data.export.exported} exportados`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao sincronizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const setupGoogleWatch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('google-setup-watch');
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Watch configurado',
        description: 'Google Calendar watch channel configurado com sucesso',
      });
      setShowWatchSetup(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao configurar watch',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event.resource);
    // Apenas meetings aparecem no calendário agora
    if (event.resource.type === 'meeting') {
      setMeetingDetailsOpen(true);
    }
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedSlotDate(start);
    setCreateMeetingOpen(true);
  };

  const eventStyleGetter = (event: any) => {
    const statusColors: Record<string, any> = {
      scheduled: { backgroundColor: 'hsl(var(--chart-2))', color: '#fff' },
      confirmed: { backgroundColor: 'hsl(var(--chart-1))', color: '#fff' },
      completed: { backgroundColor: 'hsl(var(--chart-4))', color: '#fff', opacity: 0.7 },
      cancelled: {
        backgroundColor: 'hsl(var(--destructive))',
        color: '#fff',
        textDecoration: 'line-through',
      },
      no_show: { backgroundColor: 'hsl(var(--chart-5))', color: '#fff' },
    };

    const baseStyle = statusColors[event.resource.status || 'scheduled'] || {};
    return { style: baseStyle };
  };

  const CustomToolbar = () => {
    const currentMonth = getMonth(viewDate);
    const currentYear = getYear(viewDate);

    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const years = Array.from({ length: 7 }, (_, i) => currentYear - 1 + i);

    return (
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewDate(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewDate(subMonths(viewDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select
            value={currentMonth.toString()}
            onValueChange={(value) => setViewDate(setMonth(viewDate, parseInt(value)))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={currentYear.toString()}
            onValueChange={(value) => setViewDate(setYear(viewDate, parseInt(value)))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setViewDate(addMonths(viewDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button
              variant={view === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('month')}
            >
              Mês
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('week')}
            >
              Semana
            </Button>
            <Button
              variant={view === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('day')}
            >
              Dia
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const Legend = () => (
    <div className="flex flex-wrap gap-4 text-sm mb-4">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
        <span>Agendada</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
        <span>Confirmada</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--chart-4))' }} />
        <span>Concluída</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--destructive))' }} />
        <span>Cancelada</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--chart-5))' }} />
        <span>No-show</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Agenda"
        description="Gerencie sua agenda e reuniões"
        breadcrumb={[{ label: 'Agenda' }]}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setCreateMeetingOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Agendar Reunião
            </Button>
            <ExportButton />
            <Button 
              variant="outline" 
              onClick={() => setReportModalOpen(true)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Relatório
            </Button>
            <Button 
              variant="outline" 
              onClick={() => syncGoogleCalendar.mutate()}
              disabled={syncGoogleCalendar.isPending}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${syncGoogleCalendar.isPending ? 'animate-spin' : ''}`} />
              Sincronizar Google
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowWatchSetup(true)}
              disabled={setupGoogleWatch.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${setupGoogleWatch.isPending ? 'animate-spin' : ''}`} />
              Configurar Watch
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-6">
          <CustomToolbar />
          <Legend />
          <div style={{ height: 600 }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Carregando agenda...</p>
              </div>
            ) : (
              <BigCalendar
                localizer={localizer}
                events={events}
                view={view}
                onView={setView}
                date={viewDate}
                onNavigate={setViewDate}
                selectable
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                eventPropGetter={eventStyleGetter}
                culture="pt-BR"
                timezone="America/Sao_Paulo"
                messages={{
                  next: 'Próximo',
                  previous: 'Anterior',
                  today: 'Hoje',
                  month: 'Mês',
                  week: 'Semana',
                  day: 'Dia',
                  agenda: 'Agenda',
                  date: 'Data',
                  time: 'Hora',
                  event: 'Evento',
                  noEventsInRange: 'Não há eventos neste período',
                }}
                formats={{
                  dayHeaderFormat: (date) => format(date, 'EEEE, dd/MM', { locale: ptBR }),
                  dayRangeHeaderFormat: ({ start, end }) =>
                    `${format(start, 'dd/MM', { locale: ptBR })} - ${format(end, 'dd/MM', {
                      locale: ptBR,
                    })}`,
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="meetings">
            <TabsList>
              <TabsTrigger value="meetings">Reuniões</TabsTrigger>
              <TabsTrigger value="slots">Slots</TabsTrigger>
            </TabsList>
            <TabsContent value="meetings" className="mt-4">
              <MeetingsTable
                onViewDetails={(meeting) => {
                  setSelectedEvent({ type: 'meeting', data: meeting });
                  setMeetingDetailsOpen(true);
                }}
                onReschedule={(meeting) => {
                  setSelectedEvent({ type: 'meeting', data: meeting });
                  setRescheduleMeetingOpen(true);
                }}
                onCancel={(meeting) => {
                  setSelectedEvent({ type: 'meeting', data: meeting });
                  setCancelMeetingOpen(true);
                }}
              />
            </TabsContent>
            <TabsContent value="slots" className="mt-4">
              <SlotsListView />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedEvent?.type === 'meeting' && (
        <>
          <MeetingDetailsModal
            open={meetingDetailsOpen}
            onOpenChange={setMeetingDetailsOpen}
            meeting={selectedEvent.data}
            onReschedule={() => {
              setMeetingDetailsOpen(false);
              setRescheduleMeetingOpen(true);
            }}
            onCancel={() => {
              setMeetingDetailsOpen(false);
              setCancelMeetingOpen(true);
            }}
          />

          <RescheduleMeetingModal
            open={rescheduleMeetingOpen}
            onOpenChange={setRescheduleMeetingOpen}
            meeting={selectedEvent.data}
          />

          <CancelMeetingDialog
            open={cancelMeetingOpen}
            onOpenChange={setCancelMeetingOpen}
            meeting={selectedEvent.data}
          />
        </>
      )}

      <MeetingReportModal open={reportModalOpen} onOpenChange={setReportModalOpen} />

      <SetupWatchDialog
        open={showWatchSetup}
        onOpenChange={setShowWatchSetup}
        onConfirm={() => setupGoogleWatch.mutate()}
        isPending={setupGoogleWatch.isPending}
      />

      <CreateMeetingModal
        open={createMeetingOpen}
        onOpenChange={setCreateMeetingOpen}
        preselectedDate={selectedSlotDate}
        preselectedTime={selectedSlotDate ? format(selectedSlotDate, 'HH:mm') : undefined}
      />

      {selectedEvent?.type === 'slot' && (
        <ManageSlotModal
          open={manageSlotOpen}
          onOpenChange={setManageSlotOpen}
          slot={selectedEvent.data}
          onScheduleMeeting={() => {
            const slotDateTime = new Date(`${selectedEvent.data.date}T${selectedEvent.data.time}`);
            setSelectedSlotDate(slotDateTime);
            setCreateMeetingOpen(true);
          }}
        />
      )}
    </div>
  );
};
