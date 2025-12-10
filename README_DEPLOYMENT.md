# 🚀 Guia de Deploy e Finalização - Agente SDR A2A

## ✅ Status Atual do Projeto

**Fase 1**: ✅ 100% Completo  
**Fase 2**: ✅ 90% Completo  
**Fase 3**: ✅ 95% Completo  

**SISTEMA PRONTO PARA TESTES E DEPLOY FINAL**

---

## 📋 Pré-Requisitos para Deploy

### 1. Variáveis de Ambiente Configuradas

Todas as secrets já estão configuradas no Supabase:
- ✅ `OPENAI_API_KEY`
- ✅ `EVOLUTION_API_URL`
- ✅ `EVOLUTION_API_KEY`
- ✅ `EVOLUTION_INSTANCE_NAME`
- ✅ `EVOLUTION_WEBHOOK_SECRET` (opcional, removido da validação)
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

### 2. Edge Functions Deployadas

Todas as edge functions estão criadas e serão deployadas automaticamente:
- ✅ `orchestrator` - Processamento principal de mensagens
- ✅ `rag-search` - Busca semântica na base de conhecimento
- ✅ `whatsapp-webhook` - Recebe mensagens do WhatsApp
- ✅ `google-auth-url` - Gera URL de autorização Google
- ✅ `google-callback` - Processa callback OAuth Google
- ✅ `chat-completion` - Wrapper OpenAI para chat
- ✅ `generate-embedding` - Gera embeddings para RAG

### 3. Database Schema

Todas as tabelas estão criadas e configuradas:
- ✅ `leads` - Gerenciamento de leads
- ✅ `conversations` - Sessões de conversa
- ✅ `messages` - Histórico de mensagens
- ✅ `meetings` - Reuniões agendadas
- ✅ `calendar_slots` - Slots de agenda
- ✅ `activity_log` - Log de atividades
- ✅ `security_logs` - Log de segurança
- ✅ `blocked_numbers` - Números bloqueados
- ✅ `knowledge_base` - Base de conhecimento com pgvector
- ✅ `oauth_tokens` - Tokens de autenticação OAuth

---

## 🔧 Passos para Finalizar o Deploy

### Passo 1: Embedar Base de Conhecimento (CRÍTICO)

O sistema RAG não funcionará até que a base de conhecimento seja embedada.

```bash
# Configurar variáveis de ambiente (se rodando localmente)
export OPENAI_API_KEY="sua-chave"
export SUPABASE_URL="https://xjcxjotykzhzxapssany.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"

# Executar script de embedding
deno run --allow-net --allow-read --allow-env scripts/embed-knowledge.ts
```

**Resultado esperado:**
```
🚀 Iniciando embedding da base de conhecimento...
📁 Encontrados 4 arquivos:
📄 Processando: servicos.md
   ├─ 5 chunks criados
   ✅ servicos.md completo
...
✅ Processo concluído!
📊 Total embedado com sucesso: 18
🔍 Verificação: 18 registros na base de conhecimento
```

### Passo 2: Configurar Webhook da Evolution API

1. Acesse o dashboard da Evolution API
2. Vá em configurações da instância
3. Configure o webhook URL:
   ```
   https://xjcxjotykzhzxapssany.supabase.co/functions/v1/whatsapp-webhook
   ```
4. **NÃO configure webhook secret** (removido por conflitos)
5. Salve as configurações

### Passo 3: Conectar Google Calendar

1. Acesse a página `/settings/integrations` no sistema
2. Clique em "Conectar Google Calendar"
3. Autorize o acesso na tela do Google
4. Aguarde confirmação de conexão

### Passo 4: Configurar Número da Equipe

Edite o arquivo `supabase/functions/tools/handlers.ts` e configure o número do Samuel:

```typescript
async function notifyTeam(message: string, urgency: 'baixa' | 'media' | 'alta' = 'media') {
  const teamPhone = '5511999999999'; // ⚠️ ALTERAR PARA O NÚMERO REAL DO SAMUEL
  // ...
}
```

### Passo 5: Testar Sistema Completo

1. **Acesse a página de testes:**
   - URL: `/test-agent`
   - Esta página permite simular conversas completas

2. **Execute os testes básicos:**

   **Teste A: Lead Novo - Website**
   ```
   Input: "Oi, quero um site para minha empresa"
   Esperado:
   - Lead criado no banco
   - Necessidade identificada como "Websites"
   - Apresentação oferecida
   - RAG retorna informações de servicos.md
   ```

   **Teste B: Qualificação BANT**
   ```
   Input: "Tenho R$ 30 mil de orçamento"
   Esperado:
   - Tool registrar_bant executado
   - Campo budget preenchido
   - Score BANT atualizado
   
   Input: "Sou o dono da empresa"
   Esperado:
   - Authority registrado
   - Score aumenta
   ```

   **Teste C: Agendamento**
   ```
   Input: "Sim, quero agendar uma reunião"
   Esperado:
   - Tool buscar_slots executado
   - Slots apresentados ao lead
   
   Input: "Quarta às 10h pode ser"
   Esperado:
   - Tool agendar_reuniao executado
   - Evento criado no Google Calendar
   - Link do Meet gerado
   - Notificação enviada para equipe
   - Stage → "Reunião Agendada"
   ```

   **Teste D: Handoff**
   ```
   Input: "Quero falar com uma pessoa"
   Esperado:
   - Tool solicitar_handoff executado
   - Notificação WhatsApp enviada para equipe
   - Flag de handoff ativada
   ```

3. **Teste Real via WhatsApp:**
   - Envie uma mensagem para o número conectado na Evolution
   - Verifique se o webhook recebe a mensagem
   - Valide que o orchestrator processa
   - Confirme que a resposta é enviada de volta

### Passo 6: Validar Logs

1. **Logs do Orchestrator:**
   ```sql
   -- Ver últimas execuções
   SELECT * FROM activity_log 
   ORDER BY timestamp DESC 
   LIMIT 20;
   ```

2. **Logs de Segurança:**
   ```sql
   -- Verificar se rate limiting está funcionando
   SELECT * FROM security_logs 
   ORDER BY timestamp DESC 
   LIMIT 10;
   ```

3. **Edge Function Logs:**
   - Use a ferramenta de logs do Supabase
   - Filtre por função: `orchestrator`
   - Procure por erros ou warnings

---

## ⚠️ Problemas Conhecidos e Soluções

### Problema 1: RAG não retorna resultados

**Causa:** Base de conhecimento não foi embedada  
**Solução:** Execute o script `embed-knowledge.ts`

**Validação:**
```sql
SELECT COUNT(*) FROM knowledge_base;
-- Deve retornar > 0
```

### Problema 2: Google Calendar não cria eventos

**Causa:** Token OAuth expirado ou não configurado  
**Solução:** 
1. Reconectar no `/settings/integrations`
2. Verificar se tokens estão na tabela `oauth_tokens`

### Problema 3: Notificações não chegam

**Causa:** Número da equipe não configurado  
**Solução:** Editar `handlers.ts` com número correto do Samuel

### Problema 4: Rate limit muito restritivo

**Causa:** Limite de 50 mensagens/hora pode ser baixo para testes  
**Solução:** Ajustar limite temporariamente em `orchestrator/index.ts`:

```typescript
if (recentMessages && recentMessages > 100) { // Era 50
```

### Problema 5: Webhook não recebe mensagens

**Causa:** URL incorreta na Evolution  
**Solução:** Verificar que a URL está correta:
```
https://xjcxjotykzhzxapssany.supabase.co/functions/v1/whatsapp-webhook
```

---

## 📊 Métricas de Sucesso

Após deploy completo, validar:

- [ ] Base de conhecimento tem 15-20 registros embedados
- [ ] Teste via interface funciona completamente
- [ ] Mensagem real pelo WhatsApp recebe resposta
- [ ] RAG retorna conhecimento relevante (similarity > 0.7)
- [ ] Tools são executados corretamente
- [ ] Score BANT é calculado
- [ ] Agendamento cria evento no Google Calendar
- [ ] Link do Meet é gerado
- [ ] Notificações chegam para a equipe
- [ ] Rate limiting bloqueia após 50 mensagens/hora
- [ ] Tempo de resposta < 5 segundos

---

## 🎯 Checklist Final

### Pré-Deploy
- [x] Todas edge functions criadas
- [x] Database schema completo
- [x] RLS policies configuradas
- [x] Secrets configuradas
- [ ] Base de conhecimento embedada
- [ ] Número da equipe configurado

### Deploy
- [ ] Script de embedding executado com sucesso
- [ ] Webhook da Evolution configurado
- [ ] Google Calendar conectado
- [ ] Página de testes acessível
- [ ] Todos os testes básicos passando

### Pós-Deploy
- [ ] Teste real pelo WhatsApp realizado
- [ ] Logs verificados (sem erros críticos)
- [ ] Métricas de sucesso validadas
- [ ] Equipe treinada para usar o sistema
- [ ] Documentação entregue

---

## 🚀 Próximos Passos (Opcional)

### Melhorias Futuras

1. **Dashboard de Monitoramento**
   - Criar página `/health` com status dos serviços
   - Gráficos de uptime
   - Alertas automáticos

2. **Testes Automatizados**
   - Suite de testes E2E com Playwright
   - CI/CD com GitHub Actions
   - Testes de regressão

3. **Otimizações de Performance**
   - Cache de embeddings
   - Batch processing de mensagens
   - Otimização de queries

4. **Features Adicionais**
   - Multi-atendente (mais de um humano)
   - Tags customizáveis para leads
   - Relatórios avançados de conversão
   - Integração com CRM externo

---

## 📞 Suporte

Em caso de dúvidas ou problemas:

1. Verificar logs das edge functions
2. Consultar `DESENVOLVIMENTO_FASE*.md`
3. Revisar este guia
4. Contatar desenvolvedor

---

**Última Atualização:** 2025-01-23  
**Status:** ✅ PRONTO PARA DEPLOY FINAL
