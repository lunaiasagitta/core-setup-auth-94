# ⚡ EDGE FUNCTIONS

## Visão Geral

Edge Functions são funções serverless executadas no Deno (Supabase Edge Runtime). Processam requests HTTP e podem acessar o banco de dados via `supabase-js`.

---

## Funções de Comunicação

### `whatsapp-webhook`
**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

Webhook que recebe mensagens do WhatsApp via Evolution API.

**Fluxo:**
1. Recebe evento da Evolution API
2. Valida tipo de evento (messages.upsert)
3. Extrai mensagem (texto ou transcrição de áudio)
4. Detecta/cria lead com merge automático
5. Verifica deduplicação por `external_message_id`
6. Chama orchestrator
7. Envia resposta via Evolution API

**Endpoint:** `POST /functions/v1/whatsapp-webhook`

**Headers esperados:**
- `x-webhook-secret` (opcional)

**Payload Evolution API:**
```json
{
  "event": "messages.upsert",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "id": "MESSAGE_ID"
    },
    "message": {
      "conversation": "Texto da mensagem"
    },
    "pushName": "Nome do Contato"
  }
}
```

---

### `web-chat`
**Arquivo:** `supabase/functions/web-chat/index.ts`

Processa mensagens do widget de chat web.

**Fluxo:**
1. Recebe mensagem do frontend
2. Busca/cria lead por `visitor_id`
3. Cria/busca conversation
4. Salva mensagem do usuário
5. Chama orchestrator com `channel='web'`
6. Retorna resposta

**Endpoint:** `POST /functions/v1/web-chat`

**Payload:**
```json
{
  "visitorId": "visitor_abc123",
  "message": "Olá, gostaria de saber mais",
  "sessionId": "session_123" // opcional
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "web_visitor_abc123_1234567890",
  "response": "Olá! Sou a Luna...",
  "leadId": "uuid",
  "conversationId": "uuid"
}
```

---

### `send-admin-message`
**Arquivo:** `supabase/functions/send-admin-message/index.ts`

Envia mensagem manual do admin para lead via WhatsApp.

**Endpoint:** `POST /functions/v1/send-admin-message`

**Payload:**
```json
{
  "leadId": "uuid",
  "message": "Olá, aqui é o Samuel..."
}
```

---

## Função Principal

### `orchestrator`
**Arquivo:** `supabase/functions/orchestrator/index.ts`

Cérebro do sistema - processa todas as mensagens.

**Responsabilidades:**
1. Rate limiting (50 msg/hora)
2. Verificação de blocked numbers
3. Carregamento de lead/conversation
4. Carregamento de histórico
5. RAG search (knowledge base)
6. Intent classification
7. Quick replies (alta confiança)
8. Sentiment analysis
9. Context tracking
10. Carregamento de prompt ativo por canal
11. Carregamento de branding/serviços
12. Chamada OpenAI com tools
13. Execução de tools
14. Salvamento de mensagens
15. Follow-up scheduling

**Endpoint:** `POST /functions/v1/orchestrator`

**Payload:**
```json
{
  "phone": "5511999999999",
  "message": "Texto da mensagem",
  "messageId": "external_id",
  "channel": "whatsapp", // ou "web"
  "visitorId": "visitor_id", // para web
  "conversationId": "uuid" // opcional
}
```

---

## Módulos do Agente

### `agent/intent-classifier.ts`
Classifica intenção da mensagem.

```typescript
classifyIntent(message: string): {
  name: string;
  confidence: number;
}
```

**Intenções:**
- `greeting` - Oi, olá, bom dia
- `pricing` - Quanto custa, valor, preço
- `scheduling` - Agendar, marcar, reunião
- `objection` - Caro, não tenho, difícil
- `question` - Como funciona, o que é
- `goodbye` - Tchau, até mais
- `confirmation` - Sim, pode ser, ok

---

### `agent/quick-replies.ts`
Respostas rápidas sem chamar OpenAI.

```typescript
getQuickReply(intent: string, lead: any): {
  content: string;
  shouldExecuteTool?: { toolName: string; params: any }
}
```

---

### `agent/sentiment.ts`
Análise de sentimento.

```typescript
analyzeSentiment(message: string): {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  indicators: string[];
}

getSentimentGuidance(analysis): string
```

---

### `agent/context-analyzer.ts`
Análise de contexto.

```typescript
detectCurrentTopic(message: string): {
  current_topic: string;
  confidence: number;
}

analyzePreferences(history: Message[]): {
  communication_style: string;
  interest_level: string;
  preferred_topics: string[];
}
```

---

### `agent/follow-up.ts`
Agendamento de follow-ups.

```typescript
scheduleFollowUps(leadId: string, supabaseUrl: string, supabaseKey: string)
```

---

### `agent/response-validator.ts`
Validação de respostas.

```typescript
validateResponse(response: string): {
  valid: boolean;
  issues: string[];
}
```

---

### `agent/degraded-mode.ts`
Modo degradado quando OpenAI falha.

```typescript
recordFailure(): void
recordSuccess(): void
isDegraded(): boolean
getDegradedResponse(intent: string): string
```

---

## Handlers de Ferramentas

### `tools/handlers.ts`
Executor principal de ferramentas.

```typescript
executeTool(
  toolName: string,
  params: any,
  context: { leadId?: string; conversationId?: string; channel?: string }
): Promise<ToolResult>
```

**Ferramentas disponíveis:**

| Tool | Descrição |
|------|-----------|
| `CriaUsuarioCRM` | Cria lead no CRM (com merge automático) |
| `EnviarApresentacao` | Envia PDF/apresentação |
| `AtualizarStatusLead` | Atualiza stage do lead |
| `AtualizarNecessidadeLead` | Atualiza necessidade |
| `EmFechamentoSamuel` | Marca para fechamento |
| `atualizar_lead` | Atualiza campo específico |
| `registrar_bant` | Registra informação BANT |
| `buscar_slots` | Busca horários disponíveis |
| `AgendarReuniaoWhatsApp` | Agenda reunião (WhatsApp) |
| `CancelarReuniaoWhatsApp` | Cancela reunião |
| `solicitar_handoff` | Solicita intervenção humana |
| `buscar_recursos` | Busca recursos/apresentações |

---

### `tools/whatsapp-handlers.ts`
Handlers específicos para WhatsApp.

- `handleEnviarApresentacaoWhatsApp` - Envia PDF via Evolution
- `handleBuscarSlotsWhatsApp` - Busca slots formatados
- `handleAgendarReuniaoWhatsApp` - Agenda com Google Calendar
- `handleSolicitarHandoff` - Notifica equipe
- `handleBuscarRecursosWhatsApp` - Lista recursos

---

### `tools/web-handlers.ts`
Handlers específicos para Web Chat.

- `handleColetarNome` - UI action para coletar nome
- `handleColetarWhatsApp` - UI action para coletar telefone
- `handleColetarEmail` - UI action para coletar email
- `handleColetarEmpresa` - UI action para coletar empresa
- `handleMostrarApresentacaoWeb` - Mostra link de apresentação
- `handleMostrarSlotsWeb` - Mostra calendário de slots
- `handleAgendarReuniaoWeb` - Agenda reunião (web)
- `handleBuscarInformacoesWeb` - Busca na knowledge base

---

### `tools/cancel-meeting-handler.ts`
Handler de cancelamento de reunião.

```typescript
handleCancelarReuniaoWhatsApp(
  params: { meeting_id: string; motivo: string },
  leadId: string,
  supabaseClient: any
): Promise<ToolResult>
```

---

## Funções de Google Calendar

### `google-auth-url`
Gera URL de autorização OAuth.

**Endpoint:** `GET /functions/v1/google-auth-url`

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

---

### `google-callback`
Processa callback OAuth do Google.

**Endpoint:** `GET /functions/v1/google-callback?code=AUTH_CODE`

Salva tokens em `oauth_tokens`.

---

### `google-calendar-create`
Cria evento no Google Calendar.

**Endpoint:** `POST /functions/v1/google-calendar-create`

**Payload:**
```json
{
  "meetingId": "uuid",
  "summary": "Reunião com Lead",
  "description": "Descrição",
  "startDateTime": "2024-01-15T14:00:00-03:00",
  "endDateTime": "2024-01-15T14:30:00-03:00",
  "attendeeEmail": "lead@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "google_event_id",
  "meetLink": "https://meet.google.com/xxx-xxxx-xxx"
}
```

---

### `google-calendar-cancel`
Cancela evento no Google Calendar.

**Endpoint:** `POST /functions/v1/google-calendar-cancel`

**Payload:**
```json
{
  "meetingId": "uuid"
}
```

---

### `google-calendar-sync`
Sincroniza eventos do Google Calendar.

**Endpoint:** `POST /functions/v1/google-calendar-sync`

---

### `google-setup-watch`
Configura webhook do Google Calendar.

**Endpoint:** `POST /functions/v1/google-setup-watch`

---

### `google-webhook`
Recebe notificações do Google Calendar.

**Endpoint:** `POST /functions/v1/google-webhook`

---

### `renew-google-watch`
Renova watch do Google Calendar (expira em 7 dias).

**Endpoint:** `POST /functions/v1/renew-google-watch`

---

### `push-to-google-calendar`
Push manual de meeting para Google.

**Endpoint:** `POST /functions/v1/push-to-google-calendar`

---

## Funções de RAG

### `generate-embedding`
Gera embedding para texto.

**Endpoint:** `POST /functions/v1/generate-embedding`

**Payload:**
```json
{
  "text": "Texto para gerar embedding"
}
```

**Response:**
```json
{
  "embedding": [0.123, -0.456, ...]
}
```

---

### `rag-search`
Busca na knowledge base por similaridade.

**Endpoint:** `POST /functions/v1/rag-search`

**Payload:**
```json
{
  "query": "Como funciona o serviço de websites?",
  "top_k": 5,
  "threshold": 0.7
}
```

**Response:**
```json
{
  "results": [
    {
      "title": "Serviços - Websites",
      "content": "...",
      "similarity": 0.85
    }
  ]
}
```

---

### `knowledge-base-process`
Processa documentos para knowledge base.

**Endpoint:** `POST /functions/v1/knowledge-base-process`

Chunka documentos e gera embeddings.

---

## Funções de Contexto

### `generate-meeting-context`
Gera contexto de reunião usando IA.

**Endpoint:** `POST /functions/v1/generate-meeting-context`

**Payload:**
```json
{
  "meetingId": "uuid"
}
```

Gera:
- Resumo da conversa
- Agenda sugerida
- Perguntas de briefing respondidas

---

### `finalizar-contextos-pendentes`
Processa contextos pendentes de geração.

**Endpoint:** `POST /functions/v1/finalizar-contextos-pendentes`

---

## Funções de Agendamento

### `process-reminders`
Processa e envia lembretes de reunião.

**Endpoint:** `POST /functions/v1/process-reminders`

Roda via CronJob.

---

### `process-scheduled-messages`
Processa mensagens de follow-up agendadas.

**Endpoint:** `POST /functions/v1/process-scheduled-messages`

---

## Funções de Duplicatas

### `auto-merge-duplicates`
CronJob diário de merge de duplicatas.

**Endpoint:** `POST /functions/v1/auto-merge-duplicates`

**Schedule:** `0 6 * * *` (6h UTC = 3h BRT)

**Ações:**
1. Processa leads flagged (score 60-89)
2. Re-verifica duplicatas (failsafe)
3. Auto-merge score 100
4. Gera relatório
5. Notifica admin

---

## Funções de Configuração

### `agent-branding`
CRUD de configurações de branding.

**Endpoints:**
- `GET /functions/v1/agent-branding`
- `PUT /functions/v1/agent-branding`

---

### `agent-prompts`
CRUD de prompts do agente.

**Endpoints:**
- `GET /functions/v1/agent-prompts`
- `POST /functions/v1/agent-prompts`
- `PUT /functions/v1/agent-prompts`

---

### `agent-resources`
CRUD de recursos/serviços.

**Endpoints:**
- `GET /functions/v1/agent-resources`
- `POST /functions/v1/agent-resources`
- `PUT /functions/v1/agent-resources`
- `DELETE /functions/v1/agent-resources`

---

## Funções de Teste

### `test-evolution-connection`
Testa conexão com Evolution API.

**Endpoint:** `POST /functions/v1/test-evolution-connection`

---

### `run-tests`
Executa testes automatizados do agente.

**Endpoint:** `POST /functions/v1/run-tests`

---

### `experiments-api`
API para experimentos A/B.

**Endpoints:**
- `GET /functions/v1/experiments-api`
- `POST /functions/v1/experiments-api`

---

## Funções de Completions

### `chat-completion`
Wrapper para OpenAI Chat Completions (uso interno).

**Endpoint:** `POST /functions/v1/chat-completion`

---

## Helpers Compartilhados

### `lib/merge-utils.ts`
Utilitários de merge de leads.

```typescript
decideMergeStrategy(leadA: Lead, leadB: Lead): {
  merged: Partial<Lead>;
  mergeLog: MergeDecision[];
}

normalizeEmail(email: string): string
normalizePhone(phone: string): string
```

---

### `evolution/client.ts`
Cliente da Evolution API.

```typescript
sendMessage(phone: string, text: string): Promise<Result>
sendMedia(phone: string, url: string, caption: string, type: string, fileName: string): Promise<Result>
```

---

### `google/auth.ts`
Helpers de autenticação Google.

```typescript
getAuthUrl(): string
exchangeCodeForTokens(code: string): Promise<Tokens>
refreshAccessToken(refreshToken: string): Promise<Tokens>
```

---

### `google/calendar.ts`
Helpers do Google Calendar.

```typescript
createEvent(params: EventParams): Promise<Event>
cancelEvent(eventId: string): Promise<void>
listEvents(params: ListParams): Promise<Event[]>
```

---

## Configuração (config.toml)

```toml
project_id = "xjcxjotykzhzxapssany"

[functions.whatsapp-webhook]
verify_jwt = false

[functions.web-chat]
verify_jwt = false

[functions.google-callback]
verify_jwt = false

[functions.google-webhook]
verify_jwt = false

[functions.auto-merge-duplicates]
verify_jwt = false

[[functions.auto-merge-duplicates.cron]]
schedule = "0 6 * * *"
```
