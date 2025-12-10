import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Edit2, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BantDetails {
  budget?: { valor: string; confianca: string; timestamp: string };
  authority?: { valor: string; confianca: string; timestamp: string };
  need?: { valor: string; confianca: string; urgencia?: string; timestamp: string };
  timeline?: { valor: string; confianca: string; timestamp: string };
}

interface BantCardProps {
  score: number;
  details: BantDetails;
  onEdit: () => void;
}

const getConfidenceStars = (confianca: string) => {
  const count = confianca === 'high' ? 3 : confianca === 'medium' ? 2 : 1;
  return Array(count).fill('⭐').join('');
};

export const BantCard = ({ score, details, onEdit }: BantCardProps) => {
  const getScoreColor = () => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = () => {
    if (score >= 70) return 'Qualificado';
    if (score >= 40) return 'Em qualificação';
    return 'Não qualificado';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Qualificação BANT</CardTitle>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score */}
        <div className="text-center space-y-2">
          <div className={`text-5xl font-bold ${getScoreColor()}`}>
            {score}
          </div>
          <Progress value={score} className="h-2" />
          <p className="text-sm text-muted-foreground">{getScoreLabel()}</p>
        </div>

        {/* Budget */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Budget</span>
            {details.budget && (
              <span className="text-xs">{getConfidenceStars(details.budget.confianca)}</span>
            )}
          </div>
          {details.budget ? (
            <>
              <p className="text-sm text-muted-foreground">{details.budget.valor}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(details.budget.timestamp), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Não informado</p>
          )}
        </div>

        {/* Authority */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Authority</span>
            {details.authority && (
              <span className="text-xs">{getConfidenceStars(details.authority.confianca)}</span>
            )}
          </div>
          {details.authority ? (
            <>
              <p className="text-sm text-muted-foreground">{details.authority.valor}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(details.authority.timestamp), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Não informado</p>
          )}
        </div>

        {/* Need */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Need</span>
            {details.need && (
              <span className="text-xs">{getConfidenceStars(details.need.confianca)}</span>
            )}
          </div>
          {details.need ? (
            <>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{details.need.valor}</p>
                {details.need.urgencia && (
                  <Badge variant="outline" className="text-xs">
                    {details.need.urgencia}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(details.need.timestamp), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Não informado</p>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Timeline</span>
            {details.timeline && (
              <span className="text-xs">{getConfidenceStars(details.timeline.confianca)}</span>
            )}
          </div>
          {details.timeline ? (
            <>
              <p className="text-sm text-muted-foreground">{details.timeline.valor}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(details.timeline.timestamp), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Não informado</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
