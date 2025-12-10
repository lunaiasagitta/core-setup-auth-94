# 🚀 DESENVOLVIMENTO FASE 2 - AGENTE SDR A2A

## 📋 PLANEJAMENTO GERAL

### Objetivo da Fase 2
Configurar e testar todas as integrações com serviços externos: Lovable Cloud (database + auth), OpenAI (LLM + Embeddings), Google Calendar/Meet, Evolution API (WhatsApp).

### Status Geral: 🟡 50% CONCLUÍDO - Banco + OpenAI + CRUD Base Implementados

---

## ✅ CHECKLIST DE EXECUÇÃO

### 2.1 Lovable Cloud Database Setup
- [x] Habilitar Lovable Cloud
- [x] Criar tabela leads
- [x] Criar tabela conversations
- [x] Criar tabela messages
- [x] Criar tabela meetings
- [x] Criar tabela calendar_slots
- [x] Criar tabela activity_log
- [x] Criar tabela security_logs
- [x] Criar tabela blocked_numbers
- [x] Criar tabela knowledge_base (RAG)
- [x] Habilitar extensão pgvector
- [x] Configurar RLS em todas tabelas
- [x] Criar triggers para updated_at
- [x] Inserir dados iniciais de teste

### 2.2 OpenAI Integration
- [x] Configurar OpenAI API Key
- [x] Criar edge function: chat-completion
- [x] Criar edge function: generate-embedding
- [x] Criar types para OpenAI
- [ ] Criar edge function: rag-search (busca semântica)
- [ ] Testar completions
- [ ] Testar embeddings
- [ ] Testar RAG

### 2.3 Frontend - CRUD de Leads
- [x] Criar hook useLeads
- [x] Atualizar página de listagem de leads
- [ ] Criar modal de criação de lead
- [ ] Criar modal de edição de lead
- [ ] Criar página de detalhes do lead
- [ ] Integrar com backend

### 2.4 Google Calendar/Meet Integration
- [ ] Setup OAuth 2.0
- [ ] Implementar OAuth Flow
- [ ] Cliente Google Calendar
- [ ] Webhooks do Google Calendar
- [ ] Testar criação de eventos

### 2.5 Evolution API Integration
- [ ] Configurar Evolution API
- [ ] Cliente Evolution
- [ ] Webhook Handler
- [ ] Testar envio/recebimento de mensagens

### 2.6 Notificações
- [ ] SMTP/SendGrid para emails
- [ ] WhatsApp para notificações internas
- [ ] Templates de notificação

### 2.7 Health Checks e Monitoramento
- [ ] Criar Health Check Endpoint
- [ ] Dashboard de Status
- [ ] Validação completa

---

## 📊 ESTRUTURA DO BANCO CRIADA

### Tabelas Principais

#### leads
- id, nome, telefone, email, empresa
- necessidade, stage, score_bant
- bant_details (JSONB), metadata (JSONB)
- created_at, updated_at

#### conversations
- id, lead_id, session_id
- context (JSONB), state (JSONB)
- updated_at

#### messages
- id, conversation_id, role, content
- tools_used (JSONB)
- timestamp

#### meetings
- id, lead_id, google_event_id
- scheduled_date, duration, status
- meeting_link
- created_at, updated_at, cancelled_at

#### calendar_slots
- id, date, time, duration
- available, reserved_by, reserved_at

#### activity_log
- id, lead_id, event_type
- details (JSONB)
- timestamp

#### security_logs
- id, event_type, user_phone
- details (JSONB), severity
- timestamp

#### blocked_numbers
- id, telefone, motivo
- blocked_at

#### knowledge_base (RAG)
- id, title, content, chunk_index
- embedding (VECTOR 1536)
- metadata (JSONB)
- created_at, updated_at

---

## 🔧 EDGE FUNCTIONS CRIADAS

### chat-completion
**Path:** `/functions/v1/chat-completion`

**Descrição:** Chama OpenAI API para gerar completions de chat

**Input:**
```typescript
{
  messages: ChatMessage[];
  tools?: Tool[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
}
```

**Output:**
```typescript
{
  content?: string;
  tool_calls?: ToolCall[];
  finish_reason: 'stop' | 'tool_calls' | 'length';
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

### generate-embedding
**Path:** `/functions/v1/generate-embedding`

**Descrição:** Gera embeddings de texto usando OpenAI

**Input:**
```typescript
{
  input: string | string[];
  model?: string; // default: 'text-embedding-3-small'
}
```

**Output:**
```typescript
{
  embedding: number[];     // Se input for string
  embeddings: number[][];  // Se input for array
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
```

---

## 📝 LOGS DE DESENVOLVIMENTO

### [EM ANDAMENTO] - 2025-11-23

#### Ações Realizadas
1. ✅ Lovable Cloud habilitado com sucesso
2. ✅ OpenAI API Key configurada
3. ✅ Todas as tabelas do banco de dados criadas
4. ✅ RLS configurado em todas as tabelas
5. ✅ Extensão pgvector habilitada para RAG
6. ✅ Triggers de updated_at criados
7. ✅ Slots de agenda inseridos (próximos 7 dias)
8. ✅ Edge functions criadas: chat-completion, generate-embedding
9. ✅ Hook useLeads criado para CRUD de leads
10. ✅ Página de listagem de leads atualizada

#### Próximos Passos
1. Criar modals de criação/edição de leads
2. Criar página de detalhes do lead
3. Implementar edge function de busca RAG
4. Testar integração OpenAI
5. Preparar estrutura para Google Calendar
6. Preparar estrutura para Evolution API

#### Decisões Técnicas
- **OpenAI Models:** Usando gpt-4-turbo para completions, text-embedding-3-small para embeddings
- **Banco:** PostgreSQL com pgvector para busca semântica
- **RLS:** Policies básicas para usuários autenticados (ajustar conforme necessário)
- **Edge Functions:** TypeScript com Deno runtime
- **Frontend:** React Query para data fetching e cache

---

## 🔐 SEGURANÇA

### RLS Policies Implementadas
Todas as tabelas têm RLS habilitado com policies básicas:
- SELECT: Usuários autenticados
- INSERT: Usuários autenticados
- UPDATE: Usuários autenticados
- DELETE: Usuários autenticados (apenas onde aplicável)

⚠️ **IMPORTANTE:** As policies atuais são básicas. Para produção, implementar:
- Policies por usuário/equipe
- Validação de permissões específicas
- Auditoria de acessos

### Secrets Configuradas
- ✅ OPENAI_API_KEY
- ✅ SUPABASE_URL (auto)
- ✅ SUPABASE_PUBLISHABLE_KEY (auto)
- ✅ SUPABASE_SERVICE_ROLE_KEY (auto)
- ✅ SUPABASE_DB_URL (auto)

---

## 📊 MÉTRICAS E MONITORAMENTO

### Edge Functions
- Logs automáticos no Lovable Cloud
- Error handling implementado
- CORS configurado

### Database
- Índices criados em:
  - leads: telefone, stage, score_bant, created_at
  - conversations: lead_id, session_id
  - messages: conversation_id, timestamp
  - meetings: lead_id, scheduled_date, status
  - calendar_slots: date, available
  - activity_log: lead_id, timestamp
  - security_logs: timestamp, severity
  - knowledge_base: embedding (ivfflat)

---

## 🎯 CRITÉRIOS DE CONCLUSÃO DA FASE 2

- [ ] OpenAI completions funcionando
- [ ] OpenAI embeddings funcionando
- [ ] RAG search implementado
- [ ] CRUD de leads completo no frontend
- [ ] Google Calendar integrado
- [ ] Evolution API integrado
- [ ] Notificações funcionando
- [ ] Health checks implementados
- [ ] Testes de integração completos

---

**Status Atual: 🟡 40% CONCLUÍDO**

### Próxima Fase
A **Fase 3** focará em:
- Implementação do agente conversacional (A2A protocol)
- Sistema de qualificação BANT
- Regras de negócio e transições de estado
- Handlers de ferramentas (function calling)
- Pipeline RAG completo

---

*Última atualização: 2025-11-23*
