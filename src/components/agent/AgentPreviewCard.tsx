import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAgentBranding } from '@/lib/hooks/useAgentBranding';
import { Bot, Building2, Sparkles } from 'lucide-react';

export const AgentPreviewCard = () => {
  const { branding } = useAgentBranding();

  if (!branding) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="h-20 w-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg">
              <Bot className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-2xl font-bold">{branding.nome_agente}</h3>
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Ativo
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{branding.nome_empresa}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Tom {branding.tom_comunicacao}
              </Badge>
              {branding.usa_emojis && (
                <Badge variant="outline">
                  Usa Emojis 😊
                </Badge>
              )}
              {branding.personalidade && (
                <Badge variant="outline">
                  {branding.personalidade.split(',')[0].trim()}
                </Badge>
              )}
            </div>

            {branding.sobre_empresa && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {branding.sobre_empresa}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
