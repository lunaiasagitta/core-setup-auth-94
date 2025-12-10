import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { TrendingUp, Target, Users, CheckCircle, Calendar } from 'lucide-react';
import { useLeadAnalytics } from '@/lib/hooks/useLeadAnalytics';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { exportLeadsToCSV } from '@/lib/utils/export';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import AgentMetricsCard from '@/components/analytics/AgentMetricsCard';

const stageColors: Record<string, string> = {
  'Novo': '#3b82f6',
  'Apresentação Enviada': '#a855f7',
  'Segundo Contato': '#eab308',
  'Reunião Agendada': '#22c55e',
  'Proposta Enviada': '#f97316',
  'Fechado': '#059669',
  'Cancelado': '#ef4444',
};

const scoreColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#059669'];

export const AnalyticsPage = () => {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data, isLoading } = useLeadAnalytics(dateRange.from, dateRange.to);

  const handleExport = () => {
    if (!data?.leads) return;
    exportLeadsToCSV(data.leads, `leads_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success('Dados exportados com sucesso!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" text="Carregando analytics..." />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const pieData = Object.entries(data.byStage).map(([name, value]) => ({
    name,
    value,
    color: stageColors[name] || '#gray',
  }));

  const scoreData = Object.entries(data.scoreRanges).map(([range, count]) => ({
    range,
    count,
  }));

  const needData = Object.entries(data.byNeed).map(([name, count]) => ({
    name,
    count,
  }));

  // Dados de leads ao longo do tempo (simulado por enquanto - seria melhor ter timestamps reais)
  const timeData = data.leads
    .reduce((acc: any[], lead) => {
      const date = format(new Date(lead.created_at), 'dd/MM');
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    }, [])
    .slice(-14); // Últimos 14 dias

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Analytics"
        description="Métricas detalhadas e análises"
        breadcrumb={[{ label: 'Analytics' }]}
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Dados
          </Button>
        }
      />

      {/* Métricas do Agente */}
      <AgentMetricsCard />

      {/* Filtro de Período */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Período:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR }) : 'Início'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <span className="text-sm text-muted-foreground">até</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.to ? format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR }) : 'Fim'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
              >
                7 dias
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
              >
                30 dias
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Leads"
          value={data.total.toString()}
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Taxa de Qualificação"
          value={`${data.taxaQualificacao.toFixed(1)}%`}
          icon={Target}
          color="success"
        />
        <StatCard
          title="Taxa de Agendamento"
          value={`${data.taxaAgendamento.toFixed(1)}%`}
          icon={Calendar}
          color="accent"
        />
        <StatCard
          title="Taxa de Conversão"
          value={`${data.taxaConversao.toFixed(1)}%`}
          icon={CheckCircle}
          color="success"
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie Chart - Leads por Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart - Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Score BANT</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scoreData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8">
                  {scoreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={scoreColors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart - Leads por Necessidade */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Necessidade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={needData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#a855f7" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart - Leads ao longo do tempo */}
        <Card>
          <CardHeader>
            <CardTitle>Novos Leads ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Resumo */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo por Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data.byStage).map(([stage, count]) => (
              <div key={stage} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: stageColors[stage] || '#gray' }}
                  />
                  <span className="font-medium">{stage}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold">{count}</span>
                  <span className="text-sm text-muted-foreground">
                    {((count / data.total) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
