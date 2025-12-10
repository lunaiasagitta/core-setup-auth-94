# 📋 PRD - Product Requirements Document
# Sagitta CRM com Agente Luna

**Versão:** 2.0  
**Data:** Dezembro 2024  
**Status:** Em Produção  

---

## 📑 Índice

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Objetivos e Métricas](#2-objetivos-e-métricas)
3. [Personas e Usuários](#3-personas-e-usuários)
4. [Arquitetura Técnica](#4-arquitetura-técnica)
5. [Banco de Dados](#5-banco-de-dados)
6. [Backend - Edge Functions](#6-backend---edge-functions)
7. [Frontend - Páginas e Componentes](#7-frontend---páginas-e-componentes)
8. [Integrações Externas](#8-integrações-externas)
9. [Automações e CronJobs](#9-automações-e-cronjobs)
10. [Fluxos de Negócio](#10-fluxos-de-negócio)
11. [Segurança](#11-segurança)
12. [Requisitos Não-Funcionais](#12-requisitos-não-funcionais)

---

## 1. Visão Geral do Produto

### 1.1 Descrição
Sistema CRM multicanal com agente de IA (Luna) para qualificação automática de leads usando metodologia BANT, agendamento inteligente de reuniões e gestão comercial completa da Sagitta Digital.

### 1.2 Proposta de Valor
- **Atendimento 24/7** via WhatsApp e Web Chat
- **Qualificação automática** de leads (BANT)
- **Agendamento inteligente** com Google Calendar
- **Unificação multicanal** de contatos
- **Contexto de reunião** gerado por IA

### 1.3 Stack Tecnológico

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Shadcn/UI |
| **Backend** | Supabase Edge Functions (Deno), PostgreSQL |
| **IA** | OpenAI GPT-4o, text-embedding-3-small |
| **Integrações** | Evolution API (WhatsApp), Google Calendar |
| **Infraestrutura** | Lovable Cloud (Supabase) |

---

## 2. Objetivos e Métricas

### 2.1 Objetivos de Negócio

| Objetivo | Meta | Prazo |
|----------|------|-------|
| Taxa de qualificação | > 40% | Q1 2025 |
| Reuniões agendadas/mês | > 50 | Q1 2025 |
| Tempo médio até qualificação | < 48h | Q1 2025 |
| Taxa de no-show | < 15% | Q1 2025 |

### 2.2 KPIs do Sistema

```
📊 Métricas Monitoradas (View: agent_metrics)
├── leads_novos_7d - Novos leads últimos 7 dias
├── leads_qualificados_7d - Leads com BANT completo
├── taxa_qualificacao_7d - % qualificação
├── reunioes_agendadas_7d - Reuniões marcadas
├── horas_ate_qualificacao - Tempo médio
├── conversas_positivas - Sentimento positivo
├── conversas_negativas - Sentimento negativo
└── handoffs_solicitados - Transferências para humano
```

---

## 3. Personas e Usuários

### 3.1 Leads (Clientes Potenciais)

**Canais de Entrada:**
- WhatsApp Business
- Widget Web Chat
- (Futuro: Email, Instagram)

**Jornada:**
```
Primeiro Contato → Qualificação BANT → Agendamento → Reunião → Proposta → Fechamento
```

### 3.2 Admin (Equipe Sagitta)

**Responsabilidades:**
- Monitorar conversas e leads
- Configurar agente Luna
- Gerenciar disponibilidade
- Gerar contextos de reunião
- Intervir quando necessário (handoff)

---

## 4. Arquitetura Técnica

### 4.1 Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CANAIS DE ENTRADA                              │
├───────────────────┬───────────────────┬─────────────────────────────────┤
│     WhatsApp      │     Web Chat      │          Painel Admin           │
│   (Evolution)     │    (Widget)       │         (Dashboard)             │
└─────────┬─────────┴─────────┬─────────┴───────────────┬─────────────────┘
          │                   │                         │
          ▼                   ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        EDGE FUNCTIONS (Deno)                             │
├───────────────────┬───────────────────┬─────────────────────────────────┤
│ whatsapp-webhook  │     web-chat      │        API Functions            │
│                   │                   │      (CRUD operations)          │
└─────────┬─────────┴─────────┬─────────┴───────────────┬─────────────────┘
          │                   │                         │
          └───────────────────┼─────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          ORCHESTRATOR                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Intent    │  │  Sentiment  │  │   Context   │  │    Quick    │    │
│  │ Classifier  │  │  Analyzer   │  │   Tracker   │  │   Replies   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   RAG Search    │  │  OpenAI GPT-4o  │  │  Tool Handlers  │
│  (Knowledge)    │  │   (AI Agent)    │  │   (Actions)     │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      SUPABASE (PostgreSQL)                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  leads   │ │ messages │ │ meetings │ │  slots   │ │knowledge │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Fluxo de Mensagens

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUXO WHATSAPP                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Mensagem → Evolution API Webhook                                     │
│  2. whatsapp-webhook/index.ts recebe                                     │
│  3. Detecta/Mescla duplicatas (sync merge)                              │
│  4. Orchestrator processa:                                               │
│     ├── Classifica intenção                                             │
│     ├── Analisa sentimento                                              │
│     ├── Busca RAG (knowledge base)                                      │
│     ├── Carrega prompt ativo do banco                                   │
│     ├── Chama OpenAI com tools                                          │
│     └── Executa tools se necessário                                     │
│  5. Resposta salva no banco                                             │
│  6. Mensagem enviada via Evolution API                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          FLUXO WEB CHAT                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Visitante envia mensagem no widget                                  │
│  2. web-chat/index.ts recebe                                            │
│  3. Cria/busca lead por visitor_id                                      │
│  4. Orchestrator com channel='web'                                      │
│  5. Prompt web-specific                                                 │
│  6. Resposta retornada via HTTP                                         │
│  7. UI atualiza em tempo real                                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Banco de Dados

### 5.1 Schema Completo

#### 5.1.1 Tabelas Principais

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- LEADS - Contatos/Prospects do CRM
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone TEXT NOT NULL,                    -- Formato: 5511999999999
  nome TEXT,
  email TEXT,
  empresa TEXT,
  necessidade TEXT,                          -- Descrição da necessidade
  stage TEXT DEFAULT 'Novo',                 -- Estágio no funil
  score_bant INTEGER DEFAULT 0,              -- Score de qualificação (0-100)
  bant_details JSONB DEFAULT '{}',           -- Detalhes BANT estruturados
  proposta_ia TEXT,                          -- Proposta gerada pela IA
  os_funil_lead TEXT,                        -- Posição no funil OS
  metadata JSONB DEFAULT '{}',               -- Dados extras, duplicatas, etc
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stages do Funil:
-- 'Novo' → 'Apresentação Enviada' → 'Segundo Contato' → 
-- 'Reunião Agendada' → 'Proposta Enviada' → 'Fechado' | 'Perdido'
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- CONVERSATIONS - Sessões de conversa por canal
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,                  -- Identificador único da sessão
  lead_id UUID REFERENCES leads(id),
  visitor_id TEXT,                           -- Para web chat
  channel TEXT DEFAULT 'whatsapp',           -- 'whatsapp' | 'web'
  
  -- Tracking de contexto
  current_topic TEXT,                        -- Tópico atual da conversa
  last_sentiment TEXT,                       -- 'positive' | 'neutral' | 'negative'
  interest_signals INTEGER DEFAULT 0,        -- Contador de sinais de interesse
  objections_count INTEGER DEFAULT 0,        -- Contador de objeções
  objections_raised TEXT[] DEFAULT '{}',     -- Lista de objeções
  questions_asked TEXT[] DEFAULT '{}',       -- Perguntas feitas
  information_provided TEXT[] DEFAULT '{}',  -- Info já fornecida
  preferences JSONB DEFAULT '{}',            -- Preferências do lead
  
  -- BANT Progress
  bant_progress JSONB DEFAULT '{
    "budget": "not_asked",
    "authority": "not_asked", 
    "need": "not_asked",
    "timeline": "not_asked"
  }',
  
  context JSONB DEFAULT '{}',                -- Contexto geral
  state JSONB DEFAULT '{}',                  -- Estado da conversa
  metadata JSONB DEFAULT '{}',               -- Metadados extras
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- MESSAGES - Histórico de mensagens
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  role TEXT NOT NULL,                        -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,                     -- Conteúdo da mensagem
  channel TEXT DEFAULT 'whatsapp',           -- Canal de origem
  external_message_id TEXT,                  -- ID da mensagem externa (dedup)
  tools_used JSONB,                          -- Tools executadas na resposta
  timestamp TIMESTAMPTZ DEFAULT now()
);
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- MEETINGS - Reuniões agendadas
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  scheduled_date TIMESTAMPTZ NOT NULL,       -- Data/hora da reunião
  duration INTEGER DEFAULT 30,               -- Duração em minutos
  status TEXT DEFAULT 'scheduled',           -- Status da reunião
  meeting_link TEXT,                         -- Link do Google Meet
  google_event_id TEXT,                      -- ID do evento no Google
  contexto_reuniao JSONB,                    -- Contexto gerado por IA
  cancelled_at TIMESTAMPTZ,                  -- Data de cancelamento
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Status possíveis:
-- 'scheduled' → 'confirmed' → 'completed' | 'cancelled' | 'no_show'
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- CALENDAR_SLOTS - Slots de disponibilidade
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE calendar_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES slot_batches(id),
  template_id UUID REFERENCES availability_templates(id),
  date DATE NOT NULL,                        -- Data do slot
  time TIME NOT NULL,                        -- Horário do slot
  duration INTEGER DEFAULT 30,               -- Duração em minutos
  available BOOLEAN DEFAULT true,            -- Disponível para agendamento
  reserved_by UUID REFERENCES leads(id),     -- Lead que reservou
  reserved_at TIMESTAMPTZ,                   -- Quando foi reservado
  is_exception BOOLEAN DEFAULT false         -- Se é exceção de horário
);
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- SLOT_BATCHES - Lotes de geração de slots
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE slot_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                        -- Nome identificador
  start_date DATE NOT NULL,                  -- Data inicial
  end_date DATE NOT NULL,                    -- Data final
  start_time TIME NOT NULL,                  -- Horário início
  end_time TIME NOT NULL,                    -- Horário fim
  days_of_week INTEGER[] NOT NULL,           -- Dias da semana [0-6]
  slot_duration INTEGER DEFAULT 30,          -- Duração do slot
  gap_minutes INTEGER DEFAULT 0,             -- Intervalo entre slots
  active BOOLEAN DEFAULT true,               -- Se está ativo
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- AVAILABILITY_EXCEPTIONS - Exceções de disponibilidade
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,                        -- Data da exceção
  type TEXT NOT NULL,                        -- 'unavailable' | 'custom_hours'
  reason TEXT,                               -- Motivo da exceção
  custom_start_time TIME,                    -- Horário início customizado
  custom_end_time TIME,                      -- Horário fim customizado
  slot_duration INTEGER DEFAULT 30,          -- Duração se custom
  created_at TIMESTAMPTZ DEFAULT now()
);
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- KNOWLEDGE_BASE - Base de conhecimento para RAG
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,                       -- Título do documento
  content TEXT NOT NULL,                     -- Conteúdo do chunk
  chunk_index INTEGER,                       -- Índice do chunk no documento
  embedding VECTOR(1536),                    -- Embedding para similaridade
  metadata JSONB DEFAULT '{}',               -- Metadados do documento
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 5.1.2 Tabelas de Configuração

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- AGENT_BRANDING - Identidade do agente Luna
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE agent_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_agente TEXT DEFAULT 'Luna',
  nome_empresa TEXT DEFAULT 'Sagitta Digital',
  tom_comunicacao TEXT DEFAULT 'profissional',
  personalidade TEXT DEFAULT 'Amigável, consultiva, proativa',
  usa_emojis BOOLEAN DEFAULT true,
  assinatura TEXT,
  sobre_empresa TEXT,
  website_empresa TEXT,
  briefing_pos_agendamento JSONB,            -- Perguntas do briefing
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- AGENT_PROMPTS - Prompts versionados do agente
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE agent_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                        -- Nome do prompt
  version TEXT NOT NULL,                     -- Versão (v1.0, v1.1, etc)
  channel TEXT DEFAULT 'whatsapp',           -- 'whatsapp' | 'web' | 'all'
  prompt_text TEXT NOT NULL,                 -- Texto do prompt
  is_active BOOLEAN DEFAULT false,           -- Se é o prompt ativo
  config JSONB DEFAULT '{"temperature": 0.7, "max_tokens": 500}',
  notes TEXT,                                -- Anotações sobre a versão
  created_by TEXT,                           -- Quem criou
  created_at TIMESTAMPTZ DEFAULT now()
);
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- AGENT_RESOURCES - Recursos enviáveis (PDFs, links)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE agent_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,                        -- 'apresentacao' | 'proposta' | 'link'
  nome TEXT NOT NULL,                        -- Nome do recurso
  descricao TEXT,                            -- Descrição
  link TEXT NOT NULL,                        -- URL do recurso
  preco TEXT,                                -- Preço se aplicável
  ativo BOOLEAN DEFAULT true,                -- Se está ativo
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- REMINDER_SETTINGS - Configurações de lembretes
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,                       -- Label (ex: "30 minutos antes")
  interval_minutes INTEGER NOT NULL,         -- Minutos antes da reunião
  message_template TEXT NOT NULL,            -- Template com placeholders
  enabled BOOLEAN DEFAULT true,              -- Se está ativo
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Placeholders disponíveis: {nome}, {horario}, {link}, {data}
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- SYSTEM_CONFIG - Configurações gerais do sistema
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_link TEXT,                          -- Link público da agenda
  briefing_link TEXT,                        -- Link do formulário de briefing
  samuel_email TEXT,                         -- Email do fundador
  samuel_whatsapp TEXT,                      -- WhatsApp do fundador
  endereco_fiscal TEXT,                      -- Endereço fiscal
  endereco_comercial TEXT,                   -- Endereço comercial
  dias_antecedencia_agendamento INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 5.1.3 Tabelas de Auditoria e Log

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- ACTIVITY_LOG - Log de atividades no sistema
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  event_type TEXT NOT NULL,                  -- Tipo do evento
  details JSONB DEFAULT '{}',                -- Detalhes do evento
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Event types: 'lead_created', 'stage_changed', 'bant_updated', 
--              'meeting_scheduled', 'message_sent', 'handoff_requested', etc
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- LEAD_MERGES - Histórico de merges de leads
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE lead_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_lead_id UUID REFERENCES leads(id),  -- Lead que permanece
  merged_lead_id UUID REFERENCES leads(id),  -- Lead mesclado
  merge_strategy TEXT NOT NULL,              -- Estratégia usada
  merged_data JSONB DEFAULT '{}',            -- Dados mesclados
  merge_decisions JSONB,                     -- Decisões tomadas
  merged_by TEXT,                            -- Quem/o que fez o merge
  notes TEXT,                                -- Observações
  merged_at TIMESTAMPTZ DEFAULT now()
);
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- TOOL_EXECUTION_LOGS - Log de execução de tools
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE tool_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL,                   -- Nome da tool
  lead_id UUID REFERENCES leads(id),
  conversation_id UUID REFERENCES conversations(id),
  params JSONB,                              -- Parâmetros usados
  result JSONB,                              -- Resultado
  success BOOLEAN NOT NULL,                  -- Se foi sucesso
  error_message TEXT,                        -- Mensagem de erro se houver
  execution_time_ms INTEGER,                 -- Tempo de execução
  executed_at TIMESTAMPTZ DEFAULT now()
);
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- SECURITY_LOGS - Logs de segurança
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,                  -- 'rate_limit', 'blocked_number', etc
  user_phone TEXT,                           -- Telefone envolvido
  severity TEXT NOT NULL,                    -- 'info', 'warning', 'critical'
  details JSONB DEFAULT '{}',                -- Detalhes do evento
  timestamp TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 Views

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- AGENT_METRICS - Métricas do agente (últimos 7 dias)
-- ═══════════════════════════════════════════════════════════════════════
CREATE VIEW agent_metrics AS
SELECT 
  COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') as leads_novos_7d,
  COUNT(*) FILTER (WHERE score_bant >= 50 AND created_at > now() - interval '7 days') as leads_qualificados_7d,
  -- ... outras métricas
FROM leads;
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- AVAILABLE_SLOTS_VIEW - Slots disponíveis (filtra passados)
-- ═══════════════════════════════════════════════════════════════════════
CREATE VIEW available_slots_view AS
SELECT 
  cs.*,
  NOT is_slot_past(cs.date, cs.time) as is_future_slot
FROM calendar_slots cs
WHERE NOT is_slot_past(cs.date, cs.time);
```

### 5.3 Funções SQL

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- FIND_POTENTIAL_DUPLICATES - Busca leads duplicados
-- ═══════════════════════════════════════════════════════════════════════
CREATE FUNCTION find_potential_duplicates(
  p_telefone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_nome TEXT DEFAULT NULL,
  p_exclude_id UUID DEFAULT NULL
) RETURNS TABLE (
  lead_id UUID,
  match_type TEXT,
  match_score INTEGER,
  lead_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    CASE 
      WHEN normalize_phone_for_comparison(l.telefone) = normalize_phone_for_comparison(p_telefone) THEN 'phone_exact'
      WHEN LOWER(TRIM(l.email)) = LOWER(TRIM(p_email)) THEN 'email_exact'
      WHEN similarity(LOWER(l.nome), LOWER(p_nome)) > 0.7 THEN 'name_fuzzy'
      ELSE 'no_match'
    END,
    CASE 
      WHEN normalize_phone_for_comparison(l.telefone) = normalize_phone_for_comparison(p_telefone) THEN 100
      WHEN LOWER(TRIM(l.email)) = LOWER(TRIM(p_email)) THEN 90
      WHEN similarity(LOWER(l.nome), LOWER(p_nome)) > 0.7 THEN 60
      ELSE 0
    END,
    jsonb_build_object(...)
  FROM leads l
  WHERE (l.id != p_exclude_id OR p_exclude_id IS NULL)
    AND (/* match conditions */);
END;
$$ LANGUAGE plpgsql;
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- NORMALIZE_PHONE_FOR_COMPARISON - Normaliza telefone brasileiro
-- ═══════════════════════════════════════════════════════════════════════
CREATE FUNCTION normalize_phone_for_comparison(phone_number TEXT)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
BEGIN
  -- Remove não-numéricos
  cleaned := regexp_replace(phone_number, '\D', '', 'g');
  
  -- Remove 9º dígito para comparação (celulares BR)
  IF length(cleaned) = 13 AND substring(cleaned, 3, 2) IN ('11','12',...) THEN
    IF substring(cleaned, 5, 1) = '9' THEN
      RETURN '55' || substring(cleaned, 3, 2) || substring(cleaned, 6);
    END IF;
  END IF;
  
  RETURN cleaned;
END;
$$ LANGUAGE plpgsql;
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- GENERATE_SLOTS_FROM_BATCH - Gera slots a partir de um batch
-- ═══════════════════════════════════════════════════════════════════════
CREATE FUNCTION generate_slots_from_batch(
  p_batch_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_days_of_week INTEGER[],
  p_start_time TIME,
  p_end_time TIME,
  p_slot_duration INTEGER,
  p_gap_minutes INTEGER
) RETURNS INTEGER AS $$
-- Itera de start_date até end_date
-- Para cada dia que está em days_of_week
-- Gera slots de start_time até end_time com duração e gap
$$ LANGUAGE plpgsql;
```

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- MATCH_KNOWLEDGE_BASE - Busca RAG por similaridade
-- ═══════════════════════════════════════════════════════════════════════
CREATE FUNCTION match_knowledge_base(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  chunk_index INT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id, kb.title, kb.content, kb.chunk_index, kb.metadata,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

### 5.4 Triggers

```sql
-- Libera slot quando reunião é cancelada
CREATE TRIGGER liberar_slot_on_meeting_cancel
  AFTER UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION liberar_slot_on_meeting_cancel();

-- Bloqueia slot quando reunião é criada
CREATE TRIGGER block_slot_on_meeting_insert
  AFTER INSERT ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION block_slot_on_meeting_insert();

-- Cria lembretes quando reunião é agendada
CREATE TRIGGER create_meeting_reminders
  AFTER INSERT ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION create_meeting_reminders();

-- Log de mudanças BANT
CREATE TRIGGER log_lead_bant_change
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_bant_change();

-- Garante apenas 1 prompt ativo por canal
CREATE TRIGGER ensure_single_active_prompt_per_channel
  BEFORE UPDATE ON agent_prompts
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_prompt_per_channel();
```

---

## 6. Backend - Edge Functions

### 6.1 Função Principal: Orchestrator

**Arquivo:** `supabase/functions/orchestrator/index.ts`

**Responsabilidades:**
- Coordenar todo o fluxo de processamento de mensagens
- Integrar módulos do agente
- Gerenciar contexto da conversa
- Executar tools e retornar respostas

**Fluxo de Execução:**
```
1. Recebe mensagem + contexto
2. Intent Classification → Identifica intenção
3. Quick Reply Check → Resposta rápida se alta confiança
4. Sentiment Analysis → Analisa tom emocional
5. Context Analysis → Atualiza tracking de contexto
6. RAG Search → Busca conhecimento relevante
7. Load Active Prompt → Carrega prompt do banco
8. OpenAI Call → Gera resposta com tools
9. Tool Execution → Executa actions se necessário
10. Response Validation → Valida resposta
11. Save & Return → Salva e retorna
```

### 6.2 Módulos do Agente

| Módulo | Arquivo | Função |
|--------|---------|--------|
| Intent Classifier | `agent/intent-classifier.ts` | Classifica intenção (greeting, pricing, scheduling, etc) |
| Sentiment Analyzer | `agent/sentiment.ts` | Analisa sentimento (positive, neutral, negative) |
| Context Analyzer | `agent/context-analyzer.ts` | Rastreia tópico, preferências, progresso BANT |
| Quick Replies | `agent/quick-replies.ts` | Respostas rápidas para alta confiança |
| Follow-up | `agent/follow-up.ts` | Agenda mensagens de follow-up |
| Response Validator | `agent/response-validator.ts` | Valida respostas antes de enviar |
| Degraded Mode | `agent/degraded-mode.ts` | Fallback quando OpenAI falha |

### 6.3 Webhooks

#### WhatsApp Webhook
**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

```typescript
// Fluxo:
1. Recebe evento da Evolution API
2. Valida assinatura do webhook
3. Extrai mensagem (texto ou transcrição de áudio)
4. Verifica rate limit (50 msg/hora)
5. Verifica número bloqueado
6. Detecta duplicatas (sync merge se score >= 90)
7. Chama orchestrator
8. Envia resposta via Evolution API
9. Salva mensagens no banco
```

#### Web Chat
**Arquivo:** `supabase/functions/web-chat/index.ts`

```typescript
// Fluxo:
1. Recebe mensagem do widget
2. Cria/busca lead por visitor_id
3. Chama orchestrator com channel='web'
4. Retorna resposta JSON
```

#### Google Webhook
**Arquivo:** `supabase/functions/google-webhook/index.ts`

```typescript
// Fluxo:
1. Recebe notificação do Google Calendar
2. Verifica eventos alterados/cancelados
3. Atualiza reuniões no banco
4. Libera slots se necessário
```

### 6.4 Tools (Ações do Agente)

#### Tools WhatsApp
| Tool | Arquivo | Função |
|------|---------|--------|
| `registrar_bant` | `tools/whatsapp-handlers.ts` | Registra qualificação BANT |
| `atualizar_lead` | `tools/whatsapp-handlers.ts` | Atualiza dados do lead |
| `buscar_disponibilidade` | `tools/whatsapp-handlers.ts` | Lista slots disponíveis |
| `AgendarReuniaoWhatsApp` | `tools/whatsapp-handlers.ts` | Agenda reunião + Google Calendar |
| `enviar_apresentacao` | `tools/whatsapp-handlers.ts` | Envia PDF de apresentação |
| `agendar_followup` | `tools/whatsapp-handlers.ts` | Agenda mensagem futura |
| `solicitar_handoff` | `tools/whatsapp-handlers.ts` | Solicita intervenção humana |

#### Tools Web
| Tool | Arquivo | Função |
|------|---------|--------|
| `coletar_contato` | `tools/web-handlers.ts` | Coleta email/telefone |
| `buscar_disponibilidade` | `tools/web-handlers.ts` | Lista slots disponíveis |
| `pre_agendar` | `tools/web-handlers.ts` | Pré-agenda reunião |
| `registrar_interesse` | `tools/web-handlers.ts` | Registra interesse em serviço |

### 6.5 APIs CRUD

| Função | Endpoint | Método | Descrição |
|--------|----------|--------|-----------|
| `agent-branding` | `/agent-branding` | GET/PUT | Configurações do agente |
| `agent-prompts` | `/agent-prompts` | GET/POST/PUT | Gerenciar prompts |
| `agent-resources` | `/agent-resources` | GET/POST/PUT/DELETE | Recursos enviáveis |
| `experiments-api` | `/experiments-api` | GET/POST/PUT | Experimentos A/B |

### 6.6 Integrações

#### Google Calendar
| Função | Descrição |
|--------|-----------|
| `google-auth-url` | Gera URL de autorização OAuth |
| `google-callback` | Processa callback OAuth |
| `google-calendar-create` | Cria evento no Calendar |
| `google-calendar-cancel` | Cancela evento |
| `google-calendar-sync` | Sincroniza eventos |
| `google-setup-watch` | Configura webhook |
| `google-webhook` | Recebe notificações |
| `renew-google-watch` | Renova webhook (CronJob) |
| `push-to-google-calendar` | Push de eventos pendentes |

#### Evolution API (WhatsApp)
| Função | Descrição |
|--------|-----------|
| `test-evolution-connection` | Testa conexão |
| `send-admin-message` | Envia mensagem do admin |

### 6.7 Processamento

| Função | Descrição |
|--------|-----------|
| `generate-embedding` | Gera embedding OpenAI |
| `rag-search` | Busca na knowledge base |
| `knowledge-base-process` | Processa documentos para RAG |
| `generate-meeting-context` | Gera contexto de reunião via IA |
| `finalizar-contextos-pendentes` | Finaliza contextos timeout |

---

## 7. Frontend - Páginas e Componentes

### 7.1 Estrutura de Rotas

```
/                          → Index (redirect)
├── /login                 → LoginPage
├── /signup                → SignUpPage
├── /reset-password        → ResetPasswordPage
│
├── /dashboard             → DashboardPage (Protected)
├── /leads                 → LeadsPage (Protected)
├── /leads/:id             → LeadDetailsPage (Protected)
├── /inbox                 → InboxPage (Protected)
├── /calendar              → CalendarPage (Protected)
├── /analytics             → AnalyticsPage (Protected)
├── /agent                 → AgentSettingsPage (Protected)
├── /availability          → AvailabilitySettingsPage (Protected)
├── /experiments           → ExperimentsPage (Protected)
├── /profile               → ProfilePage (Protected)
├── /settings/embed        → EmbedSettings (Protected)
├── /settings/test-mode    → TestModeSettings (Protected)
├── /test-agent            → TestAgent (Protected)
├── /tests                 → TestRunnerPage (Protected)
│
├── /chat-demo             → ChatDemo (Public)
└── /chat-embed            → ChatEmbed (Public)
```

### 7.2 Páginas Públicas

#### ChatDemo (`/chat-demo`)
- Demonstração do widget de chat
- Acessível sem login
- Mostra capacidades do agente

#### ChatEmbed (`/chat-embed`)
- Widget embeddable para sites externos
- Iframe-friendly
- Customizável via parâmetros

### 7.3 Páginas Administrativas

#### Dashboard (`/dashboard`)
**Componentes:**
- `AgendaTodayCard` - Reuniões do dia
- `AgendaMetricsCard` - Métricas de agenda
- `StatCard` - Cards de estatísticas
- Gráficos de performance

#### Leads (`/leads`)
**Funcionalidades:**
- Listagem paginada com filtros
- Busca por nome/telefone/email
- Filtro por stage do funil
- Ordenação por colunas
- Exportação CSV
- Criação manual de leads

**Componentes:**
- `LeadFilters` - Filtros avançados
- `CreateLeadModal` - Modal de criação
- `DuplicateAlert` - Alerta de duplicatas
- `MergeLeadsModal` - Modal de merge

#### Lead Details (`/leads/:id`)
**Seções:**
- Informações de contato
- Card BANT com scores
- Timeline de atividades
- Histórico de conversas
- Reuniões agendadas
- Contexto de reunião

**Componentes:**
- `BantCard` - Qualificação BANT
- `LeadTimeline` - Timeline visual
- `LeadConversations` - Histórico de chat
- `MeetingContextCard` - Contexto da reunião
- `ScheduleMeetingModal` - Agendar reunião
- `EditBantModal` - Editar BANT
- `SendMessageModal` - Enviar mensagem

#### Inbox (`/inbox`)
**Layout:**
- Sidebar de canais
- Lista de conversas
- Painel de mensagens
- Sidebar do contato

**Componentes:**
- `InboxSidebar` - Filtros por canal
- `ConversationList` - Lista de conversas
- `MessageThread` - Thread de mensagens
- `ContactSidebar` - Info do contato
- `ChannelIcon` - Ícone do canal
- `OnlineIndicator` - Status online

#### Calendar (`/calendar`)
**Visualizações:**
- Calendário mensal
- Lista de reuniões
- Gestão de slots

**Componentes:**
- `MeetingsTable` - Tabela de reuniões
- `MeetingDetailsModal` - Detalhes da reunião
- `CreateMeetingModal` - Criar reunião
- `RescheduleMeetingModal` - Reagendar
- `CancelMeetingDialog` - Cancelar
- `MeetingReportModal` - Relatório
- `SlotsListView` - Lista de slots
- `ManageSlotModal` - Gerenciar slot
- `ExportButton` - Exportar agenda
- `SetupWatchDialog` - Config Google Watch

#### Agent Settings (`/agent`)
**Tabs:**
1. **Identidade** - Nome, tom, personalidade
2. **Prompts** - Versionamento de prompts
3. **Knowledge** - Base de conhecimento
4. **Recursos** - PDFs e links
5. **Integrações** - WhatsApp, Google
6. **Follow-up** - Configurações de lembretes

**Componentes:**
- `IdentityTab` - Configurações de identidade
- `PromptEditorTab` - Editor de prompts
- `KnowledgeTab` - Upload de documentos
- `ServicesTab` - Serviços e recursos
- `IntegrationsTab` - Status de integrações
- `FollowUpTab` - Lembretes

#### Availability (`/availability`)
**Funcionalidades:**
- Criar lotes de slots
- Gerenciar exceções
- Visualização semanal
- Templates de disponibilidade

**Componentes:**
- `SlotBatchForm` - Formulário de lote
- `SlotBatchList` - Lista de lotes
- `EditSlotBatchModal` - Editar lote
- `SlotGenerator` - Gerador visual
- `WeeklySchedule` - Visão semanal
- `ExceptionManager` - Gerenciar exceções

#### Analytics (`/analytics`)
**Métricas:**
- Leads novos vs qualificados
- Taxa de conversão
- Tempo até qualificação
- Performance por canal
- Sentimento das conversas

**Componentes:**
- `AgentMetricsCard` - Card de métricas
- Gráficos Recharts

### 7.4 Componentes Compartilhados

| Componente | Uso |
|------------|-----|
| `AuthenticatedLayout` | Layout com sidebar/header |
| `Sidebar` | Navegação lateral |
| `Header` | Cabeçalho com notificações |
| `NotificationDropdown` | Dropdown de notificações |
| `ProtectedRoute` | Proteção de rotas auth |
| `PageHeader` | Cabeçalho de página |
| `EmptyState` | Estado vazio |
| `LoadingSpinner` | Spinner de loading |
| `StatCard` | Card de estatística |
| `SkeletonCard` | Skeleton loading |
| `SkeletonTable` | Skeleton de tabela |

### 7.5 Custom Hooks

| Hook | Função |
|------|--------|
| `useAuth` | Autenticação Supabase |
| `useLeads` | CRUD de leads |
| `useLeadActivities` | Timeline de atividades |
| `useLeadAnalytics` | Métricas de leads |
| `useLeadConversations` | Conversas do lead |
| `useMeetings` | CRUD de reuniões |
| `useAvailableSlots` | Slots disponíveis |
| `useSlotBatches` | Lotes de slots |
| `useAvailabilityExceptions` | Exceções |
| `useKnowledgeBase` | Base de conhecimento |
| `useAgentBranding` | Config do agente |
| `useAgentPrompts` | Prompts do agente |
| `useAgentResources` | Recursos do agente |
| `useNotifications` | Notificações |
| `useReminderSettings` | Config de lembretes |
| `useDuplicateDetection` | Detecção de duplicatas |
| `useRealtimeInbox` | Inbox em tempo real |
| `useRealtimeLeads` | Leads em tempo real |
| `useRealtimeNotifications` | Notificações realtime |
| `useWebChat` | Hook do chat widget |
| `useCalendarEvents` | Eventos do calendário |

---

## 8. Integrações Externas

### 8.1 Evolution API (WhatsApp)

**Configuração:**
```env
EVOLUTION_API_URL=https://api.evolution.com
EVOLUTION_API_KEY=xxxxx
EVOLUTION_INSTANCE_NAME=sagitta
EVOLUTION_WEBHOOK_SECRET=xxxxx
```

**Endpoints Utilizados:**
| Endpoint | Método | Uso |
|----------|--------|-----|
| `/message/sendText` | POST | Enviar texto |
| `/message/sendMedia` | POST | Enviar PDF/imagem |
| `/webhook/set` | POST | Configurar webhook |

**Payload do Webhook:**
```json
{
  "event": "messages.upsert",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "id": "3EB0..."
    },
    "message": {
      "conversation": "Texto da mensagem"
    },
    "pushName": "Nome do Contato"
  }
}
```

**Áudio Transcription:**
- Evolution API transcreve áudios automaticamente
- Mensagens chegam com prefixo `[audio]`
- Sistema processa como texto normal

### 8.2 Google Calendar

**OAuth 2.0 Flow:**
```
1. Admin clica "Conectar Google"
2. Sistema gera URL de autorização
3. Admin autoriza no Google
4. Google redireciona com code
5. Sistema troca code por tokens
6. Tokens salvos em oauth_tokens
7. Refresh automático quando expira
```

**Scopes:**
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

**Webhook Setup:**
```typescript
// Configura watch no calendário
const response = await calendar.events.watch({
  calendarId: 'primary',
  requestBody: {
    id: channelId,
    type: 'web_hook',
    address: webhookUrl,
    expiration: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 dias
  }
});
```

### 8.3 OpenAI

**Modelos:**
- `gpt-4o` - Chat completions
- `text-embedding-3-small` - Embeddings para RAG

**Configuração:**
```env
OPENAI_API_KEY=sk-xxxxx
```

**Uso:**
```typescript
// Chat Completion com Tools
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  tools: toolDefinitions,
  tool_choice: 'auto',
  temperature: 0.7,
  max_tokens: 500
});

// Embedding
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: text
});
```

---

## 9. Automações e CronJobs

### 9.1 CronJobs Configurados

| Job | Schedule | Função |
|-----|----------|--------|
| `auto-merge-duplicates` | `0 6 * * *` (3h BRT) | Processa leads flagged |
| `process-reminders` | `*/5 * * * *` (5 min) | Envia lembretes pendentes |
| `process-scheduled-messages` | `*/5 * * * *` (5 min) | Envia follow-ups |
| `renew-google-watch` | `0 0 */6 * *` (6 dias) | Renova webhook Google |
| `finalizar-contextos-pendentes` | `*/30 * * * *` (30 min) | Timeout de contextos |

### 9.2 Auto-Merge Duplicates

**Arquivo:** `supabase/functions/auto-merge-duplicates/index.ts`

**Fluxo:**
```
1. Busca leads com metadata.potential_duplicate_of (flagged)
2. Para cada lead flagged:
   a. Re-executa find_potential_duplicates
   b. Se score = 100: auto-merge
   c. Se score < 60: remove flag
   d. Se score 60-99: mantém flag
3. Failsafe: busca TODOS os leads
   a. Detecta duplicatas não flagged
   b. Auto-merge score = 100
4. Gera relatório
5. Envia notificação para admin
```

### 9.3 Process Reminders

**Arquivo:** `supabase/functions/process-reminders/index.ts`

**Fluxo:**
```
1. Busca reminders onde scheduled_for <= now() AND sent = false
2. Para cada reminder:
   a. Busca meeting e lead associados
   b. Aplica template com placeholders
   c. Envia via Evolution API
   d. Marca como sent
```

### 9.4 Process Scheduled Messages

**Arquivo:** `supabase/functions/process-scheduled-messages/index.ts`

**Fluxo:**
```
1. Busca scheduled_messages pendentes
2. Para cada mensagem:
   a. Verifica se não foi cancelada
   b. Busca lead
   c. Envia via Evolution API
   d. Marca como sent
```

---

## 10. Fluxos de Negócio

### 10.1 Fluxo de Qualificação BANT

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FLUXO DE QUALIFICAÇÃO BANT                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. NEED (Natural) ───────────────────────────────────────────────────  │
│     └─ "O que você está buscando resolver?"                             │
│     └─ Extrair necessidade durante conversa                             │
│                                                                          │
│  2. TIMELINE (Importante) ────────────────────────────────────────────  │
│     └─ "Você tem algum prazo em mente?"                                 │
│     └─ Identificar urgência do projeto                                  │
│                                                                          │
│  3. BUDGET (Obrigatório) ─────────────────────────────────────────────  │
│     └─ "Você já tem orçamento definido para isso?"                      │
│     └─ ✅ Sim / ❌ Não / ⏳ Em definição                                 │
│                                                                          │
│  4. AUTHORITY (Obrigatório) ──────────────────────────────────────────  │
│     └─ "Você é o responsável pela decisão?"                             │
│     └─ ✅ Decisor / 👥 Influenciador / ❓ Não sei                       │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                          │
│  SCORE BANT:                                                             │
│  ├─ Budget OK + Authority OK = Qualificado para agendar                 │
│  ├─ Score >= 50 = Lead qualificado                                      │
│  └─ Score < 50 = Nurturing necessário                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Fluxo de Agendamento

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       FLUXO DE AGENDAMENTO                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PRÉ-REQUISITOS:                                                        │
│  ├─ Budget = qualificado ✅                                             │
│  ├─ Authority = qualificado ✅                                          │
│  └─ Email = coletado ✅                                                 │
│                                                                          │
│  FLUXO:                                                                  │
│  1. Luna oferece agendamento                                            │
│  2. Luna chama buscar_disponibilidade                                   │
│  3. Sistema retorna próximos X slots disponíveis                        │
│  4. Luna apresenta opções formatadas                                    │
│  5. Lead escolhe horário                                                │
│  6. Luna chama AgendarReuniaoWhatsApp:                                  │
│     a. Valida slot disponível                                           │
│     b. Cria registro em meetings                                        │
│     c. Trigger bloqueia slot                                            │
│     d. Cria evento no Google Calendar                                   │
│     e. Gera link do Google Meet                                         │
│     f. Trigger cria reminders                                           │
│  7. Luna envia confirmação com link                                     │
│  8. Lead muda para stage "Reunião Agendada"                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.3 Fluxo de Merge de Duplicatas

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FLUXO DE MERGE DE DUPLICATAS                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  DETECÇÃO (Sync):                                                       │
│  ├─ Novo contato chega (WhatsApp/Web/Manual)                           │
│  ├─ Sistema chama find_potential_duplicates                            │
│  └─ Retorna matches com scores                                          │
│                                                                          │
│  DECISÃO POR SCORE:                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ SCORE >= 90 (phone/email exato)                                 │   │
│  │ └─ AUTO-MERGE SÍNCRONO                                          │   │
│  │    ├─ Busca lead existente                                      │   │
│  │    ├─ Executa decideMergeStrategy                               │   │
│  │    ├─ Preserva dados mais completos                             │   │
│  │    ├─ Mantém stage mais avançado                                │   │
│  │    ├─ Guarda alternativos em metadata                           │   │
│  │    ├─ Registra em lead_merges                                   │   │
│  │    └─ Retorna ID do lead existente                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ SCORE 60-89 (nome similar)                                      │   │
│  │ └─ CRIAR COM FLAG                                               │   │
│  │    ├─ Cria lead normalmente                                     │   │
│  │    ├─ Adiciona metadata.potential_duplicate_of                  │   │
│  │    └─ CronJob processa depois                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ SCORE < 60 (sem match)                                          │   │
│  │ └─ CRIAR NORMALMENTE                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  CRONJOB DIÁRIO (3h):                                                   │
│  ├─ Processa leads flagged                                              │
│  ├─ Re-verifica duplicatas                                              │
│  ├─ Auto-merge score = 100                                              │
│  ├─ Failsafe: scan completo                                             │
│  └─ Notifica admin                                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.4 Fluxo de Contexto de Reunião

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     FLUXO DE CONTEXTO DE REUNIÃO                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TRIGGER: Admin clica "Gerar Contexto da Reunião"                       │
│                                                                          │
│  PROCESSAMENTO:                                                          │
│  1. Busca todas as mensagens da conversa                                │
│  2. Busca perguntas do briefing (agent_branding)                        │
│  3. Chama generate-meeting-context:                                     │
│     a. Analisa conversa completa                                        │
│     b. Extrai objetivos do cliente                                      │
│     c. Identifica pontos principais                                     │
│     d. Gera resumo técnico                                              │
│     e. Sugere agenda de reunião                                         │
│     f. Extrai respostas do briefing                                     │
│  4. Salva em meetings.contexto_reuniao                                  │
│                                                                          │
│  ESTRUTURA DO CONTEXTO:                                                 │
│  {                                                                       │
│    "status": "complete" | "partial" | "timeout",                        │
│    "resumo_conversa": "...",                                            │
│    "agenda_sugerida": ["...", "..."],                                   │
│    "briefing_qa": [                                                     │
│      { "pergunta": "...", "resposta": "...", "status": "answered" }    │
│    ],                                                                    │
│    "gerado_em": "2024-12-01T10:00:00Z"                                  │
│  }                                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Segurança

### 11.1 Autenticação

**Método:** Supabase Auth (Email/Password)

**Configuração:**
- Auto-confirm email habilitado
- Reset de senha via email
- Sessão persistente

### 11.2 Row Level Security (RLS)

**Todas as tabelas têm RLS habilitado:**

```sql
-- Exemplo: leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar leads"
  ON leads FOR SELECT
  USING (true);  -- Admin vê todos

CREATE POLICY "Usuários autenticados podem inserir leads"
  ON leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar leads"
  ON leads FOR UPDATE
  USING (true);
```

### 11.3 Rate Limiting

```typescript
// 50 mensagens por hora por telefone
const MAX_MESSAGES_PER_HOUR = 50;

async function checkRateLimit(phone: string): Promise<boolean> {
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('telefone', phone)
    .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000));
  
  if (count >= MAX_MESSAGES_PER_HOUR) {
    await logSecurityEvent('rate_limit', phone, 'warning');
    return false;
  }
  return true;
}
```

### 11.4 Números Bloqueados

```sql
-- Tabela blocked_numbers
CREATE TABLE blocked_numbers (
  id UUID PRIMARY KEY,
  telefone TEXT NOT NULL,
  motivo TEXT NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT now()
);

-- Verificação antes de processar
SELECT EXISTS(
  SELECT 1 FROM blocked_numbers 
  WHERE telefone = normalize_phone($1)
);
```

### 11.5 Validação de Dados

- **Telefone:** Normalização + validação de formato
- **Email:** Lowercase + trim + validação regex
- **Inputs:** Sanitização contra injection

---

## 12. Requisitos Não-Funcionais

### 12.1 Performance

| Métrica | Target |
|---------|--------|
| Tempo de resposta (P95) | < 3s |
| Disponibilidade | 99.5% |
| Concurrent users | 100+ |
| Messages/hour | 1000+ |

### 12.2 Escalabilidade

- Edge Functions auto-scaling
- PostgreSQL connection pooling
- Rate limiting por usuário
- Caching de prompts e branding

### 12.3 Monitoramento

- Logs em todas as edge functions
- Métricas via agent_metrics view
- Alertas de erro via notificações
- Security logs para auditoria

### 12.4 Backup e Recuperação

- Backup automático Supabase (diário)
- Point-in-time recovery disponível
- Histórico de merges em lead_merges
- Activity log para auditoria

---

## Apêndices

### A. Secrets Configurados

| Secret | Uso |
|--------|-----|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin |
| `SUPABASE_ANON_KEY` | Chave pública |
| `OPENAI_API_KEY` | API OpenAI |
| `EVOLUTION_API_URL` | URL Evolution |
| `EVOLUTION_API_KEY` | API Key Evolution |
| `EVOLUTION_INSTANCE_NAME` | Nome da instância |
| `EVOLUTION_WEBHOOK_SECRET` | Secret do webhook |
| `GOOGLE_CLIENT_ID` | OAuth Google |
| `GOOGLE_CLIENT_SECRET` | Secret Google |

### B. Extensões PostgreSQL

| Extensão | Uso |
|----------|-----|
| `pgvector` | Embeddings e similaridade |
| `pg_trgm` | Fuzzy matching de texto |
| `pg_cron` | CronJobs |
| `pg_net` | HTTP requests |

### C. Estrutura de Arquivos

```
├── docs/
│   ├── 01_ARCHITECTURE.md
│   ├── 02_DATABASE.md
│   ├── 03_EDGE_FUNCTIONS.md
│   ├── 04_FRONTEND.md
│   ├── 05_FEATURES.md
│   └── PRD.md
│
├── src/
│   ├── components/
│   │   ├── ui/              # Shadcn/UI
│   │   ├── shared/          # Compartilhados
│   │   ├── agent/           # Configuração do agente
│   │   ├── availability/    # Disponibilidade
│   │   ├── calendar/        # Calendário
│   │   ├── chat/            # Widget de chat
│   │   ├── dashboard/       # Dashboard
│   │   ├── inbox/           # Caixa de entrada
│   │   ├── layout/          # Layout
│   │   ├── leads/           # Leads
│   │   └── settings/        # Configurações
│   │
│   ├── pages/
│   │   ├── auth/            # Login, signup, reset
│   │   ├── public/          # Chat demo/embed
│   │   └── [feature]/       # Páginas por feature
│   │
│   ├── lib/
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utilitários
│   │   └── types/           # TypeScript types
│   │
│   └── integrations/
│       └── supabase/        # Cliente e tipos
│
├── supabase/
│   ├── functions/
│   │   ├── orchestrator/
│   │   ├── whatsapp-webhook/
│   │   ├── web-chat/
│   │   ├── agent/           # Módulos do agente
│   │   ├── tools/           # Tool handlers
│   │   ├── prompts/         # Prompts do sistema
│   │   ├── lib/             # Utilitários
│   │   ├── google/          # Google helpers
│   │   └── [function]/      # Outras funções
│   │
│   └── config.toml          # Configuração
│
└── knowledge-base/          # Documentos RAG
    ├── informacoes-gerais.md
    ├── servicos.md
    ├── faq.md
    ├── casos-sucesso.md
    └── objecoes.md
```

---

**Documento mantido por:** Equipe Sagitta Digital  
**Última atualização:** Dezembro 2024
