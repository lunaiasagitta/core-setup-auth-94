# ✨ FUNCIONALIDADES

## Visão Geral

Sistema CRM multicanal com agente de IA para qualificação de leads e agendamento de reuniões.

---

## 1. Agente de IA (Luna)

### Descrição
Agente conversacional que atende leads via WhatsApp e Web Chat, qualifica usando metodologia BANT e agenda reuniões.

### Canais
- **WhatsApp** - Via Evolution API
- **Web Chat** - Widget embeddable

### Capacidades

#### Qualificação BANT
- **Budget** - Identifica orçamento disponível
- **Authority** - Verifica autoridade de decisão
- **Need** - Captura necessidade do cliente
- **Timeline** - Entende urgência/prazo

#### Agendamento
- Busca slots disponíveis
- Coleta email obrigatoriamente
- Cria evento no Google Calendar
- Envia link do Google Meet

#### Knowledge Base (RAG)
- Busca informações relevantes
- Responde perguntas sobre serviços
- Usa embeddings para similaridade

#### Análise Contextual
- Classifica intenção (greeting, pricing, etc)
- Analisa sentimento (positive, negative, neutral)
- Rastreia tópico da conversa
- Detecta objeções

### Configurações

#### Identidade
- Nome do agente
- Nome da empresa
- Tom de comunicação
- Personalidade
- Uso de emojis
- Assinatura

#### Prompts
- Versionamento de prompts
- Prompt específico por canal
- Ativação/desativação

#### Recursos
- Apresentações (PDFs)
- Propostas comerciais
- Links úteis

---

## 2. Gestão de Leads

### Descrição
CRUD completo de leads com visualização em funil.

### Funcionalidades

#### Listagem
- Tabela paginada
- Filtros por stage, data, busca
- Ordenação por colunas
- Exportação CSV

#### Detalhes do Lead
- Informações de contato
- Histórico de conversas
- Qualificação BANT
- Timeline de atividades
- Reuniões agendadas

#### Stages do Funil
1. Novo
2. Apresentação Enviada
3. Segundo Contato
4. Reunião Agendada
5. Proposta Enviada
6. Fechado
7. Perdido

#### Ações
- Criar lead manual
- Editar informações
- Mover no funil
- Bloquear número
- Solicitar handoff

---

## 3. Sistema de Duplicatas

### Descrição
Detecção e unificação automática de contatos duplicados.

### Detecção

| Critério | Score |
|----------|-------|
| Telefone exato | 100 |
| Email exato | 90 |
| Nome similar (>70%) | 60 |

### Comportamento

| Score | Ação |
|-------|------|
| >= 90 | Auto-merge síncrono |
| 60-89 | Criar com flag |
| < 60 | Criar normal |

### Merge Automático
- Preserva dados mais completos
- Mantém stage mais avançado
- Guarda valores alternativos em metadata
- Registra histórico em `lead_merges`

### CronJob Diário
- Processa leads flagged
- Re-verifica duplicatas
- Auto-merge score 100
- Notifica admin

---

## 4. Caixa de Entrada (Inbox)

### Descrição
Visualização unificada de todas as conversas.

### Funcionalidades

#### Multicanal
- WhatsApp
- Web Chat
- (Futuro: Email, Instagram)

#### Realtime
- Novas mensagens instantâneas
- Indicador de typing
- Status online

#### Filtros
- Por canal
- Por status (ativo, arquivado)
- Busca por nome/conteúdo

#### Ações
- Responder mensagem
- Visualizar perfil do lead
- Transferir conversa
- Arquivar

---

## 5. Agenda e Calendário

### Descrição
Gestão completa de disponibilidade e reuniões.

### Slots de Disponibilidade

#### Lotes (Batches)
- Definir período (data início/fim)
- Horário de funcionamento
- Dias da semana
- Duração do slot
- Intervalo entre slots

#### Exceções
- Dia indisponível
- Horário customizado
- Motivo da exceção

### Reuniões

#### Criação
- Via agente (automático)
- Manual pelo admin

#### Status
- Agendada
- Confirmada
- Concluída
- Cancelada
- No-show

#### Google Calendar
- Sincronização bidirecional
- Link do Google Meet
- Notificações automáticas

### Lembretes
- Configuráveis pelo admin
- Templates customizáveis
- Múltiplos intervalos (30min, 1h, 24h)
- Placeholders: {nome}, {horario}, {link}

---

## 6. Contexto de Reunião

### Descrição
Geração automática de contexto para preparação de reuniões.

### Componentes

#### Resumo da Conversa
- Análise completa do histórico
- Objetivos do cliente
- Pontos principais
- Resumo técnico

#### Agenda Sugerida
- Tópicos de discussão
- Pontos estratégicos
- Próximos passos

#### Briefing Q&A
- Perguntas configuradas
- Respostas extraídas da conversa
- Status (respondido/pendente)

### Geração
- Manual pelo admin
- Botão "Gerar Contexto"
- Pode ser atualizado

---

## 7. Analytics e Métricas

### Descrição
Relatórios e métricas do sistema.

### Métricas do Agente (7 dias)
- Leads novos
- Leads qualificados
- Taxa de qualificação
- Reuniões agendadas
- Tempo até qualificação
- Conversas positivas/negativas
- Handoffs solicitados

### Gráficos
- Evolução de leads
- Funil de conversão
- Performance por canal
- Distribuição por stage

---

## 8. Base de Conhecimento

### Descrição
Documentos que alimentam o RAG do agente.

### Estrutura
```
knowledge-base/
├── informacoes-gerais.md
├── servicos.md
├── faq.md
├── casos-sucesso.md
└── objecoes.md
```

### Processamento
1. Upload de documento markdown
2. Chunking (divisão em partes)
3. Geração de embeddings
4. Armazenamento com pgvector

### Busca (RAG)
1. Query do usuário
2. Embedding da query
3. Similaridade coseno
4. Top K resultados
5. Injeção no prompt

---

## 9. Experimentos A/B

### Descrição
Sistema de testes para otimização.

### Funcionalidades
- Criar experimento
- Definir variantes (A, B, C...)
- Distribuição automática
- Coleta de métricas
- Análise de resultados

### Métricas Possíveis
- Taxa de resposta
- Taxa de qualificação
- Taxa de agendamento
- Tempo de conversa

---

## 10. Integrações

### WhatsApp (Evolution API)
- Recebimento de mensagens
- Envio de texto
- Envio de mídia (PDF, imagem)
- Transcrição de áudio

### Google Calendar
- OAuth 2.0
- Criação de eventos
- Google Meet automático
- Sincronização bidirecional
- Webhook para updates

### OpenAI
- GPT-4o para conversas
- text-embedding-3-small para RAG

---

## 11. Notificações

### Tipos
- Nova reunião agendada
- Reunião cancelada
- Lead qualificado
- Handoff solicitado
- Erro no sistema

### Entrega
- In-app (NotificationDropdown)
- WhatsApp para admin (urgentes)

---

## 12. Modo de Teste

### Descrição
Ambiente controlado para testes.

### Funcionalidades
- Lista de números de teste
- Ativar/desativar modo
- Mensagens não afetam métricas
- Logs detalhados

---

## 13. Widget Embed

### Descrição
Chat widget para websites externos.

### Implementação
```html
<iframe
  src="https://app.example.com/chat-embed"
  style="position: fixed; bottom: 20px; right: 20px; width: 400px; height: 600px; border: none;"
></iframe>
```

### Customização
- Cores do tema
- Mensagem inicial
- Posicionamento

---

## 14. Segurança

### Autenticação
- Email/senha via Supabase Auth
- Auto-confirm habilitado
- Reset de senha

### Autorização
- RLS em todas as tabelas
- Políticas por usuário
- Service role para edge functions

### Rate Limiting
- 50 mensagens/hora por telefone
- Log de violações

### Blocked Numbers
- Lista de números bloqueados
- Verificação antes de processar

---

## 15. Configurações do Sistema

### system_config
- Link da agenda
- Link do briefing
- Contato do fundador
- Endereços (fiscal/comercial)
- Dias de antecedência para agendamento

### reminder_settings
- Intervalos de lembrete
- Templates de mensagem
- Ativar/desativar

### test_mode_config
- Ativar modo teste
- Números de teste

---

## Fluxos Principais

### Fluxo de Qualificação
```
1. Lead envia mensagem
2. Luna identifica necessidade
3. Luna pergunta sobre timeline
4. Luna qualifica Budget
5. Luna qualifica Authority
6. Se qualificado → oferece agendamento
7. Se não qualificado → nurturing
```

### Fluxo de Agendamento
```
1. Lead qualificado (B+A ok)
2. Luna coleta email
3. Luna mostra slots disponíveis
4. Lead escolhe horário
5. Sistema cria meeting
6. Sistema bloqueia slot
7. Sistema cria evento Google
8. Luna envia confirmação com link
9. Sistema agenda lembretes
```

### Fluxo de Merge
```
1. Novo contato chega
2. Sistema busca duplicatas
3. Se score >= 90:
   a. Busca lead existente
   b. Executa merge strategy
   c. Atualiza lead existente
   d. Registra em lead_merges
4. Se score 60-89:
   a. Cria lead com flag
   b. CronJob processa depois
5. Se score < 60:
   a. Cria lead normal
```

### Fluxo de Contexto
```
1. Reunião agendada
2. Admin clica "Gerar Contexto"
3. Sistema analisa conversa
4. Gera resumo via IA
5. Gera agenda sugerida
6. Extrai respostas do briefing
7. Salva em contexto_reuniao
8. Admin visualiza no modal
```
