import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

async function runTests(): Promise<TestSuite[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const suites: TestSuite[] = [];

  // 1. TESTES DE RAG E KNOWLEDGE BASE
  console.log('\n📚 === TESTES DE RAG E KNOWLEDGE BASE ===\n');
  const ragTests: TestResult[] = [];

  // Teste 1.1: Verificar se há documentos na base de conhecimento
  const ragTest1Start = Date.now();
  try {
    const { data, error } = await supabase.from('knowledge_base').select('*').limit(1);
    if (error) throw error;
    ragTests.push({
      name: 'Verificar se há documentos na base de conhecimento',
      status: data && data.length > 0 ? 'passed' : 'failed',
      duration: Date.now() - ragTest1Start,
      error: data && data.length > 0 ? undefined : 'Nenhum documento encontrado'
    });
  } catch (error) {
    ragTests.push({
      name: 'Verificar se há documentos na base de conhecimento',
      status: 'failed',
      duration: Date.now() - ragTest1Start,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }

  // Teste 1.2: Verificar se embeddings estão sendo gerados
  const ragTest2Start = Date.now();
  try {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('embedding')
      .not('embedding', 'is', null)
      .limit(1);
    if (error) throw error;
    ragTests.push({
      name: 'Verificar se embeddings estão sendo gerados',
      status: data && data.length > 0 ? 'passed' : 'failed',
      duration: Date.now() - ragTest2Start,
      error: data && data.length > 0 ? undefined : 'Nenhum embedding encontrado'
    });
  } catch (error) {
    ragTests.push({
      name: 'Verificar se embeddings estão sendo gerados',
      status: 'failed',
      duration: Date.now() - ragTest2Start,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }

  suites.push({ name: 'RAG e Knowledge Base', tests: ragTests });

  // 2. TESTES DE CONTEXTO E MEMÓRIA
  console.log('\n🧠 === TESTES DE CONTEXTO E MEMÓRIA ===\n');
  const contextTests: TestResult[] = [];

  // Teste 2.1: Criar conversa e verificar persistência
  const contextTest1Start = Date.now();
  try {
    const testSessionId = `test_${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from('conversations')
      .insert({
        session_id: testSessionId,
        current_topic: 'teste',
        state: { test: true }
      })
      .select()
      .single();
    
    if (insertError) throw insertError;

    const { data: selectData, error: selectError } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', testSessionId)
      .single();

    if (selectError) throw selectError;

    // Cleanup
    await supabase.from('conversations').delete().eq('session_id', testSessionId);

    contextTests.push({
      name: 'Criar conversa e verificar persistência',
      status: selectData && selectData.session_id === testSessionId ? 'passed' : 'failed',
      duration: Date.now() - contextTest1Start
    });
  } catch (error) {
    contextTests.push({
      name: 'Criar conversa e verificar persistência',
      status: 'failed',
      duration: Date.now() - contextTest1Start,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }

  // Teste 2.2: Verificar estrutura de BANT
  const contextTest2Start = Date.now();
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('bant_details')
      .not('bant_details', 'is', null)
      .limit(1);
    
    if (error) throw error;

    contextTests.push({
      name: 'Verificar estrutura de BANT nos leads',
      status: data && data.length > 0 ? 'passed' : 'skipped',
      duration: Date.now() - contextTest2Start,
      error: data && data.length > 0 ? undefined : 'Nenhum lead com BANT encontrado'
    });
  } catch (error) {
    contextTests.push({
      name: 'Verificar estrutura de BANT nos leads',
      status: 'failed',
      duration: Date.now() - contextTest2Start,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }

  suites.push({ name: 'Contexto e Memória', tests: contextTests });

  // 3. TESTES DE FERRAMENTAS (TOOLS)
  console.log('\n🔧 === TESTES DE FERRAMENTAS ===\n');
  const toolTests: TestResult[] = [];

  // Teste 3.1: Verificar disponibilidade de slots
  const toolTest1Start = Date.now();
  try {
    const { data, error } = await supabase
      .from('calendar_slots')
      .select('*')
      .limit(1);
    
    if (error) throw error;

    toolTests.push({
      name: 'Verificar disponibilidade de slots no calendário',
      status: 'passed',
      duration: Date.now() - toolTest1Start
    });
  } catch (error) {
    toolTests.push({
      name: 'Verificar disponibilidade de slots no calendário',
      status: 'failed',
      duration: Date.now() - toolTest1Start,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }

  // Teste 3.2: Verificar tabela de meetings
  const toolTest2Start = Date.now();
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .limit(1);
    
    if (error) throw error;

    toolTests.push({
      name: 'Verificar tabela de reuniões',
      status: 'passed',
      duration: Date.now() - toolTest2Start
    });
  } catch (error) {
    toolTests.push({
      name: 'Verificar tabela de reuniões',
      status: 'failed',
      duration: Date.now() - toolTest2Start,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }

  // Teste 3.3: Verificar recursos do agente
  const toolTest3Start = Date.now();
  try {
    const { data, error } = await supabase
      .from('agent_resources')
      .select('*')
      .eq('ativo', true);
    
    if (error) throw error;

    toolTests.push({
      name: 'Verificar recursos ativos do agente',
      status: data && data.length > 0 ? 'passed' : 'failed',
      duration: Date.now() - toolTest3Start,
      error: data && data.length > 0 ? undefined : 'Nenhum recurso ativo encontrado'
    });
  } catch (error) {
    toolTests.push({
      name: 'Verificar recursos ativos do agente',
      status: 'failed',
      duration: Date.now() - toolTest3Start,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }

  suites.push({ name: 'Ferramentas', tests: toolTests });

  // 4. TESTES DE COMPORTAMENTO DO AGENTE
  console.log('\n🤖 === TESTES DE COMPORTAMENTO DO AGENTE ===\n');
  const behaviorTests: TestResult[] = [];

  // Teste 4.1: Verificar configuração de branding
  const behaviorTest1Start = Date.now();
  try {
    const { data, error } = await supabase
      .from('agent_branding')
      .select('*')
      .limit(1)
      .single();
    
    if (error) throw error;

    const hasRequired = data && data.nome_agente && data.nome_empresa;
    behaviorTests.push({
      name: 'Verificar configuração de branding do agente',
      status: hasRequired ? 'passed' : 'failed',
      duration: Date.now() - behaviorTest1Start,
      error: hasRequired ? undefined : 'Configuração de branding incompleta'
    });
  } catch (error) {
    behaviorTests.push({
      name: 'Verificar configuração de branding do agente',
      status: 'failed',
      duration: Date.now() - behaviorTest1Start,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }

  // Teste 4.2: Verificar configuração do sistema
  const behaviorTest2Start = Date.now();
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .limit(1)
      .single();
    
    if (error) throw error;

    behaviorTests.push({
      name: 'Verificar configuração do sistema',
      status: data ? 'passed' : 'failed',
      duration: Date.now() - behaviorTest2Start
    });
  } catch (error) {
    behaviorTests.push({
      name: 'Verificar configuração do sistema',
      status: 'failed',
      duration: Date.now() - behaviorTest2Start,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }

  suites.push({ name: 'Comportamento do Agente', tests: behaviorTests });

  // 5. TESTES DE PERSISTÊNCIA DE DADOS
  console.log('\n💾 === TESTES DE PERSISTÊNCIA DE DADOS ===\n');
  const persistenceTests: TestResult[] = [];

  // Teste 5.1: Criar e recuperar lead
  const persistenceTest1Start = Date.now();
  try {
    const testPhone = `test_${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from('leads')
      .insert({ telefone: testPhone, nome: 'Teste' })
      .select()
      .single();
    
    if (insertError) throw insertError;

    const { data: selectData, error: selectError } = await supabase
      .from('leads')
      .select('*')
      .eq('telefone', testPhone)
      .single();

    if (selectError) throw selectError;

    // Cleanup
    await supabase.from('leads').delete().eq('telefone', testPhone);

    persistenceTests.push({
      name: 'Criar e recuperar lead',
      status: selectData && selectData.telefone === testPhone ? 'passed' : 'failed',
      duration: Date.now() - persistenceTest1Start
    });
  } catch (error) {
    persistenceTests.push({
      name: 'Criar e recuperar lead',
      status: 'failed',
      duration: Date.now() - persistenceTest1Start,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }

  // Teste 5.2: Verificar activity log
  const persistenceTest2Start = Date.now();
  try {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .limit(1);
    
    if (error) throw error;

    persistenceTests.push({
      name: 'Verificar registro de atividades',
      status: 'passed',
      duration: Date.now() - persistenceTest2Start
    });
  } catch (error) {
    persistenceTests.push({
      name: 'Verificar registro de atividades',
      status: 'failed',
      duration: Date.now() - persistenceTest2Start,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }

  suites.push({ name: 'Persistência de Dados', tests: persistenceTests });

  return suites;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 Iniciando execução de testes...');

    const startTime = Date.now();
    const suites = await runTests();
    const duration = Date.now() - startTime;

    const totalTests = suites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const passedTests = suites.reduce((sum, suite) => 
      sum + suite.tests.filter(t => t.status === 'passed').length, 0
    );
    const failedTests = suites.reduce((sum, suite) => 
      sum + suite.tests.filter(t => t.status === 'failed').length, 0
    );

    console.log(`\n✅ Testes concluídos: ${passedTests}/${totalTests} passaram`);

    return new Response(
      JSON.stringify({
        success: failedTests === 0,
        duration_ms: duration,
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        suites: suites,
        message: failedTests === 0 
          ? `✅ Todos os ${totalTests} testes passaram!` 
          : `❌ ${failedTests} de ${totalTests} testes falharam.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Erro executando testes:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
