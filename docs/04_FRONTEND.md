# 🖥️ FRONTEND

## Visão Geral

SPA React com TypeScript, Tailwind CSS e Shadcn/UI. Roteamento via React Router.

---

## Rotas

### Públicas (Sem autenticação)

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/login` | `LoginPage` | Tela de login |
| `/signup` | `SignUpPage` | Tela de cadastro |
| `/reset-password` | `ResetPasswordPage` | Recuperação de senha |
| `/chat` | `ChatDemo` | Demo do chat widget |
| `/chat-embed` | `ChatEmbed` | Widget embeddable |
| `/demo` | `ChatDemo` | Alias para /chat |

### Protegidas (Requer autenticação)

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/` | Redirect → `/dashboard` | Raiz redireciona |
| `/dashboard` | `DashboardPage` | Painel principal |
| `/leads` | `LeadsPage` | Lista de leads |
| `/leads/:id` | `LeadDetailsPage` | Detalhes do lead |
| `/inbox` | `InboxPage` | Caixa de entrada |
| `/calendar` | `CalendarPage` | Agenda/calendário |
| `/analytics` | `AnalyticsPage` | Relatórios e métricas |
| `/agent-settings` | `AgentSettingsPage` | Config do agente |
| `/experiments` | `ExperimentsPage` | Testes A/B |
| `/tests` | `TestRunnerPage` | Executor de testes |
| `/profile` | `ProfilePage` | Perfil do usuário |
| `/settings/availability` | `AvailabilitySettingsPage` | Config de disponibilidade |
| `/settings/embed` | `EmbedSettings` | Config do widget embed |
| `/settings/test-mode` | `TestModeSettings` | Modo de teste |
| `/test-agent` | `TestAgent` | Teste do agente |

---

## Páginas

### `DashboardPage`
Painel principal com visão geral.

**Componentes:**
- `AgendaTodayCard` - Reuniões do dia
- `AgendaMetricsCard` - Métricas de agenda
- `StatCard` - Cards de estatísticas

**Dados:**
- Total de leads
- Reuniões hoje
- Taxa de conversão
- Leads novos (7 dias)

---

### `LeadsPage`
Lista e gerenciamento de leads.

**Funcionalidades:**
- Tabela paginada de leads
- Filtros (stage, data, busca)
- Criar novo lead
- Exportar lista

**Componentes:**
- `LeadFilters` - Filtros de busca
- `CreateLeadModal` - Modal de criação
- `DuplicateAlert` - Alerta de duplicatas

---

### `LeadDetailsPage`
Detalhes completos de um lead.

**Seções:**
- Informações básicas (nome, telefone, email)
- Status no funil
- Qualificação BANT (`BantCard`)
- Histórico de reuniões
- Contexto de reunião (`MeetingContextCard`)
- Conversas (`LeadConversations`)
- Timeline de atividades (`LeadTimeline`)

**Ações:**
- Editar BANT (`EditBantModal`)
- Agendar reunião (`ScheduleMeetingModal`)
- Enviar mensagem (`SendMessageModal`)
- Bloquear lead (`BlockLeadDialog`)
- Solicitar handoff (`RequestHandoffDialog`)
- Merge com duplicata (`MergeLeadsModal`)

---

### `InboxPage`
Caixa de entrada unificada multicanal.

**Layout:**
- Sidebar de canais
- Lista de conversas
- Painel de mensagens
- Sidebar de contato

**Componentes:**
- `InboxSidebar` - Navegação de canais
- `ConversationListPanel` - Lista de conversas
- `MessagePanel` - Área de mensagens
- `MessageThread` - Thread de mensagens
- `ContactSidebar` - Detalhes do contato

**Features:**
- Realtime updates
- Indicador online
- Filtro por canal (WhatsApp, Web)
- Busca de conversas

---

### `CalendarPage`
Gestão de agenda e slots.

**Visualizações:**
- Calendário visual (React Big Calendar)
- Lista de slots (`SlotsListView`)
- Tabela de reuniões (`MeetingsTable`)

**Componentes:**
- `MeetingStatsCards` - Estatísticas
- `CreateMeetingModal` - Criar reunião manual
- `MeetingDetailsModal` - Detalhes da reunião
- `RescheduleMeetingModal` - Reagendar
- `CancelMeetingDialog` - Cancelar
- `MeetingReportModal` - Relatório
- `ManageSlotModal` - Gerenciar slot
- `ExportButton` - Exportar calendário
- `SetupWatchDialog` - Config Google sync

**Badges:**
- `SlotStatusBadge` - Status do slot
- `MeetingContextBadge` - Status do contexto

---

### `AgentSettingsPage`
Configurações completas do agente Luna.

**Tabs:**
- `IdentityTab` - Identidade (nome, empresa, tom)
- `ServicesTab` - Serviços/recursos
- `KnowledgeTab` - Base de conhecimento
- `PromptEditorTab` - Editor de prompts
- `IntegrationsTab` - Integrações externas
- `FollowUpTab` - Configurações de follow-up

**Componentes Settings:**
- `IdentitySettings` - Formulário de identidade
- `ResourcesSettings` - CRUD de recursos
- `KnowledgeBaseStatus` - Status da KB
- `SystemSettings` - Configs do sistema

---

### `AvailabilitySettingsPage`
Configuração de disponibilidade.

**Componentes:**
- `SlotBatchForm` - Criar lote de slots
- `SlotBatchList` - Lista de lotes
- `EditSlotBatchModal` - Editar lote
- `WeeklySchedule` - Visualização semanal
- `ExceptionManager` - Gerenciar exceções
- `SlotGenerator` - Gerador manual

---

### `AnalyticsPage`
Relatórios e métricas.

**Componentes:**
- `AgentMetricsCard` - Métricas do agente
- Gráficos (Recharts)
- Tabelas de dados

---

### `ExperimentsPage`
Gerenciamento de testes A/B.

**Funcionalidades:**
- Criar experimento
- Definir variantes
- Ver resultados
- Encerrar experimento

---

### `ProfilePage`
Perfil do usuário admin.

**Campos:**
- Nome
- Email
- Telefone
- Avatar

---

### `ChatDemo` / `ChatEmbed`
Widget de chat para website.

**Componente principal:** `ChatWidget`

**Props:**
- `embedded` - Se está embeddido (iframe)

---

## Componentes Compartilhados

### Layout

#### `AuthenticatedLayout`
Layout wrapper para rotas protegidas.

```tsx
<AuthenticatedLayout>
  <Sidebar />
  <Header />
  <main>{children}</main>
</AuthenticatedLayout>
```

#### `ProtectedRoute`
HOC que verifica autenticação.

```tsx
<ProtectedRoute>
  <SomeProtectedPage />
</ProtectedRoute>
```

#### `Sidebar`
Navegação lateral principal.

**Links:**
- Dashboard
- Leads
- Inbox
- Calendar
- Analytics
- Agent Settings
- Settings

#### `Header`
Cabeçalho com:
- Título da página
- `NotificationDropdown`
- Avatar/perfil

---

### Shared

#### `PageHeader`
Cabeçalho padronizado de página.

```tsx
<PageHeader
  title="Leads"
  description="Gerencie seus contatos"
  action={<Button>Novo Lead</Button>}
/>
```

#### `StatCard`
Card de estatística.

```tsx
<StatCard
  title="Total Leads"
  value={150}
  icon={<Users />}
  trend="+12%"
/>
```

#### `EmptyState`
Estado vazio padronizado.

```tsx
<EmptyState
  icon={<FileQuestion />}
  title="Nenhum lead encontrado"
  description="Crie seu primeiro lead"
  action={<Button>Criar Lead</Button>}
/>
```

#### `LoadingSpinner`
Spinner de carregamento.

#### `SkeletonCard` / `SkeletonTable`
Skeletons para loading states.

---

### UI (Shadcn)

Componentes base do Shadcn/UI:

- `Button` - Botões com variantes
- `Card` - Cards
- `Dialog` - Modais
- `Sheet` - Side panels
- `Tabs` - Navegação em tabs
- `Table` - Tabelas
- `Form` - Formulários com react-hook-form
- `Input` / `Textarea` - Inputs
- `Select` - Selects
- `Checkbox` / `Switch` - Toggles
- `Badge` - Badges/tags
- `Avatar` - Avatares
- `Tooltip` - Tooltips
- `Popover` - Popovers
- `DropdownMenu` - Menus dropdown
- `Toast` / `Sonner` - Notificações

---

## Hooks Customizados

### Autenticação

#### `useAuth`
Hook de autenticação Supabase.

```tsx
const { user, loading, signIn, signUp, signOut } = useAuth();
```

---

### Leads

#### `useLeads`
CRUD de leads.

```tsx
const { leads, isLoading, createLead, updateLead, deleteLead } = useLeads();
```

#### `useRealtimeLeads`
Leads com realtime updates.

#### `useLeadActivities`
Atividades/timeline do lead.

#### `useLeadConversations`
Conversas do lead.

#### `useLeadAnalytics`
Métricas do lead.

#### `useDuplicateDetection`
Detecção de duplicatas.

```tsx
const { duplicates, isLoading } = useDuplicateDetection(leadId);
const { mergeLead } = useMergeLead();
```

---

### Reuniões

#### `useMeetings`
CRUD de reuniões.

```tsx
const { meetings, createMeeting, cancelMeeting, rescheduleMeeting } = useMeetings();
```

#### `useCalendarEvents`
Eventos formatados para calendário.

---

### Disponibilidade

#### `useAvailableSlots`
Slots disponíveis.

```tsx
const { slots, isLoading } = useAvailableSlots(startDate, endDate);
```

#### `useSlotBatches`
CRUD de lotes de slots.

#### `useAvailabilityTemplates`
Templates de disponibilidade.

#### `useAvailabilityExceptions`
Exceções de disponibilidade.

#### `useTemplateRules`
Regras de templates.

#### `useAvailabilityCheck`
Verifica disponibilidade.

---

### Agente

#### `useAgentBranding`
Configurações de branding.

```tsx
const { branding, updateBranding } = useAgentBranding();
```

#### `useAgentPrompts`
CRUD de prompts.

```tsx
const { prompts, createPrompt, activatePrompt } = useAgentPrompts();
```

#### `useAgentResources`
CRUD de recursos/serviços.

#### `useKnowledgeBase`
Base de conhecimento.

---

### Inbox

#### `useRealtimeInbox`
Inbox com realtime.

```tsx
const { conversations, messages, sendMessage } = useRealtimeInbox();
```

---

### Outros

#### `useNotifications`
Notificações do sistema.

#### `useRealtimeNotifications`
Notificações realtime.

#### `useReminderSettings`
Configurações de lembretes.

#### `useWebChat`
Hook do chat widget.

```tsx
const { messages, sendMessage, isLoading } = useWebChat();
```

---

## Utilitários

### `lib/utils.ts`
Utilitário `cn()` para classes condicionais.

```tsx
cn("base-class", condition && "conditional-class")
```

### `lib/utils/format.ts`
Formatação de dados.

```tsx
formatPhone("5511999999999") // "(11) 99999-9999"
formatDate(date) // "15/01/2024"
formatCurrency(1500) // "R$ 1.500,00"
```

### `lib/utils/phoneValidation.ts`
Validação de telefone brasileiro.

### `lib/utils/emailValidation.ts`
Validação de email.

### `lib/utils/export.ts`
Exportação de dados (CSV, etc).

### `lib/utils/exportCalendar.ts`
Exportação de calendário (ICS).

### `lib/utils/mergeStrategy.ts`
Estratégia de merge de leads.

---

## Design System

### Cores (index.css)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
  --border: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

### Tailwind Config

```js
theme: {
  extend: {
    colors: {
      border: "hsl(var(--border))",
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      primary: {
        DEFAULT: "hsl(var(--primary))",
        foreground: "hsl(var(--primary-foreground))",
      },
      // ...
    },
  },
}
```

---

## Estado Global

### React Query
Gerenciamento de estado server-side.

```tsx
const queryClient = new QueryClient();

// Em App.tsx
<QueryClientProvider client={queryClient}>
  {/* ... */}
</QueryClientProvider>
```

### Patterns
- `useQuery` para leitura
- `useMutation` para escrita
- `invalidateQueries` para refresh
- Realtime via Supabase channels
