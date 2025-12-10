import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SystemConfig {
  agenda_link: string;
  samuel_whatsapp: string;
  samuel_email: string;
  briefing_link: string;
  endereco_fiscal: string;
  endereco_comercial: string;
}

export const SystemSettings = () => {
  const queryClient = useQueryClient();
  
  const { data: config, isLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_config')
        .select('*')
        .single();
      
      return data as SystemConfig;
    }
  });

  const [localConfig, setLocalConfig] = useState<SystemConfig>(config || {} as SystemConfig);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const saveMutation = useMutation({
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
      toast.error('Erro ao salvar configurações');
    }
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Links e Contatos</h3>
        
        <div className="space-y-4">
          <div>
            <Label>Link da Agenda</Label>
            <Input
              value={localConfig?.agenda_link || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, agenda_link: e.target.value })}
              placeholder="https://calendar.app.google/..."
            />
          </div>

          <div>
            <Label>WhatsApp Samuel</Label>
            <Input
              value={localConfig?.samuel_whatsapp || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, samuel_whatsapp: e.target.value })}
              placeholder="+55 11 94203-8803"
            />
          </div>

          <div>
            <Label>Email Samuel</Label>
            <Input
              value={localConfig?.samuel_email || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, samuel_email: e.target.value })}
              placeholder="samuel.alves@sagittadigital.com.br"
            />
          </div>

          <div>
            <Label>Link do Briefing</Label>
            <Input
              value={localConfig?.briefing_link || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, briefing_link: e.target.value })}
              placeholder="https://forms.gle/..."
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Endereços</h3>
        
        <div className="space-y-4">
          <div>
            <Label>Endereço Fiscal (Brasil)</Label>
            <Textarea
              value={localConfig?.endereco_fiscal || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, endereco_fiscal: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label>Endereço Comercial (Bolívia)</Label>
            <Textarea
              value={localConfig?.endereco_comercial || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, endereco_comercial: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      </Card>

      <Button
        onClick={() => saveMutation.mutate(localConfig)}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
      </Button>
    </div>
  );
};
