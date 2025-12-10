import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Play, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
}

interface TestResponse {
  success: boolean;
  duration_ms: number;
  total: number;
  passed: number;
  failed: number;
  suites: TestSuite[];
  message: string;
  error?: string;
}

export const TestRunnerPage = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResponse, setTestResponse] = useState<TestResponse | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setTestResponse(null);

    try {
      toast.info('🧪 Iniciando bateria de testes...');
      
      const { data, error } = await supabase.functions.invoke('run-tests', {
        body: {}
      });

      if (error) throw error;

      setTestResponse(data as TestResponse);
      toast.success(data.message || 'Testes concluídos!');

    } catch (error: any) {
      console.error('Erro executando testes:', error);
      toast.error('Erro ao executar testes: ' + error.message);
      setTestResponse({
        success: false,
        duration_ms: 0,
        total: 0,
        passed: 0,
        failed: 0,
        suites: [],
        message: 'Erro ao executar testes',
        error: error.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getSuccessRate = () => {
    if (!testResponse || testResponse.total === 0) return 0;
    return ((testResponse.passed / testResponse.total) * 100).toFixed(1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="🧪 Central de Testes"
        description="Execute testes automatizados do sistema de agente"
        breadcrumb={[{ label: 'Testes' }]}
      />

      {/* Ação Principal */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Executar Bateria Completa
              </CardTitle>
              <CardDescription>
                36 testes cobrindo vetorização, contexto, ferramentas, comportamento e mais
              </CardDescription>
            </div>
            <Button 
              onClick={runTests} 
              disabled={isRunning}
              size="lg"
            >
              {isRunning ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Executar Testes
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {isRunning && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Executando testes...</span>
                <span className="font-medium">Aguarde</span>
              </div>
              <Progress value={50} className="h-2" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Resumo dos Resultados */}
      {testResponse && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>📊 Resumo dos Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">{testResponse.total}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">{testResponse.passed}</div>
                  <div className="text-sm text-muted-foreground">Passou</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-destructive">{testResponse.failed}</div>
                  <div className="text-sm text-muted-foreground">Falhou</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{getSuccessRate()}%</div>
                  <div className="text-sm text-muted-foreground">Sucesso</div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-muted">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Duração Total</span>
                  <span className="text-sm text-muted-foreground">
                    {(testResponse.duration_ms / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>

              {testResponse.error && (
                <div className="mt-4 p-4 rounded-lg bg-destructive/10">
                  <p className="text-sm text-destructive font-mono">{testResponse.error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resultados por Suite */}
          {testResponse.suites.map((suite, suiteIndex) => (
            <Card key={suiteIndex}>
              <CardHeader>
                <CardTitle className="text-base">{suite.name}</CardTitle>
                <CardDescription>
                  {suite.tests.filter(t => t.status === 'passed').length} / {suite.tests.length} testes passaram
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {suite.tests.map((test, testIndex) => (
                    <div 
                      key={testIndex}
                      className="flex items-start justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(test.status)}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{test.name}</p>
                          {test.error && (
                            <p className="text-xs text-destructive mt-1 font-mono">
                              {test.error}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {test.duration}ms
                        </span>
                        <Badge variant={test.status === 'passed' ? 'default' : test.status === 'failed' ? 'destructive' : 'secondary'}>
                          {test.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* Categorias de Teste */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📚 Vetorização e RAG</CardTitle>
            <CardDescription>3 testes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Embeddings gerados</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Busca semântica</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">PDFs processados</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">🧠 Contexto e Memória</CardTitle>
            <CardDescription>2 testes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Memória entre mensagens</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">BANT acumulado</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">🔧 Ferramentas</CardTitle>
            <CardDescription>7 testes (todas as tools)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">CriaUsuarioCRM</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">EnviarApresentacao</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">registrar_bant, calcular_score...</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">🤖 Comportamento</CardTitle>
            <CardDescription>6 testes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Tom profissional</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Responde objeções</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Detecta sentimentos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">💾 Persistência</CardTitle>
            <CardDescription>5 testes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Leads salvos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Mensagens persistidas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Relacionamentos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">🎯 Fluxos Completos</CardTitle>
            <CardDescription>3 testes end-to-end</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Qualificação completa</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Agendamento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Lead qualificado rápido</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">🛡️ Edge Cases</CardTitle>
            <CardDescription>5 testes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Rate limiting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Mensagens inválidas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Caracteres especiais</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">⚡ Performance</CardTitle>
            <CardDescription>2 testes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Tempo de resposta {'< 5s'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">RAG busca {'< 1s'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>📖 Sobre os Testes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">O que é testado:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Vetorização e busca semântica na base de conhecimento</li>
              <li>Contexto mantido entre múltiplas mensagens</li>
              <li>Todas as ferramentas (CriaUsuarioCRM, EnviarApresentacao, etc.)</li>
              <li>Comportamento do agente (tom, objeções, sentimento)</li>
              <li>Persistência de dados (leads, conversas, mensagens)</li>
              <li>Fluxos completos de qualificação e agendamento</li>
              <li>Edge cases e segurança (rate limiting, etc.)</li>
              <li>Performance (tempo de resposta, velocidade do RAG)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Interpretação dos resultados:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500">90-100%</Badge>
                <span className="text-muted-foreground">Excelente - Sistema funcionando perfeitamente</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500">80-89%</Badge>
                <span className="text-muted-foreground">Bom - Alguns ajustes podem ser necessários</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-500">70-79%</Badge>
                <span className="text-muted-foreground">Atenção - Revisar funcionalidades</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{'< 70%'}</Badge>
                <span className="text-muted-foreground">Crítico - Correções necessárias</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
