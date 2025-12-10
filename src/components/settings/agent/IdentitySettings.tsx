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

export const IdentitySettings = () => {
  const { branding, isLoading, updateBranding, isUpdating } = useAgentBranding();
  const [formData, setFormData] = useState({
    nome_agente: "",
    nome_empresa: "",
    website_empresa: "",
    sobre_empresa: "",
    tom_comunicacao: "profissional",
    personalidade: "",
    usa_emojis: true,
    assinatura: "",
  });

  useEffect(() => {
    if (branding) {
      setFormData({
        nome_agente: branding.nome_agente,
        nome_empresa: branding.nome_empresa,
        website_empresa: branding.website_empresa || "",
        sobre_empresa: branding.sobre_empresa || "",
        tom_comunicacao: branding.tom_comunicacao,
        personalidade: branding.personalidade || "",
        usa_emojis: branding.usa_emojis,
        assinatura: branding.assinatura || "",
      });
    }
  }, [branding]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranding(formData);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identidade do Agente</CardTitle>
          <CardDescription>
            Configure o nome e informações básicas do seu agente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_agente">Nome do Agente</Label>
              <Input
                id="nome_agente"
                value={formData.nome_agente}
                onChange={(e) => setFormData({ ...formData, nome_agente: e.target.value })}
                placeholder="Luna, Sofia, Alex..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome_empresa">Nome da Empresa</Label>
              <Input
                id="nome_empresa"
                value={formData.nome_empresa}
                onChange={(e) => setFormData({ ...formData, nome_empresa: e.target.value })}
                placeholder="Sua Empresa"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website_empresa">Website da Empresa</Label>
            <Input
              id="website_empresa"
              type="url"
              value={formData.website_empresa}
              onChange={(e) => setFormData({ ...formData, website_empresa: e.target.value })}
              placeholder="https://suaempresa.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sobre_empresa">Sobre a Empresa</Label>
            <Textarea
              id="sobre_empresa"
              value={formData.sobre_empresa}
              onChange={(e) => setFormData({ ...formData, sobre_empresa: e.target.value })}
              placeholder="Descreva sua empresa em 2-3 frases..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personalidade & Tom</CardTitle>
          <CardDescription>
            Configure como o agente se comunica com os leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tom_comunicacao">Tom de Comunicação</Label>
            <Select
              value={formData.tom_comunicacao}
              onValueChange={(value) => setFormData({ ...formData, tom_comunicacao: value })}
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
              value={formData.personalidade}
              onChange={(e) => setFormData({ ...formData, personalidade: e.target.value })}
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
              checked={formData.usa_emojis}
              onCheckedChange={(checked) => setFormData({ ...formData, usa_emojis: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assinatura">Assinatura Personalizada (opcional)</Label>
            <Textarea
              id="assinatura"
              value={formData.assinatura}
              onChange={(e) => setFormData({ ...formData, assinatura: e.target.value })}
              placeholder="Estou aqui sempre que precisar! 🚀"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isUpdating}>
          {isUpdating ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </form>
  );
};
