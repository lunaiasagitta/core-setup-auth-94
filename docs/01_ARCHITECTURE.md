# 🏗️ ARQUITETURA DO SISTEMA

## Visão Geral

Sistema de CRM multicanal com agente de IA (Luna) para qualificação de leads, agendamento de reuniões e gestão comercial da Sagitta Digital.

---

## Stack Tecnológico

### Frontend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 18.3.1 | Framework principal |
| TypeScript | - | Tipagem estática |
| Vite | - | Build tool |
| Tailwind CSS | - | Estilização |
| Shadcn/UI | - | Componentes |
| React Query | 5.83.0 | Gerenciamento de estado e cache |
| React Router | 6.30.1 | Roteamento |
| Framer Motion | 12.23.24 | Animações |
| Recharts | 2.15.4 | Gráficos |
| React Big Calendar | 1.19.4 | Calendário |

### Backend (Lovable Cloud / Supabase)
| Componente | Uso |
|------------|-----|
| PostgreSQL | Banco de dados principal |
| Edge Functions (Deno) | Lógica de backend |
| Row Level Security (RLS) | Segurança de dados |
| Realtime | Atualizações em tempo real |
| pgvector | Embeddings para RAG |
| pg_trgm | Similaridade fuzzy de texto |

### Integrações Externas
| Serviço | Uso | Secrets |
|---------|-----|---------|
| OpenAI | GPT-4o para agente Luna | `OPENAI_API_KEY` |
| Evolution API | WhatsApp Business | `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME` |
| Google Calendar | Sincronização de reuniões | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |

---

## Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CANAIS DE ENTRADA                           │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│   WhatsApp      │    Web Chat     │         Painel Admin            │
│  (Evolution)    │   (Widget)      │       (Dashboard)               │
└────────┬────────┴────────┬────────┴────────────────┬────────────────┘
         │                 │                         │
         ▼                 ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EDGE FUNCTIONS (Deno)                          │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│ whatsapp-webhook│   web-chat      │     API Functions               │
│                 │                 │   (CRUD operations)             │
└────────┬────────┴────────┬────────┴────────────────┬────────────────┘
         │                 │                         │
         └────────────────┬┴─────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR                                  │
│  - Intent Classification                                             │
│  - Sentiment Analysis                                                │
│  - Context Tracking                                                  │
│  - Quick Replies                                                     │
│  - Tool Execution                                                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   RAG Search    │  │  OpenAI GPT-4o  │  │   Tool Handlers │
│  (Knowledge)    │  │   (AI Agent)    │  │   (Actions)     │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └───────────────────┬┴───────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                             │
│  - leads, conversations, messages                                    │
│  - meetings, calendar_slots                                          │
│  - knowledge_base (vectorized)                                       │
│  - agent_branding, agent_prompts                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Mensagens

### WhatsApp (Entrada)
```
1. Mensagem chega → Evolution API Webhook
2. whatsapp-webhook/index.ts recebe
3. Detecta duplicatas de lead
4. Chama orchestrator com contexto
5. Orchestrator processa:
   - Classifica intenção
   - Analisa sentimento
   - Busca RAG (knowledge base)
   - Carrega prompt ativo do banco
   - Chama OpenAI com tools
   - Executa tools se necessário
6. Resposta salva no banco
7. Mensagem enviada via Evolution API
```

### Web Chat (Entrada)
```
1. Visitante envia mensagem no widget
2. web-chat/index.ts recebe
3. Cria/busca lead por visitor_id
4. Chama orchestrator com channel='web'
5. Orchestrator usa prompt web-specific
6. Resposta retornada via HTTP
7. UI atualiza em tempo real
```

---

## Módulos do Agente

### Intent Classifier (`agent/intent-classifier.ts`)
Detecta intenções do usuário:
- `greeting` - Saudação
- `pricing` - Preços
- `scheduling` - Agendamento
- `objection` - Objeção
- `question` - Pergunta
- `goodbye` - Despedida
- `confirmation` - Confirmação

### Sentiment Analyzer (`agent/sentiment.ts`)
Analisa tom emocional:
- `positive` - Interesse, entusiasmo
- `neutral` - Neutro
- `negative` - Frustração, objeção

### Context Analyzer (`agent/context-analyzer.ts`)
Rastreia:
- Tópico atual da conversa
- Preferências do lead
- Progresso BANT
- Objeções levantadas

### Quick Replies (`agent/quick-replies.ts`)
Respostas rápidas para intenções de alta confiança:
- Saudações
- Despedidas
- Confirmações simples

### Follow-up Scheduler (`agent/follow-up.ts`)
Agenda mensagens de follow-up automáticas.

### Response Validator (`agent/response-validator.ts`)
Valida respostas antes de enviar:
- Tamanho adequado
- Conteúdo apropriado
- Formatação correta

### Degraded Mode (`agent/degraded-mode.ts`)
Modo degradado quando OpenAI falha:
- Respostas padrão
- Notificação à equipe
- Auto-recuperação

---

## Sistema de Duplicatas

### Detecção
Função SQL `find_potential_duplicates`:
- **Score 100**: Telefone/email exato
- **Score 90**: Email case-insensitive
- **Score 60-89**: Nome fuzzy (similarity > 0.7)

### Ações por Score
| Score | Ação |
|-------|------|
| >= 90 | Auto-merge síncrono |
| 60-89 | Criar com flag `potential_duplicate_of` |
| < 60 | Criar normalmente |

### CronJob de Segurança
`auto-merge-duplicates` roda diariamente às 3h:
- Processa leads flagged
- Re-verifica duplicatas
- Auto-merge score 100
- Notifica admin

---

## Qualificação BANT

O agente Luna qualifica leads usando metodologia BANT:

| Campo | Descrição | Obrigatório para agendar |
|-------|-----------|--------------------------|
| **B**udget | Orçamento disponível | ✅ Sim |
| **A**uthority | Autoridade de decisão | ✅ Sim |
| **N**eed | Necessidade identificada | ❌ Natural |
| **T**imeline | Prazo/urgência | ❌ Importante |

### Fluxo de Qualificação
```
1. Identificar necessidade (conversa natural)
2. Perguntar sobre timeline
3. Qualificar Budget (obrigatório)
4. Qualificar Authority (obrigatório)
5. Só então → oferecer agendamento
```

---

## Sistema de Agendamento

### Slots de Disponibilidade
- Gerados via `slot_batches` (configuração de horários)
- Aplicam exceções (`availability_exceptions`)
- Filtrados por `available_slots_view` (remove passados)

### Fluxo de Agendamento
```
1. Lead qualificado (Budget + Authority ✅)
2. Agente coleta email (obrigatório)
3. Busca slots disponíveis (próximos X dias)
4. Lead escolhe horário
5. AgendarReuniaoWhatsApp:
   - Cria meeting no banco
   - Bloqueia slot
   - Cria evento no Google Calendar
   - Envia link do Google Meet
6. Trigger cria lembretes automáticos
```

### Google Calendar Integration
- OAuth 2.0 flow para autorização
- Webhook para sincronização bidirecional
- Watch renewal automático (7 dias)

---

## RAG (Retrieval Augmented Generation)

### Knowledge Base
- Documentos markdown processados
- Chunks de ~500 tokens
- Embeddings via OpenAI text-embedding-3-small
- Similaridade via pgvector (cosine distance)

### Fluxo RAG
```
1. Mensagem do usuário
2. Gerar embedding da query
3. Buscar chunks similares (threshold 0.7)
4. Injetar no prompt do agente
5. Resposta contextualizada
```

---

## Segurança

### Row Level Security (RLS)
- Todas as tabelas com RLS habilitado
- Políticas baseadas em `auth.uid()`
- Service role para edge functions

### Rate Limiting
- 50 mensagens/hora por telefone
- Log de violações em `security_logs`

### Blocked Numbers
- Tabela `blocked_numbers`
- Verificação antes de processar mensagens

### Validação de Dados
- Normalização de telefone
- Validação de email
- Sanitização de inputs

---

## Variáveis de Ambiente

### Supabase (Auto-configuradas)
```env
VITE_SUPABASE_URL=https://xjcxjotykzhzxapssany.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_SUPABASE_PROJECT_ID=xjcxjotykzhzxapssany
```

### Secrets (Edge Functions)
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
OPENAI_API_KEY
EVOLUTION_API_URL
EVOLUTION_API_KEY
EVOLUTION_INSTANCE_NAME
EVOLUTION_WEBHOOK_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

---

## Convenções de Código

### Estrutura de Pastas
```
src/
├── components/     # Componentes React
│   ├── ui/         # Shadcn/UI base
│   ├── shared/     # Compartilhados
│   └── [feature]/  # Por funcionalidade
├── pages/          # Páginas/rotas
├── lib/
│   ├── hooks/      # Custom hooks
│   ├── utils/      # Utilitários
│   └── types/      # TypeScript types
└── integrations/
    └── supabase/   # Cliente e tipos

supabase/
├── functions/      # Edge functions
│   ├── [function]/ # Uma pasta por função
│   ├── agent/      # Módulos do agente
│   ├── tools/      # Handlers de ferramentas
│   ├── prompts/    # Prompts do sistema
│   ├── lib/        # Utilitários compartilhados
│   └── google/     # Google Calendar helpers
└── config.toml     # Configuração
```

### Padrões
- **Componentes**: PascalCase
- **Hooks**: camelCase com prefixo `use`
- **Edge Functions**: kebab-case
- **Tabelas**: snake_case
- **Colunas**: snake_case
