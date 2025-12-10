import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

interface MeetingContextCardProps {
  contexto: any;
  scheduledDate: string;
  meetingId: string;
  leadId: string;
  onGenerateContext: () => void;
  isGenerating?: boolean;
}

export const MeetingContextCard = ({ 
  contexto, 
  scheduledDate, 
  meetingId, 
  leadId, 
  onGenerateContext,
  isGenerating 
}: MeetingContextCardProps) => {
  if (!contexto) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Contexto da Reunião</CardTitle>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Aguardando
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O contexto será coletado após o agendamento da reunião.
          </p>
          <Button 
            onClick={onGenerateContext}
            disabled={isGenerating}
            className="w-full"
            variant="outline"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isGenerating ? 'Gerando contexto...' : 'Gerar Contexto da Reunião'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { perguntas, status, motivo_incompleto, coletado_em, contexto_formatado, gerado_automaticamente } = contexto;
  const perguntasRespondidas = perguntas?.filter((p: any) => p.resposta !== null).length || 0;
  const totalPerguntas = perguntas?.length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Contexto da Reunião</CardTitle>
          <div className="flex items-center gap-2">
            {gerado_automaticamente && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                IA
              </Badge>
            )}
            <Badge 
              variant={status === 'completo' ? 'default' : status === 'parcial' ? 'secondary' : 'destructive'}
              className="flex items-center gap-1"
            >
              {status === 'completo' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {status === 'completo' ? 'Completo' : status === 'parcial' ? 'Parcial' : 'Não Coletado'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informações da Reunião */}
        <div className="text-sm">
          <p className="text-muted-foreground">Reunião agendada para:</p>
          <p className="font-medium">{format(new Date(scheduledDate), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
        </div>

        {/* Contexto Formatado da IA */}
        {contexto_formatado ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{contexto_formatado}</ReactMarkdown>
          </div>
        ) : (
          <>
            {/* Perguntas e Respostas (formato antigo) */}
            {perguntas && perguntas.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Perguntas Coletadas ({perguntasRespondidas}/{totalPerguntas}):</p>
                {perguntas.map((p: any, index: number) => (
                  <div key={index} className="pl-4 border-l-2 border-muted">
                    <p className="text-sm font-medium text-muted-foreground">{p.pergunta}</p>
                    {p.resposta ? (
                      <p className="text-sm mt-1">{p.resposta}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic mt-1">Não respondida</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Motivo Incompleto */}
        {motivo_incompleto && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Motivo:</strong> {motivo_incompleto}
            </p>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2">
          <Button 
            onClick={onGenerateContext}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isGenerating ? 'Atualizando...' : 'Atualizar Contexto'}
          </Button>
        </div>

        {/* Data de Coleta */}
        {coletado_em && (
          <p className="text-xs text-muted-foreground mt-4">
            {gerado_automaticamente ? 'Gerado' : 'Coletado'} em {format(new Date(coletado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
