import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { TrendingUp, Users, Calendar, MessageSquare, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';

export default function AgentMetricsCard() {
  const { data: metrics } = useQuery({
    queryKey: ['agent-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_metrics')
        .select('*')
        .single();
      
      if (error) {
        console.error('Error fetching agent metrics:', error);
        return null;
      }
      
      return data;
    },
    refetchInterval: 60000
  });

  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6 animate-pulse">
          <div className="h-20 bg-muted rounded"></div>
        </Card>
        <Card className="p-6 animate-pulse">
          <div className="h-20 bg-muted rounded"></div>
        </Card>
        <Card className="p-6 animate-pulse">
          <div className="h-20 bg-muted rounded"></div>
        </Card>
        <Card className="p-6 animate-pulse">
          <div className="h-20 bg-muted rounded"></div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-8">
      <h2 className="text-2xl font-bold">Métricas do Agente (Últimos 7 dias)</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Leads Novos</p>
              <p className="text-3xl font-bold text-foreground">{metrics.leads_novos_7d || 0}</p>
            </div>
            <Users className="text-primary" size={32} />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taxa Qualificação</p>
              <p className="text-3xl font-bold text-foreground">{metrics.taxa_qualificacao_7d || 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">Meta: &gt; 40%</p>
            </div>
            <TrendingUp className={metrics.taxa_qualificacao_7d >= 40 ? "text-green-500" : "text-orange-500"} size={32} />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Reuniões Agendadas</p>
              <p className="text-3xl font-bold text-foreground">{metrics.reunioes_agendadas_7d || 0}</p>
            </div>
            <Calendar className="text-purple-500" size={32} />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tempo p/ Qualificar</p>
              <p className="text-3xl font-bold text-foreground">{metrics.horas_ate_qualificacao?.toFixed(1) || '0.0'}h</p>
              <p className="text-xs text-muted-foreground mt-1">Média em horas</p>
            </div>
            <MessageSquare className="text-orange-500" size={32} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Conversas Positivas</p>
              <p className="text-2xl font-bold text-green-600">{metrics.conversas_positivas || 0}</p>
            </div>
            <ThumbsUp className="text-green-500" size={28} />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Conversas Negativas</p>
              <p className="text-2xl font-bold text-red-600">{metrics.conversas_negativas || 0}</p>
            </div>
            <ThumbsDown className="text-red-500" size={28} />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Handoffs Solicitados</p>
              <p className="text-2xl font-bold text-yellow-600">{metrics.handoffs_solicitados || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Meta: &lt; 10%</p>
            </div>
            <AlertCircle className="text-yellow-500" size={28} />
          </div>
        </Card>
      </div>
    </div>
  );
}
