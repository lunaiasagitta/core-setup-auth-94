import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AgentBranding {
  id: string;
  nome_agente: string;
  nome_empresa: string;
  website_empresa?: string;
  sobre_empresa?: string;
  tom_comunicacao: string;
  personalidade?: string;
  usa_emojis: boolean;
  assinatura?: string;
  briefing_pos_agendamento?: {
    perguntas: string[];
  };
  created_at: string;
  updated_at: string;
}

export const useAgentBranding = () => {
  const queryClient = useQueryClient();

  const { data: branding, isLoading } = useQuery({
    queryKey: ["agent-branding"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("agent-branding", {
        method: "GET",
      });

      if (error) throw error;
      return data as AgentBranding;
    },
  });

  const updateBranding = useMutation({
    mutationFn: async (updates: Partial<AgentBranding>) => {
      const { data, error } = await supabase.functions.invoke("agent-branding", {
        method: "PUT",
        body: { ...branding, ...updates },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-branding"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  return {
    branding,
    isLoading,
    updateBranding: updateBranding.mutate,
    isUpdating: updateBranding.isPending,
  };
};
