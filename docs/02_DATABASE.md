# 🗄️ BANCO DE DADOS

## Visão Geral

PostgreSQL hospedado no Supabase com extensões:
- `pgvector` - Embeddings para RAG
- `pg_trgm` - Similaridade fuzzy de texto
- `pg_cron` - Jobs agendados
- `pg_net` - HTTP requests de dentro do banco

---

## Tabelas Principais

### `leads`
Contatos/potenciais clientes do CRM.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `telefone` | text | No | - | Telefone normalizado (único por lead) |
| `nome` | text | Yes | - | Nome do lead |
| `email` | text | Yes | - | Email do lead |
| `empresa` | text | Yes | - | Nome da empresa |
| `necessidade` | text | Yes | - | Necessidade identificada |
| `stage` | text | Yes | 'Novo' | Estágio no funil |
| `score_bant` | integer | Yes | 0 | Score de qualificação BANT |
| `bant_details` | jsonb | Yes | {} | Detalhes BANT coletados |
| `proposta_ia` | text | Yes | - | Proposta sugerida pela IA |
| `os_funil_lead` | text | Yes | - | Observações do funil |
| `metadata` | jsonb | Yes | {} | Dados extras (duplicatas, etc) |
| `created_at` | timestamptz | Yes | now() | Data de criação |
| `updated_at` | timestamptz | Yes | now() | Última atualização |

**Stages válidos:**
- `Novo`
- `Apresentação Enviada`
- `Segundo Contato`
- `Reunião Agendada`
- `Proposta Enviada`
- `Fechado`
- `Perdido`

**RLS Policies:**
- SELECT, INSERT, UPDATE, DELETE: `true` (usuários autenticados)

---

### `conversations`
Sessões de conversa com leads.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `lead_id` | uuid | Yes | - | FK para leads |
| `session_id` | text | No | - | ID único da sessão |
| `channel` | text | Yes | 'whatsapp' | Canal (whatsapp, web) |
| `visitor_id` | text | Yes | - | ID do visitante web |
| `current_topic` | text | Yes | - | Tópico atual |
| `last_sentiment` | text | Yes | - | Último sentimento detectado |
| `interest_signals` | integer | Yes | 0 | Contador de sinais positivos |
| `objections_count` | integer | Yes | 0 | Contador de objeções |
| `objections_raised` | text[] | Yes | {} | Lista de objeções |
| `questions_asked` | text[] | Yes | {} | Perguntas feitas |
| `information_provided` | text[] | Yes | {} | Informações fornecidas |
| `bant_progress` | jsonb | Yes | {...} | Progresso BANT |
| `preferences` | jsonb | Yes | {} | Preferências detectadas |
| `context` | jsonb | Yes | {} | Contexto da conversa |
| `state` | jsonb | Yes | {} | Estado da máquina |
| `metadata` | jsonb | Yes | {} | Metadados extras |
| `updated_at` | timestamptz | Yes | now() | Última atualização |

**RLS Policies:**
- SELECT, INSERT, UPDATE: `true` (usuários autenticados)

---

### `messages`
Mensagens das conversas.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `conversation_id` | uuid | Yes | - | FK para conversations |
| `role` | text | No | - | 'user' ou 'assistant' |
| `content` | text | No | - | Conteúdo da mensagem |
| `channel` | text | Yes | 'whatsapp' | Canal de origem |
| `external_message_id` | text | Yes | - | ID externo (deduplicação) |
| `tools_used` | jsonb | Yes | - | Ferramentas usadas |
| `timestamp` | timestamptz | Yes | now() | Data/hora |

**RLS Policies:**
- SELECT, INSERT: `true` (usuários autenticados)

---

### `meetings`
Reuniões agendadas.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `lead_id` | uuid | Yes | - | FK para leads |
| `scheduled_date` | timestamptz | No | - | Data/hora da reunião |
| `duration` | integer | Yes | 30 | Duração em minutos |
| `status` | text | Yes | 'scheduled' | Status atual |
| `meeting_link` | text | Yes | - | Link do Google Meet |
| `google_event_id` | text | Yes | - | ID do evento no Google |
| `contexto_reuniao` | jsonb | Yes | - | Contexto gerado pela IA |
| `cancelled_at` | timestamptz | Yes | - | Data de cancelamento |
| `created_at` | timestamptz | Yes | now() | Data de criação |
| `updated_at` | timestamptz | Yes | now() | Última atualização |

**Status válidos:**
- `scheduled`
- `confirmed`
- `completed`
- `cancelled`
- `no_show`

**Triggers:**
- `create_meeting_reminders` - Cria lembretes automáticos
- `block_slot_on_meeting_insert` - Bloqueia slot ao criar
- `liberar_slot_on_meeting_cancel` - Libera slot ao cancelar

**RLS Policies:**
- SELECT, INSERT, UPDATE: `true` (usuários autenticados)

---

### `calendar_slots`
Slots de disponibilidade para agendamento.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `date` | date | No | - | Data do slot |
| `time` | time | No | - | Hora do slot |
| `duration` | integer | Yes | 30 | Duração em minutos |
| `available` | boolean | Yes | true | Disponível? |
| `reserved_by` | uuid | Yes | - | FK para leads |
| `reserved_at` | timestamptz | Yes | - | Quando foi reservado |
| `batch_id` | uuid | Yes | - | FK para slot_batches |
| `template_id` | uuid | Yes | - | FK para templates |
| `is_exception` | boolean | Yes | false | É exceção? |

**RLS Policies:**
- SELECT, INSERT, UPDATE, DELETE: `true` (usuários autenticados)

---

### `slot_batches`
Configurações de geração de slots em lote.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `name` | text | No | - | Nome do lote |
| `start_date` | date | No | - | Data início |
| `end_date` | date | No | - | Data fim |
| `start_time` | time | No | - | Hora início |
| `end_time` | time | No | - | Hora fim |
| `days_of_week` | integer[] | No | - | Dias (0=Dom, 6=Sab) |
| `slot_duration` | integer | No | 30 | Duração do slot |
| `gap_minutes` | integer | No | 0 | Intervalo entre slots |
| `active` | boolean | Yes | true | Ativo? |
| `created_at` | timestamptz | Yes | now() | Data de criação |
| `updated_at` | timestamptz | Yes | now() | Última atualização |

---

### `knowledge_base`
Base de conhecimento para RAG.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `title` | text | No | - | Título do documento |
| `content` | text | No | - | Conteúdo (chunk) |
| `chunk_index` | integer | Yes | - | Índice do chunk |
| `embedding` | vector | Yes | - | Embedding 1536 dims |
| `metadata` | jsonb | Yes | {} | Metadados |
| `created_at` | timestamptz | Yes | now() | Data de criação |
| `updated_at` | timestamptz | Yes | now() | Última atualização |

**RLS Policies:**
- SELECT, INSERT, UPDATE: `true` (usuários autenticados)

---

### `agent_branding`
Configurações de identidade do agente.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `nome_agente` | text | No | 'Luna' | Nome do agente |
| `nome_empresa` | text | No | 'Sagitta Digital' | Nome da empresa |
| `website_empresa` | text | Yes | - | Website |
| `sobre_empresa` | text | Yes | - | Descrição |
| `tom_comunicacao` | text | Yes | 'profissional' | Tom |
| `personalidade` | text | Yes | - | Traços de personalidade |
| `usa_emojis` | boolean | Yes | true | Usar emojis? |
| `assinatura` | text | Yes | - | Assinatura |
| `briefing_pos_agendamento` | jsonb | Yes | {...} | Perguntas pós-agendamento |

---

### `agent_prompts`
Prompts versionados do agente.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `name` | text | No | - | Nome do prompt |
| `version` | text | No | - | Versão (v1, v2...) |
| `channel` | text | No | 'whatsapp' | Canal |
| `prompt_text` | text | No | - | Texto do prompt |
| `is_active` | boolean | Yes | false | Ativo para este canal? |
| `config` | jsonb | Yes | {...} | Configurações (temp, tokens) |
| `notes` | text | Yes | - | Notas |
| `created_by` | text | Yes | - | Criador |
| `created_at` | timestamptz | Yes | now() | Data de criação |

**Trigger:**
- `ensure_single_active_prompt_per_channel` - Apenas um prompt ativo por canal

---

### `agent_resources`
Recursos/serviços disponíveis.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `tipo` | text | No | - | Tipo (apresentacao, proposta) |
| `nome` | text | No | - | Nome do recurso |
| `link` | text | No | - | URL do arquivo |
| `descricao` | text | Yes | - | Descrição |
| `preco` | text | Yes | - | Faixa de preço |
| `ativo` | boolean | Yes | true | Ativo? |

---

### `reminders`
Lembretes de reuniões.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `meeting_id` | uuid | Yes | - | FK para meetings |
| `type` | text | No | - | Tipo do lembrete |
| `scheduled_for` | timestamptz | No | - | Quando enviar |
| `sent` | boolean | Yes | false | Foi enviado? |
| `sent_at` | timestamptz | Yes | - | Quando foi enviado |

---

### `reminder_settings`
Configurações de lembretes.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `label` | text | No | - | Label (ex: "30 min antes") |
| `interval_minutes` | integer | No | - | Minutos antes |
| `message_template` | text | No | - | Template com {placeholders} |
| `enabled` | boolean | Yes | true | Habilitado? |

---

### `scheduled_messages`
Mensagens de follow-up agendadas.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `lead_id` | uuid | Yes | - | FK para leads |
| `message` | text | No | - | Conteúdo |
| `scheduled_for` | timestamptz | No | - | Quando enviar |
| `sent` | boolean | Yes | false | Enviado? |
| `sent_at` | timestamptz | Yes | - | Quando enviou |
| `canceled` | boolean | Yes | false | Cancelado? |
| `cancel_reason` | text | Yes | - | Motivo |

---

### `lead_merges`
Histórico de merges de leads duplicados.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `master_lead_id` | uuid | No | - | Lead principal |
| `merged_lead_id` | uuid | No | - | Lead mesclado |
| `merge_strategy` | text | No | - | Estratégia usada |
| `merged_data` | jsonb | No | {} | Dados resultantes |
| `merge_decisions` | jsonb | Yes | - | Decisões por campo |
| `notes` | text | Yes | - | Notas |
| `merged_by` | text | Yes | - | Quem fez |
| `merged_at` | timestamptz | Yes | now() | Quando |

---

### `activity_log`
Log de atividades do sistema.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `lead_id` | uuid | Yes | - | FK para leads |
| `event_type` | text | No | - | Tipo do evento |
| `details` | jsonb | Yes | {} | Detalhes |
| `timestamp` | timestamptz | Yes | now() | Data/hora |

**Eventos comuns:**
- `lead_criado`
- `lead_merged`
- `mudanca_stage`
- `bant_atualizado`
- `reuniao_agendada`
- `reuniao_cancelada`

---

### `tool_execution_logs`
Log de execução de ferramentas do agente.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `lead_id` | uuid | Yes | - | FK para leads |
| `conversation_id` | uuid | Yes | - | FK para conversations |
| `tool_name` | text | No | - | Nome da ferramenta |
| `params` | jsonb | Yes | - | Parâmetros |
| `result` | jsonb | Yes | - | Resultado |
| `success` | boolean | No | - | Sucesso? |
| `error_message` | text | Yes | - | Erro se houver |
| `execution_time_ms` | integer | Yes | - | Tempo em ms |
| `executed_at` | timestamptz | Yes | now() | Quando |

---

### `notifications`
Notificações do sistema.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `user_id` | uuid | Yes | - | FK para auth.users |
| `type` | text | No | - | Tipo |
| `title` | text | No | - | Título |
| `description` | text | Yes | - | Descrição |
| `link` | text | Yes | - | Link de ação |
| `read` | boolean | Yes | false | Lida? |
| `created_at` | timestamptz | Yes | now() | Data |

---

### `oauth_tokens`
Tokens OAuth (Google Calendar).

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `provider` | text | No | - | Provedor (google) |
| `access_token` | text | No | - | Token de acesso |
| `refresh_token` | text | Yes | - | Token de refresh |
| `expires_at` | timestamptz | No | - | Expiração |
| `token_type` | text | Yes | 'Bearer' | Tipo |
| `scope` | text | Yes | - | Escopos |

---

### `profiles`
Perfis de usuários admin.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | - | FK para auth.users |
| `nome` | text | Yes | - | Nome |
| `email` | text | Yes | - | Email |
| `telefone` | text | Yes | - | Telefone |
| `avatar_url` | text | Yes | - | Avatar |

---

### `system_config`
Configurações gerais do sistema.

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `agenda_link` | text | Yes | - | Link da agenda |
| `briefing_link` | text | Yes | - | Link do briefing |
| `samuel_whatsapp` | text | Yes | - | WhatsApp do fundador |
| `samuel_email` | text | Yes | - | Email do fundador |
| `endereco_fiscal` | text | Yes | - | Endereço fiscal |
| `endereco_comercial` | text | Yes | - | Endereço comercial |
| `dias_antecedencia_agendamento` | integer | Yes | 3 | Dias antecedência |

---

## Views

### `available_slots_view`
Slots disponíveis no futuro (filtra passados).

```sql
SELECT * FROM calendar_slots
WHERE NOT is_slot_past(date, time)
```

### `agent_metrics`
Métricas agregadas do agente (últimos 7 dias).

| Coluna | Descrição |
|--------|-----------|
| `leads_novos_7d` | Leads criados |
| `leads_qualificados_7d` | Leads qualificados |
| `taxa_qualificacao_7d` | % de qualificação |
| `reunioes_agendadas_7d` | Reuniões agendadas |
| `horas_ate_qualificacao` | Tempo médio |
| `conversas_positivas` | Sentimento positivo |
| `conversas_negativas` | Sentimento negativo |
| `handoffs_solicitados` | Pedidos de handoff |

---

## Funções SQL

### `find_potential_duplicates`
Busca leads duplicados.

```sql
find_potential_duplicates(
  p_telefone TEXT,
  p_email TEXT,
  p_nome TEXT,
  p_exclude_id UUID
) RETURNS TABLE (
  lead_id UUID,
  match_type TEXT,
  match_score INTEGER,
  lead_data JSONB
)
```

**Match Types:**
- `phone_exact` - Score 100
- `email_exact` - Score 90
- `name_fuzzy` - Score 60 (similarity > 0.7)

### `normalize_phone_for_comparison`
Normaliza telefone para comparação (remove 9º dígito).

### `generate_slots_from_batch`
Gera slots a partir de configuração de batch.

### `sync_all_slots`
Sincroniza slots com meetings (libera órfãos).

### `is_slot_past`
Verifica se slot já passou (timezone America/Sao_Paulo).

### `match_knowledge_base`
Busca similaridade na knowledge base (RAG).

```sql
match_knowledge_base(
  query_embedding VECTOR,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
```

---

## Triggers

### Meetings
- `create_meeting_reminders` - ON INSERT → cria lembretes
- `block_slot_on_meeting_insert` - ON INSERT → bloqueia slot
- `liberar_slot_on_meeting_cancel` - ON UPDATE → libera slot se cancelado
- `liberar_slot_on_meeting_delete` - ON DELETE → libera slot

### Leads
- `log_lead_bant_change` - ON UPDATE → loga mudanças BANT
- `validate_and_normalize_phone` - ON INSERT/UPDATE → normaliza telefone

### Agent Prompts
- `ensure_single_active_prompt_per_channel` - ON UPDATE → garante único ativo por canal
