import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLeadActivities } from '@/lib/hooks/useLeadActivities';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  UserPlus,
  ArrowRight,
  Clipboard,
  FileText,
  Calendar,
  CheckCircle,
  User,
  Loader2,
  Edit,
  Bell,
  TrendingUp,
} from 'lucide-react';

interface LeadTimelineProps {
  leadId: string;
}

const eventIcons: Record<string, any> = {
  lead_criado: UserPlus,
  lead_criado_crm: UserPlus, // Compatibilidade
  mudanca_stage: ArrowRight,
  campo_atualizado: Edit,
  status_atualizado: ArrowRight, // Compatibilidade
  necessidade_atualizada: Edit, // Compatibilidade
  bant_atualizado: Clipboard,
  apresentacao_enviada: FileText,
  link_agenda_enviado: Calendar,
  reuniao_agendada: CheckCircle,
  handoff_solicitado: User,
  mensagem_processada: Bell,
  follow_up_enviado: Bell,
};

const eventColors: Record<string, string> = {
  lead_criado: 'text-blue-500',
  lead_criado_crm: 'text-blue-500',
  mudanca_stage: 'text-purple-500',
  campo_atualizado: 'text-cyan-500',
  status_atualizado: 'text-purple-500',
  necessidade_atualizada: 'text-cyan-500',
  bant_atualizado: 'text-green-500',
  apresentacao_enviada: 'text-yellow-500',
  link_agenda_enviado: 'text-orange-500',
  reuniao_agendada: 'text-green-600',
  handoff_solicitado: 'text-red-500',
  mensagem_processada: 'text-muted-foreground',
  follow_up_enviado: 'text-blue-400',
};

const getEventTitle = (eventType: string, details: any): string => {
  switch (eventType) {
    case 'lead_criado':
    case 'lead_criado_crm':
      return 'Lead criado';
    case 'campo_atualizado':
    case 'necessidade_atualizada':
      return details?.campo ? `${details.campo.charAt(0).toUpperCase() + details.campo.slice(1)} atualizado` : 'Campo atualizado';
    case 'bant_atualizado':
      return details?.campo ? `BANT - ${details.campo.toUpperCase()} atualizado` : 'BANT atualizado';
    case 'mudanca_stage':
    case 'status_atualizado':
      return `Mudança de stage${details?.novo_stage || details?.novo_status ? ': ' + (details.novo_stage || details.novo_status) : ''}`;
    case 'apresentacao_enviada':
      return 'Apresentação enviada';
    case 'link_agenda_enviado':
      return 'Link da agenda enviado';
    case 'reuniao_agendada':
      if (details?.data && details?.horario) {
        return `Reunião agendada - ${details.data} ${details.horario}`;
      } else if (details?.data && details?.hora) {
        return `Reunião agendada - ${details.data} ${details.hora}`;
      }
      return 'Reunião agendada';
    case 'handoff_solicitado':
      return `Handoff solicitado${details?.urgencia ? ` (${details.urgencia})` : ''}`;
    case 'mensagem_processada':
      return 'Mensagem processada';
    case 'follow_up_enviado':
      return 'Follow-up enviado';
    default:
      return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

const getEventDetails = (eventType: string, details: any): string => {
  if (!details) return '';
  
  switch (eventType) {
    case 'campo_atualizado':
    case 'necessidade_atualizada':
      return details.valor || details.necessidade || '';
    case 'bant_atualizado':
      if (details.valor && details.confianca) {
        return `${details.valor} (confiança: ${details.confianca})`;
      }
      return '';
    case 'mudanca_stage':
    case 'status_atualizado':
      return details.motivo || '';
    case 'handoff_solicitado':
      return details.motivo || '';
    case 'apresentacao_enviada':
      return details.justificativa || '';
    case 'lead_criado':
    case 'lead_criado_crm':
      return details.criado_por || '';
    default:
      return typeof details === 'string' ? details : JSON.stringify(details);
  }
};

export const LeadTimeline = ({ leadId }: LeadTimelineProps) => {
  const { data: activities, isLoading } = useLeadActivities(leadId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma atividade registrada ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline de Atividades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Linha vertical */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {activities.map((activity) => {
            const Icon = eventIcons[activity.event_type] || ArrowRight;
            const colorClass = eventColors[activity.event_type] || 'text-gray-500';

            return (
              <div key={activity.id} className="relative flex gap-4">
                <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">
                      {getEventTitle(activity.event_type, activity.details)}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {activity.details && getEventDetails(activity.event_type, activity.details) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {getEventDetails(activity.event_type, activity.details)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
