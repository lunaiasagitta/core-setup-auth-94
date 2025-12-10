# 🧪 Suite de Testes do Agente Luna

Esta pasta contém os testes automatizados do sistema de agente conversacional.

## 📁 Arquivos de Teste

### `comprehensive-agent-tests.ts`
Bateria completa de testes cobrindo todos os aspectos do sistema:

**1. Vetorização e RAG (3 testes)**
- ✅ Embeddings gerados na base de conhecimento
- ✅ Busca semântica funcional
- ✅ PDFs de serviços processados

**2. Contexto e Memória (2 testes)**
- ✅ Lembra nome do lead
- ✅ BANT acumulado ao longo da conversa

**3. Ferramentas - Uma por Uma (7 testes)**
- ✅ CriaUsuarioCRM - Cria lead no banco
- ✅ EnviarApresentacao - Detecta intenção
- ✅ AtualizarStatusLead - Muda stage
- ✅ registrar_bant - Registra budget e timeline
- ✅ calcular_score - Calcula score BANT
- ✅ buscar_slots - Lista horários
- ✅ solicitar_handoff - Marca handoff

**4. Comportamento do Agente (6 testes)**
- ✅ Tom profissional
- ✅ Usa emojis (se configurado)
- ✅ Responde objeções de preço
- ✅ Menciona serviços corretos
- ✅ Detecta sentimento negativo
- ✅ Identifica intenção de agendar

**5. Persistência de Dados (5 testes)**
- ✅ Lead criado no banco
- ✅ Conversation criada
- ✅ Mensagens salvas
- ✅ Relacionamentos corretos
- ✅ Timestamps corretos

**6. Fluxos Completos (3 testes)**
- ✅ Qualificação BANT completa
- ✅ Agendamento de reunião
- ✅ Lead qualificado em uma mensagem

**7. Edge Cases e Segurança (5 testes)**
- ✅ Sistema aguenta múltiplas mensagens
- ✅ Mensagem vazia
- ✅ Mensagem muito longa
- ✅ Caracteres especiais
- ✅ Múltiplas perguntas simultâneas

**8. Performance (2 testes)**
- ✅ Tempo de resposta < 5s
- ✅ RAG busca < 1s

**9. Integrações (3 testes)**
- ✅ System Config carregado
- ✅ Agent Branding carregado
- ✅ Serviços ativos disponíveis

**Total: 36 testes automatizados**

### `agent-conversations.test.ts`
Testes de conversação baseados em cenários:
- Fluxo completo de qualificação
- Objeção de preço
- Solicitação de handoff
- Perguntas sobre prazo
- Sistema complexo
- Lead qualificado rápido
- Sentimento negativo
- Como funciona o processo

## 🚀 Como Executar

### Executar todos os testes abrangentes:
```bash
deno run --allow-net --allow-env tests/comprehensive-agent-tests.ts
```

### Executar testes de conversação:
```bash
deno run --allow-net --allow-env tests/agent-conversations.test.ts
```

## 📊 Interpretando Resultados

### Métricas de Sucesso:
- **90-100%**: Excelente - Sistema funcionando perfeitamente
- **80-89%**: Bom - Alguns ajustes podem ser necessários
- **70-79%**: Atenção - Revisar funcionalidades que falharam
- **< 70%**: Crítico - Sistema precisa de correções importantes

### Tipos de Falha:
- **Tool Execution**: Ferramenta não foi chamada ou falhou
- **Response Quality**: Resposta não atende expectativas
- **Data Persistence**: Dados não foram salvos corretamente
- **Performance**: Tempo de resposta acima do esperado

## 🔧 Configuração Necessária

Os testes requerem as seguintes variáveis de ambiente:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

Essas variáveis são automaticamente injetadas nas edge functions do Lovable Cloud.

## 📝 Adicionando Novos Testes

Para adicionar novos testes, siga o padrão:

```typescript
async function testNovaFuncionalidade(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  try {
    const testPhone = `test_nova_${Date.now()}`;
    const response = await sendMessage(testPhone, 'mensagem de teste');
    
    results.push({
      name: 'Descrição do teste',
      passed: /* condição de sucesso */,
      details: { /* informações adicionais */ }
    });
  } catch (error) {
    results.push({
      name: 'Descrição do teste',
      passed: false,
      error: error.message
    });
  }
  
  return results;
}
```

## 🎯 Recomendações

1. **Execute os testes regularmente** após mudanças no prompt ou nas ferramentas
2. **Monitore a taxa de sucesso** - deve estar acima de 85%
3. **Investigue falhas imediatamente** - podem indicar regressões
4. **Adicione testes para bugs** - quando encontrar um bug, adicione um teste
5. **Use em CI/CD** - integre os testes no pipeline de deploy

## 🐛 Debugging

Se um teste falhar:
1. Veja os detalhes (`details`) do resultado
2. Execute o teste individualmente com logs detalhados
3. Verifique os logs das edge functions (orchestrator, rag-search, etc.)
4. Confirme que a base de conhecimento está atualizada
5. Valide que as configurações do agente estão corretas

## 📌 Notas Importantes

- Testes usam telefones com prefixo `test_` para facilitar identificação
- Cada teste cria novos leads para evitar interferência
- Delays entre mensagens simulam comportamento real
- Testes não afetam dados de produção (usam telefones de teste)
