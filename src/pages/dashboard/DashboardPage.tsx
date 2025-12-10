import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Users, MessageSquare, Calendar, TrendingUp, Plus, Eye, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { useState } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRealtimeLeads } from '@/lib/hooks/useRealtimeLeads';
import { AgendaTodayCard } from '@/components/dashboard/AgendaTodayCard';
import { AgendaMetricsCard } from '@/components/dashboard/AgendaMetricsCard';

// Mock data
const newLeadsData = [
  { day: 'Seg', leads: 12 },
  { day: 'Ter', leads: 19 },
  { day: 'Qua', leads: 15 },
  { day: 'Qui', leads: 22 },
  { day: 'Sex', leads: 18 },
  { day: 'Sáb', leads: 8 },
  { day: 'Dom', leads: 5 },
];

const leadsByStatusData = [
  { name: 'Novo', value: 35, color: 'hsl(261 73% 60%)' },
  { name: 'Qualificado', value: 25, color: 'hsl(171 77% 48%)' },
  { name: 'Reunião Agendada', value: 20, color: 'hsl(142 71% 45%)' },
  { name: 'Perdido', value: 20, color: 'hsl(0 84% 60%)' },
];

const recentActivities = [
  { id: 1, lead: 'João Silva', action: 'Novo lead criado', time: 'há 5 min' },
  { id: 2, lead: 'Maria Santos', action: 'Reunião agendada', time: 'há 15 min' },
  { id: 3, lead: 'Pedro Oliveira', action: 'Lead qualificado', time: 'há 1 hora' },
  { id: 4, lead: 'Ana Costa', action: 'Mensagem recebida', time: 'há 2 horas' },
  { id: 5, lead: 'Carlos Lima', action: 'Status atualizado', time: 'há 3 horas' },
];

export const DashboardPage = () => {
  const [loading] = useState(false);
  useRealtimeLeads();

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Visão geral das suas métricas" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} variant="simple" rows={1} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Visão geral das suas métricas e atividades"
        breadcrumb={[{ label: 'Dashboard' }]}
      />

      {/* Stat Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Leads"
          value="1,234"
          change={{ value: 12.5, trend: 'up' }}
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Leads Ativos"
          value="856"
          change={{ value: 8.2, trend: 'up' }}
          icon={MessageSquare}
          color="accent"
        />
        <StatCard
          title="Reuniões Agendadas"
          value="32"
          change={{ value: 3.1, trend: 'down' }}
          icon={Calendar}
          color="success"
        />
        <StatCard
          title="Taxa de Conversão"
          value="68%"
          change={{ value: 5.4, trend: 'up' }}
          icon={TrendingUp}
          color="warning"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* New Leads Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Novos Leads (Últimos 7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={newLeadsData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="hsl(261 73% 60%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(261 73% 60%)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leads by Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadsByStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadsByStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <AgendaTodayCard />
        <AgendaMetricsCard />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Activity */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{activity.lead}</p>
                      <p className="text-sm text-muted-foreground">{activity.action}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="default">
              <Plus className="mr-2 h-4 w-4" />
              Criar Lead Manual
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Ver Todos os Leads
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CalendarDays className="mr-2 h-4 w-4" />
              Agenda do Dia
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
