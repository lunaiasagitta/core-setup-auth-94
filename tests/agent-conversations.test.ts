interface TestTurn {
  user: string;
  expectedIntent?: string;
  expectedActions?: string[];
  expectedContains?: string;
  expectedRegex?: RegExp;
}

interface TestCase {
  name: string;
  description: string;
  turns: TestTurn[];
  finalAssertions: Array<{
    field: string;
    value?: any;
    operator?: string;
  }>;
}

// Suite de testes conversacionais do agente
const testCases: TestCase[] = [
  {
    name: 'Fluxo Completo - Website - Qualificação e Agendamento',
    description: 'Lead novo interessado em website passa por qualificação BANT completa e agenda reunião',
    turns: [
      {
        user: 'Oi, quero um site',
        expectedIntent: 'interesse_direto',
        expectedContains: 'apresentação'
      },
      {
        user: 'Sim, pode mandar',
        expectedActions: ['marcar_apresentacao_enviada', 'atualizar_stage'],
        expectedContains: 'enviado'
      },
      {
        user: 'Gostei! Quanto custa?',
        expectedIntent: 'pergunta_preco',
        expectedRegex: /1\.?599/
      },
      {
        user: 'Tenho R$ 5 mil de orçamento',
        expectedActions: ['registrar_bant']
      },
      {
        user: 'Eu sou o dono da empresa',
        expectedActions: ['registrar_bant']
      },
      {
        user: 'Preciso urgente pra semana que vem',
        expectedActions: ['registrar_bant', 'calcular_score']
      },
      {
        user: 'Vamos agendar uma conversa',
        expectedIntent: 'quero_agendar',
        expectedActions: ['buscar_slots']
      },
      {
        user: 'Quarta às 10h',
        expectedActions: ['agendar_reuniao', 'atualizar_stage']
      }
    ],
    finalAssertions: [
      { field: 'stage', value: 'Reunião Agendada' },
      { field: 'score_bant', operator: '>=', value: 70 },
      { field: 'necessidade', value: 'Websites' }
    ]
  },
  
  {
    name: 'Objeção de Preço - Superação via Valor',
    description: 'Lead com objeção de preço é educado sobre valor e aceita agendar call',
    turns: [
      {
        user: 'Quanto custa um site?',
        expectedIntent: 'pergunta_preco'
      },
      {
        user: 'Nossa, muito caro!',
        expectedIntent: 'objecao_preco',
        expectedContains: 'valor'
      },
      {
        user: 'Ok, faz sentido. Vamos conversar',
        expectedActions: ['buscar_slots']
      }
    ],
    finalAssertions: [
      { field: 'stage', operator: 'in', value: ['Segundo Contato', 'Reunião Agendada'] }
    ]
  },

  {
    name: 'Solicitação de Handoff',
    description: 'Lead solicita falar com humano e handoff é executado',
    turns: [
      {
        user: 'Quero falar com uma pessoa real',
        expectedIntent: 'falar_humano',
        expectedActions: ['solicitar_handoff']
      }
    ],
    finalAssertions: [
      { field: 'metadata', operator: 'has_key', value: 'handoff_solicitado' }
    ]
  },

  {
    name: 'Pergunta sobre Prazo',
    description: 'Lead pergunta sobre prazo e recebe resposta rápida',
    turns: [
      {
        user: 'Quanto tempo leva pra fazer um site?',
        expectedIntent: 'pergunta_prazo',
        expectedRegex: /\d+\s*(dias|dia)/i
      }
    ],
    finalAssertions: []
  },

  {
    name: 'Interesse em Sistema Complexo',
    description: 'Lead interessado em sistema customizado recebe tratamento diferenciado',
    turns: [
      {
        user: 'Preciso de um sistema de gestão completo',
        expectedContains: 'sistema'
      },
      {
        user: 'Sim, sistema de ERP customizado',
        expectedActions: ['atualizar_lead']
      },
      {
        user: 'Quanto custa?',
        expectedRegex: /20\.?000|20 mil/
      }
    ],
    finalAssertions: [
      { field: 'necessidade', value: 'Sistemas' }
    ]
  },

  {
    name: 'Lead Qualificado Rápido',
    description: 'Lead qualificado que já sabe o que quer e tem budget definido',
    turns: [
      {
        user: 'Oi! Preciso de um site institucional, tenho R$ 3 mil de budget e preciso em 15 dias. Sou o CEO. Vamos agendar?',
        expectedActions: ['registrar_bant', 'calcular_score', 'buscar_slots']
      }
    ],
    finalAssertions: [
      { field: 'score_bant', operator: '>=', value: 70 }
    ]
  },

  {
    name: 'Sentimento Negativo - Recovery',
    description: 'Lead frustrado recebe tratamento empático',
    turns: [
      {
        user: 'Tá muito confuso isso, não estou entendendo nada',
        expectedContains: 'simplificar'
      }
    ],
    finalAssertions: [
      { field: 'last_sentiment', value: 'negative' }
    ]
  },

  {
    name: 'Como Funciona o Processo',
    description: 'Lead pergunta sobre processo e etapas',
    turns: [
      {
        user: 'Como funciona o processo de desenvolvimento?',
        expectedIntent: 'pergunta_como_funciona',
        expectedContains: 'etapa'
      }
    ],
    finalAssertions: []
  }
];

// Função auxiliar para executar um caso de teste
async function runTestCase(testCase: TestCase, baseUrl: string): Promise<boolean> {
  console.log(`\n🧪 Testando: ${testCase.name}`);
  console.log(`   ${testCase.description}`);
  
  const testPhone = `test_${Date.now()}@test.com`;
  let allPassed = true;

  try {
    for (let i = 0; i < testCase.turns.length; i++) {
      const turn = testCase.turns[i];
      console.log(`\n   Turn ${i + 1}: "${turn.user}"`);
      
      // Chamar orchestrator
      const response = await fetch(`${baseUrl}/functions/v1/orchestrator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') || ''
        },
        body: JSON.stringify({
          phone: testPhone,
          message: turn.user
        })
      });

      if (!response.ok) {
        console.error(`   ❌ Request failed: ${response.status}`);
        allPassed = false;
        continue;
      }

      const result = await response.json();

      // Validar intent
      if (turn.expectedIntent) {
        if (result.intent === turn.expectedIntent) {
          console.log(`   ✓ Intent correto: ${turn.expectedIntent}`);
        } else {
          console.log(`   ❌ Intent esperado: ${turn.expectedIntent}, recebido: ${result.intent || 'none'}`);
          allPassed = false;
        }
      }

      // Validar conteúdo da resposta
      if (turn.expectedContains) {
        const contains = result.response?.toLowerCase().includes(turn.expectedContains.toLowerCase());
        if (contains) {
          console.log(`   ✓ Resposta contém: "${turn.expectedContains}"`);
        } else {
          console.log(`   ❌ Resposta deveria conter: "${turn.expectedContains}"`);
          allPassed = false;
        }
      }

      // Validar com regex
      if (turn.expectedRegex) {
        if (turn.expectedRegex.test(result.response || '')) {
          console.log(`   ✓ Resposta match regex`);
        } else {
          console.log(`   ❌ Resposta não match regex: ${turn.expectedRegex}`);
          allPassed = false;
        }
      }

      // Pequeno delay entre mensagens
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Validar estado final do lead
    // (Aqui você precisaria buscar o lead no banco e validar os assertions)

    if (allPassed) {
      console.log(`\n✅ Teste "${testCase.name}" PASSOU\n`);
    } else {
      console.log(`\n❌ Teste "${testCase.name}" FALHOU\n`);
    }

    return allPassed;

  } catch (error) {
    console.error(`\n❌ Erro executando teste "${testCase.name}":`, error);
    return false;
  }
}

// Função principal para executar todos os testes
async function runAllTests() {
  const baseUrl = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
  
  console.log('🚀 Iniciando Suite de Testes do Agente Conversacional\n');
  console.log(`📍 Base URL: ${baseUrl}\n`);
  console.log('=' .repeat(80));

  const results = {
    total: testCases.length,
    passed: 0,
    failed: 0
  };

  for (const testCase of testCases) {
    const passed = await runTestCase(testCase, baseUrl);
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    // Delay entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('=' .repeat(80));
  console.log('\n📊 RESUMO DOS TESTES\n');
  console.log(`Total de testes: ${results.total}`);
  console.log(`✅ Passou: ${results.passed}`);
  console.log(`❌ Falhou: ${results.failed}`);
  console.log(`📈 Taxa de sucesso: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

  // Exit code baseado nos resultados
  Deno.exit(results.failed === 0 ? 0 : 1);
}

// Executar testes se chamado diretamente
if (import.meta.main) {
  await runAllTests();
}

export { testCases, runTestCase, runAllTests };
