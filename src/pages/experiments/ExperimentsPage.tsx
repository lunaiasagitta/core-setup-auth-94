import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { TrendingUp, Users, Calendar, Percent } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface ExperimentResult {
  variant: string;
  total_leads: number;
  apresentacao_enviada: number;
  reuniao_agendada: number;
  qualificados: number;
  taxa_apresentacao: string;
  taxa_agendamento: string;
  taxa_qualificacao: string;
}

export default function ExperimentsPage() {
  const queryClient = useQueryClient();

  const { data: experiments, isLoading } = useQuery({
    queryKey: ['experiments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const stopExperiment = useMutation({
    mutationFn: async (experimentId: string) => {
      const { error } = await supabase
        .from('experiments')
        .update({ active: false, ended_at: new Date().toISOString() })
        .eq('id', experimentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
      toast.success('Experimento encerrado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao encerrar experimento: ' + error.message);
    }
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-8">
      <PageHeader
        title="Experimentos A/B"
        description="Compare diferentes versões de prompts e estratégias conversacionais"
      />

      {!experiments?.length ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Nenhum experimento ativo no momento</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {experiments.map((experiment) => (
            <Card key={experiment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{experiment.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {experiment.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={experiment.active ? 'default' : 'secondary'}>
                      {experiment.active ? 'Ativo' : 'Encerrado'}
                    </Badge>
                    {experiment.active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => stopExperiment.mutate(experiment.id)}
                      >
                        Encerrar
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ExperimentResults experimentId={experiment.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ExperimentResults({ experimentId }: { experimentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['experiment-results', experimentId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('experiments-api', {
        body: { experimentId }
      });
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data?.results) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum resultado disponível ainda
      </div>
    );
  }

  const results: ExperimentResult[] = data.results;

  return (
    <div className="space-y-6">
      {results.map((result) => (
        <div key={result.variant} className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">{result.variant}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded">
                <Users className="text-primary" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{result.total_leads}</p>
                <p className="text-xs text-muted-foreground">Total Leads</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded">
                <TrendingUp className="text-blue-500" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{result.taxa_apresentacao}%</p>
                <p className="text-xs text-muted-foreground">Taxa Apresentação</p>
                <p className="text-xs text-muted-foreground">
                  ({result.apresentacao_enviada} leads)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded">
                <Calendar className="text-green-500" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{result.taxa_agendamento}%</p>
                <p className="text-xs text-muted-foreground">Taxa Agendamento</p>
                <p className="text-xs text-muted-foreground">
                  ({result.reuniao_agendada} leads)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded">
                <Percent className="text-purple-500" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{result.taxa_qualificacao}%</p>
                <p className="text-xs text-muted-foreground">Taxa Qualificação</p>
                <p className="text-xs text-muted-foreground">
                  ({result.qualificados} leads)
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {results.length > 1 && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Análise Comparativa</h4>
          <p className="text-sm text-muted-foreground">
            Melhor taxa de qualificação: {' '}
            <strong>
              {results.reduce((best, current) => 
                parseFloat(current.taxa_qualificacao) > parseFloat(best.taxa_qualificacao) 
                  ? current 
                  : best
              ).variant}
            </strong>
            {' '}com {
              results.reduce((best, current) => 
                parseFloat(current.taxa_qualificacao) > parseFloat(best.taxa_qualificacao) 
                  ? current 
                  : best
              ).taxa_qualificacao
            }%
          </p>
        </div>
      )}
    </div>
  );
}
