import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Phone, Calendar, MessageSquare, Edit2, Building2, Briefcase, Clock, AlertCircle } from 'lucide-react';
import { useLead } from '@/lib/hooks/useLeads';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { getInitials, formatPhone, getWhatsAppLink } from '@/lib/utils/format';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LeadConversations } from '@/components/leads/LeadConversations';
import { LeadTimeline } from '@/components/leads/LeadTimeline';
import { BantCard } from '@/components/leads/BantCard';
import { useState } from 'react';
import { CreateLeadModal } from '@/components/leads/CreateLeadModal';
import { EditBantModal } from '@/components/leads/EditBantModal';
import { SendMessageModal } from '@/components/leads/SendMessageModal';
import { ScheduleMeetingModal } from '@/components/leads/ScheduleMeetingModal';
import { RequestHandoffDialog } from '@/components/leads/RequestHandoffDialog';
import { BlockLeadDialog } from '@/components/leads/BlockLeadDialog';
import { MeetingContextCard } from '@/components/leads/MeetingContextCard';
import { DuplicateAlert } from '@/components/leads/DuplicateAlert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateLead } from '@/lib/hooks/useLeads';
import { useMeetings } from '@/lib/hooks/useMeetings';

const stageColors: Record<string, string> = {
  'Novo': 'bg-blue-500',
  'Apresentação Enviada': 'bg-purple-500',
  'Segundo Contato': 'bg-yellow-500',
  'Reunião Agendada': 'bg-green-500',
  'Proposta Enviada': 'bg-orange-500',
  'Fechado': 'bg-emerald-600',
  'Cancelado': 'bg-red-500',
};

export const LeadDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading, error } = useLead(id!);
  const updateLead = useUpdateLead();
  const meetings = useMeetings({ leadId: id });
  const latestMeeting = meetings.meetings?.[0];
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editBantOpen, setEditBantOpen] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [scheduleMeetingOpen, setScheduleMeetingOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" text="Carregando lead..." />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Lead não encontrado"
        description="O lead que você está procurando não existe ou foi removido."
        action={{
          label: 'Voltar para Leads',
          onClick: () => navigate('/leads'),
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={lead.nome || 'Lead sem nome'}
        breadcrumb={[
          { label: 'Leads', href: '/leads' },
          { label: lead.nome || 'Detalhes' }
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button variant="outline" onClick={() => setSendMessageOpen(true)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Enviar Mensagem
            </Button>
            <Button variant="outline" onClick={() => setScheduleMeetingOpen(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              Agendar Reunião
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Informações do Lead */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-2xl">
                    {getInitials(lead.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold">{lead.nome || 'Sem nome'}</h2>
                    <Select
                      value={lead.stage}
                      onValueChange={(newStage) => {
                        updateLead.mutate({ id: lead.id, stage: newStage });
                      }}
                    >
                      <SelectTrigger className="w-auto h-auto p-0 border-0">
                        <Badge className={stageColors[lead.stage] || 'bg-gray-500'}>
                          {lead.stage}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Novo">Novo</SelectItem>
                        <SelectItem value="Apresentação Enviada">Apresentação Enviada</SelectItem>
                        <SelectItem value="Segundo Contato">Segundo Contato</SelectItem>
                        <SelectItem value="Reunião Agendada">Reunião Agendada</SelectItem>
                        <SelectItem value="Proposta Enviada">Proposta Enviada</SelectItem>
                        <SelectItem value="Fechado">Fechado</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {lead.empresa && (
                    <p className="text-muted-foreground">{lead.empresa}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Telefone */}
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{formatPhone(lead.telefone)}</span>
                <a
                  href={getWhatsAppLink(lead.telefone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Abrir no WhatsApp
                </a>
              </div>

              {/* Email */}
              {lead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${lead.email}`} className="hover:underline">
                    {lead.email}
                  </a>
                </div>
              )}

              {/* Empresa */}
              {lead.empresa && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.empresa}</span>
                </div>
              )}

              {/* Necessidade */}
              {lead.necessidade && (
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">{lead.necessidade}</Badge>
                </div>
              )}

              {/* Datas */}
              <div className="pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" />
                    <span>Criado em</span>
                  </div>
                  <div>{format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" />
                    <span>Atualizado em</span>
                  </div>
                  <div>{format(new Date(lead.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversas */}
          <LeadConversations leadId={lead.id} />

          {/* Timeline */}
          <LeadTimeline leadId={lead.id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* BANT Card */}
          <BantCard
            score={lead.score_bant}
            details={lead.bant_details || {}}
            onEdit={() => setEditBantOpen(true)}
          />

          {/* Meeting Context Card */}
          {latestMeeting && (
            <MeetingContextCard 
              contexto={latestMeeting.contexto_reuniao}
              scheduledDate={latestMeeting.scheduled_date}
              meetingId={latestMeeting.id}
              leadId={lead.id}
              onGenerateContext={() => {
                meetings.generateContext.mutate({
                  meetingId: latestMeeting.id,
                  leadId: lead.id
                });
              }}
              isGenerating={meetings.generateContext.isPending}
            />
          )}

          {/* Ações Adicionais */}
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" onClick={() => setHandoffOpen(true)}>
                Solicitar Handoff
              </Button>
              <Button variant="destructive" className="w-full" onClick={() => setBlockOpen(true)}>
                Bloquear Lead
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modais */}
      {editModalOpen && (
        <CreateLeadModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          initialData={lead}
        />
      )}
      
      <EditBantModal
        open={editBantOpen}
        onOpenChange={setEditBantOpen}
        leadId={lead.id}
        currentBant={lead.bant_details || {}}
      />

      <SendMessageModal
        open={sendMessageOpen}
        onOpenChange={setSendMessageOpen}
        leadId={lead.id}
        leadPhone={lead.telefone}
      />

      <ScheduleMeetingModal
        open={scheduleMeetingOpen}
        onOpenChange={setScheduleMeetingOpen}
        leadId={lead.id}
      />

      <RequestHandoffDialog
        open={handoffOpen}
        onOpenChange={setHandoffOpen}
        leadId={lead.id}
      />

      <BlockLeadDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        leadId={lead.id}
        leadPhone={lead.telefone}
      />
    </div>
  );
};
