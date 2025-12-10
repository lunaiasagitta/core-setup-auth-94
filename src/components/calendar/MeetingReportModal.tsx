import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Download, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMeetings } from '@/lib/hooks/useMeetings';
import { exportMeetingsToCSV } from '@/lib/utils/exportCalendar';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MeetingReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MeetingReportModal = ({ open, onOpenChange }: MeetingReportModalProps) => {
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  const { meetings } = useMeetings({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  // Métricas
  const totalMeetings = meetings.length;
  const byStatus = meetings.reduce((acc, m) => {
    const status = m.status || 'scheduled';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const completed = byStatus.completed || 0;
  const noShow = byStatus.no_show || 0;
  const attendanceRate = completed + noShow > 0 ? Math.round((completed / (completed + noShow)) * 100) : 0;

  const avgDuration = meetings.length > 0
    ? Math.round(meetings.reduce((acc, m) => acc + (m.duration || 30), 0) / meetings.length)
    : 0;

  // Top leads
  const leadCounts = meetings.reduce((acc, m) => {
    const lead = m.lead as any;
    const leadId = lead?.id;
    if (leadId) {
      if (!acc[leadId]) {
        acc[leadId] = { name: lead.nome || 'Lead', count: 0 };
      }
      acc[leadId].count++;
    }
    return acc;
  }, {} as Record<string, { name: string; count: number }>);

  const topLeads = Object.values(leadCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Dados para gráficos
  const statusData = Object.entries(byStatus).map(([status, count]) => ({
    name: status === 'scheduled' ? 'Agendada' :
          status === 'confirmed' ? 'Confirmada' :
          status === 'completed' ? 'Concluída' :
          status === 'cancelled' ? 'Cancelada' : 'No-show',
    value: count,
  }));

  const COLORS = ['hsl(var(--chart-2))', 'hsl(var(--chart-1))', 'hsl(var(--chart-4))', 'hsl(var(--destructive))', 'hsl(var(--chart-5))'];

  // Reuniões por dia
  const meetingsByDay = meetings.reduce((acc, m) => {
    const day = format(new Date(m.scheduled_date), 'dd/MM');
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dailyData = Object.entries(meetingsByDay).map(([day, count]) => ({
    day,
    reunioes: count,
  }));

  const handleExport = () => {
    exportMeetingsToCSV(meetings as any);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório de Reuniões
          </DialogTitle>
          <DialogDescription>
            Visualize métricas e estatísticas das suas reuniões
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filtros */}
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handleExport} variant="outline" className="mt-8">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total de Reuniões</p>
              <p className="text-3xl font-bold text-chart-2">{totalMeetings}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Concluídas</p>
              <p className="text-3xl font-bold text-chart-4">{completed}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Taxa Comparecimento</p>
              <p className="text-3xl font-bold text-chart-1">{attendanceRate}%</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Duração Média</p>
              <p className="text-3xl font-bold text-chart-3">{avgDuration}min</p>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Distribuição por Status</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-4">Reuniões por Dia</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="reunioes" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Top Leads */}
          {topLeads.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Top Leads (mais reuniões)</h3>
              <div className="space-y-2">
                {topLeads.map((lead, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span className="font-medium">{lead.name}</span>
                    <Badge variant="secondary">{lead.count} reuniões</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
