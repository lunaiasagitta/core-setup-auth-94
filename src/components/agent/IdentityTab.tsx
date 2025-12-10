import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAgentBranding } from "@/lib/hooks/useAgentBranding";
import { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Settings, MessageCircle, Plus, X } from "lucide-react";

interface SystemConfig {
  id?: string;
  agenda_link: string;
  samuel_whatsapp: string;
  samuel_email: string;
  briefing_link: string;
  endereco_fiscal: string;
  endereco_comercial: string;
  dias_antecedencia_agendamento: number;
}

export const IdentityTab = () => {
  const queryClient = useQueryClient();
  const { branding, isLoading: isBrandingLoading, updateBranding, isUpdating } = useAgentBranding();
  
  const { data: systemConfig, isLoading: isSystemLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_config')
        .select('*')
        .single();
      return data as SystemConfig;
    }
  });

  const [brandingData, setBrandingData] = useState({
    nome_agente: "",
    nome_empresa: "",
    website_empresa: "",
    sobre_empresa: "",
    tom_comunicacao: "profissional",
    personalidade: "",
    usa_emojis: true,
    assinatura: "",
    briefing_pos_agendamento: { perguntas: [] as string[] },
  });

  const [systemData, setSystemData] = useState<SystemConfig>({
    agenda_link: "",
    samuel_whatsapp: "",
    samuel_email: "",
    briefing_link: "",
    endereco_fiscal: "",
    endereco_comercial: "",
    dias_antecedencia_agendamento: 3,
  });

  useEffect(() => {
    if (branding) {
      setBrandingData({
        nome_agente: branding.nome_agente,
        nome_empresa: branding.nome_empresa,
        website_empresa: branding.website_empresa || "",
        sobre_empresa: branding.sobre_empresa || "",
        tom_comunicacao: branding.tom_comunicacao,
        personalidade: branding.personalidade || "",
        usa_emojis: branding.usa_emojis,
        assinatura: branding.assinatura || "",
        briefing_pos_agendamento: branding.briefing_pos_agendamento || { perguntas: ["Qual o principal desafio que você quer resolver?", "Tem alguma referência de site/app que você gosta?", "Você tem algum prazo específico em mente?"] },
      });
    }
  }, [branding]);

  useEffect(() => {
    if (systemConfig) {
      setSystemData(systemConfig);
    }
  }, [systemConfig]);

  const saveSystemMutation = useMutation({
    mutationFn: async (newConfig: SystemConfig) => {
      const { error } = await supabase
        .from('system_config')
        .upsert(newConfig);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Configurações do sistema salvas!');
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
    },
    onError: () => {
      toast.error('Erro ao salvar configurações do sistema');
    }
  });

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranding(brandingData);
    saveSystemMutation.mutate(systemData);
  };

  if (isBrandingLoading || isSystemLoading) {
    return <LoadingSpinner />;
  }

  const addPergunta = () => {
    setBrandingData({
      ...brandingData,
      briefing_pos_agendamento: {
        perguntas: [...brandingData.briefing_pos_agendamento.perguntas, ""]
      }
    });
  };

  const removePergunta = (index: number) => {
    const novasPerguntas = brandingData.briefing_pos_agendamento.perguntas.filter((_, i) => i !== index);
    setBrandingData({
      ...brandingData,
      briefing_pos_agendamento: { perguntas: novasPerguntas }
    });
  };

  const updatePergunta = (index: number, valor: string) => {
    const novasPerguntas = [...brandingData.briefing_pos_agendamento.perguntas];
    novasPerguntas[index] = valor;
    setBrandingData({
      ...brandingData,
      briefing_pos_agendamento: { perguntas: novasPerguntas }
    });
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-6">
      <Accordion type="multiple" defaultValue={["personality", "briefing"]} className="space-y-4">
        {/* Personalidade do Agente */}
        <AccordionItem value="personality" className="border rounded-lg bg-card hover:bg-accent/5 transition-colors">
          <Card className="border-0 shadow-none">
            <AccordionTrigger className="px-6 pt-6 pb-4 hover:no-underline [&[data-state=open]]:pb-0">
              <CardHeader className="p-0 w-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <CardTitle className="text-lg">Personalidade do Agente</CardTitle>
                    <CardDescription className="mt-1">
                      Configure o nome e como o agente se comunica
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome_agente">Nome do Agente</Label>
                    <Input
                      id="nome_agente"
                      value={brandingData.nome_agente}
                      onChange={(e) => setBrandingData({ ...brandingData, nome_agente: e.target.value })}
                      placeholder="Luna, Sofia, Alex..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome_empresa">Nome da Empresa</Label>
                    <Input
                      id="nome_empresa"
                      value={brandingData.nome_empresa}
                      onChange={(e) => setBrandingData({ ...brandingData, nome_empresa: e.target.value })}
                      placeholder="Sua Empresa"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website_empresa">Website da Empresa</Label>
                  <Input
                    id="website_empresa"
                    type="url"
                    value={brandingData.website_empresa}
                    onChange={(e) => setBrandingData({ ...brandingData, website_empresa: e.target.value })}
                    placeholder="https://suaempresa.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sobre_empresa">Sobre a Empresa</Label>
                  <Textarea
                    id="sobre_empresa"
                    value={brandingData.sobre_empresa}
                    onChange={(e) => setBrandingData({ ...brandingData, sobre_empresa: e.target.value })}
                    placeholder="Descreva sua empresa em 2-3 frases..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tom_comunicacao">Tom de Comunicação</Label>
                  <Select
                    value={brandingData.tom_comunicacao}
                    onValueChange={(value) => setBrandingData({ ...brandingData, tom_comunicacao: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal (corporativo, respeitoso)</SelectItem>
                      <SelectItem value="profissional">Profissional (amigável mas respeitoso)</SelectItem>
                      <SelectItem value="casual">Casual (descontraído, leve)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personalidade">Características de Personalidade</Label>
                  <Textarea
                    id="personalidade"
                    value={brandingData.personalidade}
                    onChange={(e) => setBrandingData({ ...brandingData, personalidade: e.target.value })}
                    placeholder="Amigável, consultiva, proativa, focada em resultados..."
                    rows={2}
                  />
                  <p className="text-sm text-muted-foreground">
                    Separe características por vírgula
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="usa_emojis">Usar Emojis</Label>
                    <p className="text-sm text-muted-foreground">
                      Permite que o agente use emojis nas conversas
                    </p>
                  </div>
                  <Switch
                    id="usa_emojis"
                    checked={brandingData.usa_emojis}
                    onCheckedChange={(checked) => setBrandingData({ ...brandingData, usa_emojis: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assinatura">Assinatura Personalizada (opcional)</Label>
                  <Textarea
                    id="assinatura"
                    value={brandingData.assinatura}
                    onChange={(e) => setBrandingData({ ...brandingData, assinatura: e.target.value })}
                    placeholder="Estou aqui sempre que precisar! 🚀"
                    rows={2}
                  />
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Briefing Pós-Agendamento */}
        <AccordionItem value="briefing" className="border rounded-lg bg-card hover:bg-accent/5 transition-colors">
          <Card className="border-0 shadow-none">
            <AccordionTrigger className="px-6 pt-6 pb-4 hover:no-underline [&[data-state=open]]:pb-0">
              <CardHeader className="p-0 w-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <CardTitle className="text-lg">Briefing Pós-Agendamento</CardTitle>
                    <CardDescription className="mt-1">
                      Configure as perguntas que o agente fará após agendar uma reunião para coletar contexto adicional
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-4 pt-6">
                <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border/50">
                  <p className="text-sm text-muted-foreground">
                    <strong>Como funciona:</strong> Após uma reunião ser agendada com sucesso, o agente automaticamente fará estas perguntas para o lead. 
                    As respostas + um resumo IA da conversa completa serão salvos no contexto da reunião, dando contexto valioso para você se preparar melhor para a call.
                  </p>
                </div>

                <div className="space-y-3">
                  {brandingData.briefing_pos_agendamento.perguntas.map((pergunta, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Label htmlFor={`pergunta-${index}`} className="text-xs text-muted-foreground mb-1">
                          Pergunta {index + 1}
                        </Label>
                        <Textarea
                          id={`pergunta-${index}`}
                          value={pergunta}
                          onChange={(e) => updatePergunta(index, e.target.value)}
                          placeholder="Digite a pergunta que o agente fará..."
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePergunta(index)}
                        className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={brandingData.briefing_pos_agendamento.perguntas.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPergunta}
                  className="w-full"
                  disabled={brandingData.briefing_pos_agendamento.perguntas.length >= 5}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Pergunta {brandingData.briefing_pos_agendamento.perguntas.length >= 5 ? '(Máximo 5)' : ''}
                </Button>

                {brandingData.briefing_pos_agendamento.perguntas.length >= 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Recomendamos no máximo 5 perguntas para não sobrecarregar o lead
                  </p>
                )}
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Configurações do Sistema */}
        <AccordionItem value="system" className="border rounded-lg bg-card hover:bg-accent/5 transition-colors">
          <Card className="border-0 shadow-none">
            <AccordionTrigger className="px-6 pt-6 pb-4 hover:no-underline [&[data-state=open]]:pb-0">
              <CardHeader className="p-0 w-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <CardTitle className="text-lg">Configurações do Sistema</CardTitle>
                    <CardDescription className="mt-1">
                      Links, contatos e endereços que o agente usará
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="agenda_link">Link da Agenda</Label>
                  <Input
                    id="agenda_link"
                    value={systemData.agenda_link || ''}
                    onChange={(e) => setSystemData({ ...systemData, agenda_link: e.target.value })}
                    placeholder="https://calendar.app.google/..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="samuel_whatsapp">WhatsApp Samuel</Label>
                    <Input
                      id="samuel_whatsapp"
                      value={systemData.samuel_whatsapp || ''}
                      onChange={(e) => setSystemData({ ...systemData, samuel_whatsapp: e.target.value })}
                      placeholder="+55 11 94203-8803"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="samuel_email">Email Samuel</Label>
                    <Input
                      id="samuel_email"
                      type="email"
                      value={systemData.samuel_email || ''}
                      onChange={(e) => setSystemData({ ...systemData, samuel_email: e.target.value })}
                      placeholder="samuel.alves@sagittadigital.com.br"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="briefing_link">Link do Briefing</Label>
                  <Input
                    id="briefing_link"
                    value={systemData.briefing_link || ''}
                    onChange={(e) => setSystemData({ ...systemData, briefing_link: e.target.value })}
                    placeholder="https://forms.gle/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco_fiscal">Endereço Fiscal (Brasil)</Label>
                  <Textarea
                    id="endereco_fiscal"
                    value={systemData.endereco_fiscal || ''}
                    onChange={(e) => setSystemData({ ...systemData, endereco_fiscal: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco_comercial">Endereço Comercial (Bolívia)</Label>
                  <Textarea
                    id="endereco_comercial"
                    value={systemData.endereco_comercial || ''}
                    onChange={(e) => setSystemData({ ...systemData, endereco_comercial: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dias_antecedencia">Dias de Antecedência para Agendamento IA</Label>
                  <Input
                    id="dias_antecedencia"
                    type="number"
                    min="1"
                    max="30"
                    value={systemData.dias_antecedencia_agendamento || 3}
                    onChange={(e) => setSystemData({ ...systemData, dias_antecedencia_agendamento: parseInt(e.target.value) })}
                  />
                  <p className="text-sm text-muted-foreground">
                    A IA buscará slots disponíveis no dia atual e nos próximos {systemData.dias_antecedencia_agendamento || 3} {systemData.dias_antecedencia_agendamento === 1 ? 'dia' : 'dias'}.
                    {' '}O link da agenda sempre será enviado para permitir agendamentos personalizados.
                  </p>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isUpdating || saveSystemMutation.isPending}
          size="lg"
        >
          {(isUpdating || saveSystemMutation.isPending) ? "Salvando..." : "Salvar Todas as Configurações"}
        </Button>
      </div>
    </form>
  );
};
