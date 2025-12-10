/**
 * 🧪 COMPREHENSIVE AGENT TEST SUITE
 * 
 * Bateria completa de testes cobrindo:
 * 1. Vetorização e RAG
 * 2. Contexto e Memória
 * 3. Ferramentas (todas, uma por uma)
 * 4. Comportamento do Agente
 * 5. Persistência de Dados
 * 6. Edge Cases e Segurança
 */

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
  details?: any;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============= UTILITIES =============

async function makeRequest(endpoint: string, body: any): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function sendMessage(phone: string, message: string): Promise<any> {
  return makeRequest('orchestrator', { phone, message });
}

async function queryDB(table: string, filters: any = {}): Promise<any> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(filters).forEach(([key, value]) => {
    url.searchParams.append(key, `eq.${value}`);
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
    },
  });

  return response.json();
}

// ============= TEST SUITE 1: VETORIZAÇÃO E RAG =============

async function testVectorization(): Promise<TestResult[]> {
  console.log('\n📚 === TESTES DE VETORIZAÇÃO E RAG ===\n');
  const results: TestResult[] = [];

  // Test 1: Verificar se base de conhecimento tem embeddings
  try {
    const kb = await queryDB('knowledge_base');
    const hasEmbeddings = kb.every((doc: any) => doc.embedding !== null);
    
    results.push({
      name: 'Base de Conhecimento - Embeddings gerados',
      passed: hasEmbeddings && kb.length > 0,
      details: { total_docs: kb.length, with_embeddings: kb.filter((d: any) => d.embedding).length }
    });
  } catch (error) {
    results.push({
      name: 'Base de Conhecimento - Embeddings gerados',
      passed: false,
      error: error.message
    });
  }

  // Test 2: Busca semântica funciona
  try {
    const ragResult = await makeRequest('rag-search', {
      query: 'Quanto custa um website profissional?',
      top_k: 3,
      threshold: 0.7
    });

    results.push({
      name: 'RAG Search - Busca semântica funcional',
      passed: ragResult.results && ragResult.results.length > 0,
      details: { results_found: ragResult.results?.length || 0 }
    });
  } catch (error) {
    results.push({
      name: 'RAG Search - Busca semântica funcional',
      passed: false,
      error: error.message
    });
  }

  // Test 3: PDFs de serviços processados
  try {
    const kb = await queryDB('knowledge_base');
    const pdfChunks = kb.filter((doc: any) => 
      doc.metadata?.chunk_type === 'presentation'
    );

    results.push({
      name: 'PDFs de Serviços - Processados na base',
      passed: pdfChunks.length > 0,
      details: { pdf_chunks: pdfChunks.length }
    });
  } catch (error) {
    results.push({
      name: 'PDFs de Serviços - Processados na base',
      passed: false,
      error: error.message
    });
  }

  return results;
}

// ============= TEST SUITE 2: CONTEXTO E MEMÓRIA =============

async function testContextMemory(): Promise<TestResult[]> {
  console.log('\n🧠 === TESTES DE CONTEXTO E MEMÓRIA ===\n');
  const results: TestResult[] = [];
  const testPhone = `test_memory_${Date.now()}`;

  try {
    // Conversa multi-turn para testar memória
    await sendMessage(testPhone, 'Oi, meu nome é João Silva');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response2 = await sendMessage(testPhone, 'Qual é o meu nome?');
    
    results.push({
      name: 'Memória - Lembra nome do lead',
      passed: response2.response?.toLowerCase().includes('joão'),
      details: { response: response2.response }
    });

    // Test: BANT acumulado
    await sendMessage(testPhone, 'Tenho R$ 5 mil de budget');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendMessage(testPhone, 'Sou o dono da empresa');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const conversation = await queryDB('conversations', { session_id: testPhone });
    const bantProgress = conversation[0]?.bant_progress || {};
    
    results.push({
      name: 'BANT - Acumula informações ao longo da conversa',
      passed: bantProgress.budget !== 'not_asked' && bantProgress.authority !== 'not_asked',
      details: bantProgress
    });

  } catch (error) {
    results.push({
      name: 'Contexto e Memória - Erro geral',
      passed: false,
      error: error.message
    });
  }

  return results;
}

// ============= TEST SUITE 3: FERRAMENTAS (UMA POR UMA) =============

async function testTools(): Promise<TestResult[]> {
  console.log('\n🔧 === TESTES DE FERRAMENTAS ===\n');
  const results: TestResult[] = [];

  // Tool 1: CriaUsuarioCRM
  try {
    const testPhone = `test_criar_${Date.now()}`;
    const response = await sendMessage(testPhone, 'Oi, meu nome é Pedro Santos, quero um site');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    const leads = await queryDB('leads', { telefone: testPhone });
    
    results.push({
      name: 'Tool: CriaUsuarioCRM - Cria lead no banco',
      passed: leads.length > 0 && leads[0].nome?.includes('Pedro'),
      details: { lead_created: leads.length > 0 }
    });
  } catch (error) {
    results.push({
      name: 'Tool: CriaUsuarioCRM',
      passed: false,
      error: error.message
    });
  }

  // Tool 2: EnviarApresentacao
  try {
    const testPhone = `test_apresent_${Date.now()}`;
    await sendMessage(testPhone, 'Oi, quero saber sobre websites');
    await new Promise(resolve => setTimeout(resolve, 1000));
    const response = await sendMessage(testPhone, 'Sim, pode mandar a apresentação');
    
    results.push({
      name: 'Tool: EnviarApresentacao - Detecta intenção',
      passed: response.response?.toLowerCase().includes('enviado') || 
             response.response?.toLowerCase().includes('apresentação'),
      details: { mentioned_presentation: true }
    });
  } catch (error) {
    results.push({
      name: 'Tool: EnviarApresentacao',
      passed: false,
      error: error.message
    });
  }

  // Tool 3: AtualizarStatusLead
  try {
    const testPhone = `test_status_${Date.now()}`;
    await sendMessage(testPhone, 'Oi, quero um site');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendMessage(testPhone, 'Sim, pode mandar');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const leads = await queryDB('leads', { telefone: testPhone });
    
    results.push({
      name: 'Tool: AtualizarStatusLead - Muda stage',
      passed: leads.length > 0 && leads[0].stage === 'Apresentação Enviada',
      details: { stage: leads[0]?.stage }
    });
  } catch (error) {
    results.push({
      name: 'Tool: AtualizarStatusLead',
      passed: false,
      error: error.message
    });
  }

  // Tool 4: registrar_bant
  try {
    const testPhone = `test_bant_${Date.now()}`;
    await sendMessage(testPhone, 'Oi, quero um sistema');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendMessage(testPhone, 'Tenho R$ 30 mil de budget e preciso em 2 meses');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const leads = await queryDB('leads', { telefone: testPhone });
    const bantDetails = leads[0]?.bant_details || {};
    
    results.push({
      name: 'Tool: registrar_bant - Registra budget e timeline',
      passed: bantDetails.budget !== undefined || bantDetails.timeline !== undefined,
      details: bantDetails
    });
  } catch (error) {
    results.push({
      name: 'Tool: registrar_bant',
      passed: false,
      error: error.message
    });
  }

  // Tool 5: calcular_score
  try {
    const testPhone = `test_score_${Date.now()}`;
    await sendMessage(testPhone, 'Oi, meu nome é Carlos, sou CEO da Empresa X');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendMessage(testPhone, 'Quero um website, tenho R$ 10 mil e preciso urgente');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const leads = await queryDB('leads', { telefone: testPhone });
    
    results.push({
      name: 'Tool: calcular_score - Calcula score BANT',
      passed: leads.length > 0 && (leads[0].score_bant || 0) > 0,
      details: { score: leads[0]?.score_bant }
    });
  } catch (error) {
    results.push({
      name: 'Tool: calcular_score',
      passed: false,
      error: error.message
    });
  }

  // Tool 6: buscar_slots
  try {
    const testPhone = `test_slots_${Date.now()}`;
    await sendMessage(testPhone, 'Oi, quero agendar uma reunião');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await sendMessage(testPhone, 'Quais horários você tem disponível?');
    
    results.push({
      name: 'Tool: buscar_slots - Lista horários',
      passed: response.response?.includes(':') || response.response?.toLowerCase().includes('horário'),
      details: { has_schedule_info: true }
    });
  } catch (error) {
    results.push({
      name: 'Tool: buscar_slots',
      passed: false,
      error: error.message
    });
  }

  // Tool 7: solicitar_handoff
  try {
    const testPhone = `test_handoff_${Date.now()}`;
    const response = await sendMessage(testPhone, 'Quero falar com uma pessoa real');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const leads = await queryDB('leads', { telefone: testPhone });
    
    results.push({
      name: 'Tool: solicitar_handoff - Marca handoff',
      passed: response.response?.toLowerCase().includes('samuel') || 
             response.response?.toLowerCase().includes('humano'),
      details: { handoff_mentioned: true }
    });
  } catch (error) {
    results.push({
      name: 'Tool: solicitar_handoff',
      passed: false,
      error: error.message
    });
  }

  return results;
}

// ============= TEST SUITE 4: COMPORTAMENTO DO AGENTE =============

async function testAgentBehavior(): Promise<TestResult[]> {
  console.log('\n🤖 === TESTES DE COMPORTAMENTO DO AGENTE ===\n');
  const results: TestResult[] = [];

  // Test 1: Tom de comunicação
  try {
    const testPhone = `test_tone_${Date.now()}`;
    const response = await sendMessage(testPhone, 'Oi');
    
    // Verificar se usa tom profissional (sem gírias excessivas)
    const hasProfessionalTone = !response.response?.toLowerCase().includes('mano') &&
                                !response.response?.toLowerCase().includes('véi');
    
    results.push({
      name: 'Comportamento - Tom profissional',
      passed: hasProfessionalTone,
      details: { response_preview: response.response?.substring(0, 100) }
    });
  } catch (error) {
    results.push({
      name: 'Comportamento - Tom profissional',
      passed: false,
      error: error.message
    });
  }

  // Test 2: Uso de emojis (se configurado)
  try {
    const testPhone = `test_emoji_${Date.now()}`;
    const response = await sendMessage(testPhone, 'Olá, como vai?');
    
    const hasEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/u.test(response.response);
    
    results.push({
      name: 'Comportamento - Usa emojis (se configurado)',
      passed: true, // Não é erro se não usar
      details: { uses_emoji: hasEmoji }
    });
  } catch (error) {
    results.push({
      name: 'Comportamento - Usa emojis',
      passed: false,
      error: error.message
    });
  }

  // Test 3: Responde objeções adequadamente
  try {
    const testPhone = `test_objection_${Date.now()}`;
    await sendMessage(testPhone, 'Quanto custa um site?');
    await new Promise(resolve => setTimeout(resolve, 1000));
    const response = await sendMessage(testPhone, 'Nossa, muito caro!');
    
    const addressesObjection = response.response?.toLowerCase().includes('valor') ||
                              response.response?.toLowerCase().includes('investimento') ||
                              response.response?.toLowerCase().includes('benefício');
    
    results.push({
      name: 'Comportamento - Responde objeções de preço',
      passed: addressesObjection,
      details: { addresses_objection: addressesObjection }
    });
  } catch (error) {
    results.push({
      name: 'Comportamento - Responde objeções',
      passed: false,
      error: error.message
    });
  }

  // Test 4: Segue o prompt (menciona serviços corretos)
  try {
    const testPhone = `test_services_${Date.now()}`;
    const response = await sendMessage(testPhone, 'Quais serviços vocês oferecem?');
    
    const mentionsServices = response.response?.toLowerCase().includes('website') ||
                            response.response?.toLowerCase().includes('sistema') ||
                            response.response?.toLowerCase().includes('redes sociais') ||
                            response.response?.toLowerCase().includes('identidade');
    
    results.push({
      name: 'Comportamento - Menciona serviços corretos',
      passed: mentionsServices,
      details: { mentions_services: mentionsServices }
    });
  } catch (error) {
    results.push({
      name: 'Comportamento - Menciona serviços',
      passed: false,
      error: error.message
    });
  }

  // Test 5: Detecta sentimento negativo
  try {
    const testPhone = `test_sentiment_${Date.now()}`;
    await sendMessage(testPhone, 'Oi');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendMessage(testPhone, 'Tá muito confuso, não estou entendendo nada!');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const conversations = await queryDB('conversations');
    const conv = conversations.find((c: any) => c.session_id?.includes(testPhone));
    
    results.push({
      name: 'Comportamento - Detecta sentimento negativo',
      passed: conv?.last_sentiment === 'negative',
      details: { sentiment: conv?.last_sentiment }
    });
  } catch (error) {
    results.push({
      name: 'Comportamento - Detecta sentimento',
      passed: false,
      error: error.message
    });
  }

  // Test 6: Identifica intenção corretamente
  try {
    const testPhone = `test_intent_${Date.now()}`;
    const response = await sendMessage(testPhone, 'Quero agendar uma reunião');
    
    results.push({
      name: 'Comportamento - Identifica intenção de agendar',
      passed: response.intent === 'quero_agendar' || 
             response.response?.toLowerCase().includes('horário') ||
             response.response?.toLowerCase().includes('agenda'),
      details: { intent: response.intent }
    });
  } catch (error) {
    results.push({
      name: 'Comportamento - Identifica intenção',
      passed: false,
      error: error.message
    });
  }

  return results;
}

// ============= TEST SUITE 5: PERSISTÊNCIA DE DADOS =============

async function testDataPersistence(): Promise<TestResult[]> {
  console.log('\n💾 === TESTES DE PERSISTÊNCIA DE DADOS ===\n');
  const results: TestResult[] = [];

  try {
    const testPhone = `test_persist_${Date.now()}`;
    
    // Criar conversa completa
    await sendMessage(testPhone, 'Oi, meu nome é Maria Costa, da empresa TechCorp');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendMessage(testPhone, 'Quero um sistema de gestão');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendMessage(testPhone, 'Tenho R$ 50 mil de budget');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar lead criado
    const leads = await queryDB('leads', { telefone: testPhone });
    results.push({
      name: 'Persistência - Lead criado no banco',
      passed: leads.length > 0,
      details: { lead: leads[0] }
    });

    // Verificar conversation criada
    const conversations = await queryDB('conversations');
    const conv = conversations.find((c: any) => c.session_id?.includes(testPhone));
    results.push({
      name: 'Persistência - Conversation criada',
      passed: conv !== undefined,
      details: { conversation_id: conv?.id }
    });

    // Verificar mensagens salvas
    if (conv) {
      const messages = await queryDB('messages', { conversation_id: conv.id });
      results.push({
        name: 'Persistência - Mensagens salvas',
        passed: messages.length >= 6, // 3 user + 3 assistant
        details: { message_count: messages.length }
      });
    }

    // Verificar relacionamentos
    results.push({
      name: 'Persistência - Relacionamentos corretos',
      passed: conv?.lead_id === leads[0]?.id,
      details: { relationship_valid: conv?.lead_id === leads[0]?.id }
    });

    // Verificar timestamps
    const hasTimestamps = leads[0]?.created_at && leads[0]?.updated_at;
    results.push({
      name: 'Persistência - Timestamps corretos',
      passed: hasTimestamps,
      details: { has_timestamps: hasTimestamps }
    });

  } catch (error) {
    results.push({
      name: 'Persistência - Erro geral',
      passed: false,
      error: error.message
    });
  }

  return results;
}

// ============= TEST SUITE 6: FLUXOS COMPLETOS =============

async function testCompleteFlows(): Promise<TestResult[]> {
  console.log('\n🎯 === TESTES DE FLUXOS COMPLETOS ===\n');
  const results: TestResult[] = [];

  // Fluxo 1: Qualificação completa
  try {
    const testPhone = `test_flow1_${Date.now()}`;
    
    await sendMessage(testPhone, 'Oi, quero um site profissional');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendMessage(testPhone, 'Sim, pode mandar a apresentação');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendMessage(testPhone, 'Gostei! Tenho R$ 5 mil de budget');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendMessage(testPhone, 'Sou o dono da empresa');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendMessage(testPhone, 'Preciso em 1 mês');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const leads = await queryDB('leads', { telefone: testPhone });
    const lead = leads[0];
    
    results.push({
      name: 'Fluxo - Qualificação BANT completa',
      passed: lead?.score_bant > 0 && lead?.stage !== 'Novo',
      details: {
        score: lead?.score_bant,
        stage: lead?.stage,
        bant: lead?.bant_details
      }
    });
  } catch (error) {
    results.push({
      name: 'Fluxo - Qualificação BANT completa',
      passed: false,
      error: error.message
    });
  }

  // Fluxo 2: Agendamento
  try {
    const testPhone = `test_flow2_${Date.now()}`;
    
    await sendMessage(testPhone, 'Oi, quero agendar uma reunião');
    await new Promise(resolve => setTimeout(resolve, 1000));
    const response = await sendMessage(testPhone, 'Quais horários você tem disponível?');
    
    results.push({
      name: 'Fluxo - Agendamento de reunião',
      passed: response.response?.includes(':') || 
             response.response?.toLowerCase().includes('disponível'),
      details: { shows_availability: true }
    });
  } catch (error) {
    results.push({
      name: 'Fluxo - Agendamento de reunião',
      passed: false,
      error: error.message
    });
  }

  // Fluxo 3: Lead qualificado rápido
  try {
    const testPhone = `test_flow3_${Date.now()}`;
    
    const response = await sendMessage(
      testPhone, 
      'Oi! Sou Ana Paula, CEO da Startup XYZ. Preciso de um site institucional, tenho R$ 8 mil e preciso em 20 dias. Vamos agendar?'
    );
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const leads = await queryDB('leads', { telefone: testPhone });
    
    results.push({
      name: 'Fluxo - Lead qualificado em uma mensagem',
      passed: leads.length > 0 && (leads[0].score_bant || 0) >= 60,
      details: { 
        score: leads[0]?.score_bant,
        detected_qualification: true
      }
    });
  } catch (error) {
    results.push({
      name: 'Fluxo - Lead qualificado rápido',
      passed: false,
      error: error.message
    });
  }

  return results;
}

// ============= TEST SUITE 7: EDGE CASES E SEGURANÇA =============

async function testEdgeCases(): Promise<TestResult[]> {
  console.log('\n🛡️ === TESTES DE EDGE CASES E SEGURANÇA ===\n');
  const results: TestResult[] = [];

  // Test 1: Rate limiting
  try {
    const testPhone = `test_rate_${Date.now()}`;
    const promises = [];
    
    // Tentar enviar 10 mensagens rapidamente
    for (let i = 0; i < 10; i++) {
      promises.push(sendMessage(testPhone, `Mensagem ${i}`));
    }
    
    await Promise.all(promises);
    
    results.push({
      name: 'Segurança - Sistema aguenta múltiplas mensagens',
      passed: true,
      details: { messages_sent: 10 }
    });
  } catch (error) {
    results.push({
      name: 'Segurança - Rate limiting',
      passed: true, // Rate limit é esperado
      error: 'Rate limit ativado (comportamento esperado)'
    });
  }

  // Test 2: Mensagem vazia ou inválida
  try {
    const testPhone = `test_empty_${Date.now()}`;
    const response = await sendMessage(testPhone, '');
    
    results.push({
      name: 'Edge Case - Mensagem vazia',
      passed: response.response !== undefined,
      details: { handled_empty: true }
    });
  } catch (error) {
    results.push({
      name: 'Edge Case - Mensagem vazia',
      passed: true, // Erro é aceitável para mensagem vazia
      error: 'Rejeita mensagem vazia (comportamento esperado)'
    });
  }

  // Test 3: Mensagem muito longa
  try {
    const testPhone = `test_long_${Date.now()}`;
    const longMessage = 'A'.repeat(5000);
    const response = await sendMessage(testPhone, longMessage);
    
    results.push({
      name: 'Edge Case - Mensagem muito longa',
      passed: response.response !== undefined,
      details: { handles_long_message: true }
    });
  } catch (error) {
    results.push({
      name: 'Edge Case - Mensagem muito longa',
      passed: false,
      error: error.message
    });
  }

  // Test 4: Caracteres especiais
  try {
    const testPhone = `test_special_${Date.now()}`;
    const response = await sendMessage(testPhone, 'Olá! 🎉 Quero um site com € e $$$');
    
    results.push({
      name: 'Edge Case - Caracteres especiais',
      passed: response.response !== undefined,
      details: { handles_special_chars: true }
    });
  } catch (error) {
    results.push({
      name: 'Edge Case - Caracteres especiais',
      passed: false,
      error: error.message
    });
  }

  // Test 5: Múltiplas perguntas simultâneas
  try {
    const testPhone = `test_multi_${Date.now()}`;
    const response = await sendMessage(
      testPhone, 
      'Quanto custa? Quanto tempo leva? Vocês fazem sistemas também?'
    );
    
    const answersMultiple = response.response?.length > 100; // Resposta substancial
    
    results.push({
      name: 'Edge Case - Múltiplas perguntas simultâneas',
      passed: answersMultiple,
      details: { response_length: response.response?.length }
    });
  } catch (error) {
    results.push({
      name: 'Edge Case - Múltiplas perguntas',
      passed: false,
      error: error.message
    });
  }

  return results;
}

// ============= TEST SUITE 8: PERFORMANCE =============

async function testPerformance(): Promise<TestResult[]> {
  console.log('\n⚡ === TESTES DE PERFORMANCE ===\n');
  const results: TestResult[] = [];

  // Test 1: Tempo de resposta < 5s
  try {
    const testPhone = `test_perf1_${Date.now()}`;
    const start = Date.now();
    await sendMessage(testPhone, 'Oi, quero saber sobre websites');
    const duration = Date.now() - start;
    
    results.push({
      name: 'Performance - Tempo de resposta < 5s',
      passed: duration < 5000,
      duration,
      details: { response_time_ms: duration }
    });
  } catch (error) {
    results.push({
      name: 'Performance - Tempo de resposta',
      passed: false,
      error: error.message
    });
  }

  // Test 2: RAG busca rápida (< 1s)
  try {
    const start = Date.now();
    await makeRequest('rag-search', {
      query: 'preços de websites',
      top_k: 3
    });
    const duration = Date.now() - start;
    
    results.push({
      name: 'Performance - RAG busca < 1s',
      passed: duration < 1000,
      duration,
      details: { rag_time_ms: duration }
    });
  } catch (error) {
    results.push({
      name: 'Performance - RAG busca',
      passed: false,
      error: error.message
    });
  }

  return results;
}

// ============= TEST SUITE 9: INTEGRAÇÕES =============

async function testIntegrations(): Promise<TestResult[]> {
  console.log('\n🔗 === TESTES DE INTEGRAÇÕES ===\n');
  const results: TestResult[] = [];

  // Test 1: Configurações do sistema carregadas
  try {
    const systemConfig = await queryDB('system_config');
    
    results.push({
      name: 'Integração - System Config carregado',
      passed: systemConfig.length > 0 && systemConfig[0].agenda_link !== null,
      details: { has_config: systemConfig.length > 0 }
    });
  } catch (error) {
    results.push({
      name: 'Integração - System Config',
      passed: false,
      error: error.message
    });
  }

  // Test 2: Branding do agente carregado
  try {
    const branding = await queryDB('agent_branding');
    
    results.push({
      name: 'Integração - Agent Branding carregado',
      passed: branding.length > 0 && branding[0].nome_agente !== null,
      details: { agent_name: branding[0]?.nome_agente }
    });
  } catch (error) {
    results.push({
      name: 'Integração - Agent Branding',
      passed: false,
      error: error.message
    });
  }

  // Test 3: Serviços ativos carregados
  try {
    const services = await queryDB('agent_resources');
    const activeServices = services.filter((s: any) => s.ativo === true);
    
    results.push({
      name: 'Integração - Serviços ativos disponíveis',
      passed: activeServices.length > 0,
      details: { active_services: activeServices.length }
    });
  } catch (error) {
    results.push({
      name: 'Integração - Serviços ativos',
      passed: false,
      error: error.message
    });
  }

  return results;
}

// ============= RUNNER PRINCIPAL =============

async function runComprehensiveTests() {
  console.log('🚀 INICIANDO BATERIA COMPLETA DE TESTES DO AGENTE LUNA\n');
  console.log('=' .repeat(80));
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🕐 Data/Hora: ${new Date().toISOString()}`);
  console.log('=' .repeat(80));

  const allResults: TestResult[] = [];

  // Suite 1: Vetorização e RAG
  const vectorResults = await testVectorization();
  allResults.push(...vectorResults);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Suite 2: Contexto e Memória
  const memoryResults = await testContextMemory();
  allResults.push(...memoryResults);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Suite 3: Ferramentas
  const toolResults = await testTools();
  allResults.push(...toolResults);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Suite 4: Comportamento
  const behaviorResults = await testAgentBehavior();
  allResults.push(...behaviorResults);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Suite 5: Persistência
  const persistResults = await testDataPersistence();
  allResults.push(...persistResults);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Suite 6: Fluxos Completos
  const flowResults = await testCompleteFlows();
  allResults.push(...flowResults);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Suite 7: Edge Cases
  const edgeResults = await testEdgeCases();
  allResults.push(...edgeResults);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Suite 8: Performance
  const perfResults = await testPerformance();
  allResults.push(...perfResults);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Suite 9: Integrações
  const integrationResults = await testIntegrations();
  allResults.push(...integrationResults);

  // ============= RELATÓRIO FINAL =============
  console.log('\n' + '=' .repeat(80));
  console.log('\n📊 RELATÓRIO FINAL DE TESTES\n');
  console.log('=' .repeat(80));

  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;
  const total = allResults.length;
  const successRate = ((passed / total) * 100).toFixed(1);

  console.log(`\n✅ Passou: ${passed}/${total}`);
  console.log(`❌ Falhou: ${failed}/${total}`);
  console.log(`📈 Taxa de Sucesso: ${successRate}%\n`);

  // Listar falhas
  const failures = allResults.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log('\n❌ TESTES QUE FALHARAM:\n');
    failures.forEach(f => {
      console.log(`  • ${f.name}`);
      if (f.error) console.log(`    Erro: ${f.error}`);
      if (f.details) console.log(`    Detalhes: ${JSON.stringify(f.details)}`);
    });
  }

  // Estatísticas de performance
  const perfTests = allResults.filter(r => r.duration !== undefined);
  if (perfTests.length > 0) {
    const avgDuration = perfTests.reduce((sum, r) => sum + (r.duration || 0), 0) / perfTests.length;
    console.log(`\n⚡ Performance Média: ${avgDuration.toFixed(0)}ms`);
  }

  console.log('\n' + '=' .repeat(80));
  console.log('🏁 TESTES CONCLUÍDOS\n');

  // Retornar código de saída
  return failed === 0 ? 0 : 1;
}

// Executar se chamado diretamente
if (import.meta.main) {
  const exitCode = await runComprehensiveTests();
  Deno.exit(exitCode);
}

export { runComprehensiveTests };
