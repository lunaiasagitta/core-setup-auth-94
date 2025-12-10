import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AgentPrompt {
  id: string;
  version: string;
  channel: 'whatsapp' | 'web';
  name: string;
  prompt_text: string;
  is_active: boolean;
  config: {
    temperature: number;
    max_tokens: number;
  };
  created_by: string | null;
  created_at: string;
  notes: string | null;
}

export const useAgentPrompts = (channel?: 'whatsapp' | 'web') => {
  const queryClient = useQueryClient();

  // Buscar todas as versões (filtrado por canal se fornecido)
  const { data: prompts, isLoading } = useQuery({
    queryKey: ["agent-prompts", channel],
    queryFn: async () => {
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-prompts`);
      if (channel) {
        url.searchParams.append('channel', channel);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }

      return response.json() as Promise<AgentPrompt[]>;
    },
  });

  // Buscar prompt ativo do canal específico
  const activePrompt = prompts?.find((p) => p.is_active && (!channel || p.channel === channel));

  // Criar nova versão
  const createPrompt = useMutation({
    mutationFn: async (params: {
      name: string;
      channel: 'whatsapp' | 'web';
      prompt_text: string;
      config?: { temperature: number; max_tokens: number };
      notes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("agent-prompts", {
        method: "POST",
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-prompts"] });
      toast.success("Nova versão do prompt criada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar prompt: ${error.message}`);
    },
  });

  // Ativar versão específica
  const activatePrompt = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("agent-prompts", {
        method: "PUT",
        body: { id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: AgentPrompt) => {
      queryClient.invalidateQueries({ queryKey: ["agent-prompts"] });
      toast.success(`Versão ${data.version} ativada!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao ativar prompt: ${error.message}`);
    },
  });

  // Atualizar prompt existente
  const updatePrompt = useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      prompt_text?: string;
      config?: { temperature: number; max_tokens: number };
      notes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("agent-prompts", {
        method: "PATCH",
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-prompts"] });
      toast.success("Prompt atualizado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar prompt: ${error.message}`);
    },
  });

  return {
    prompts,
    activePrompt,
    isLoading,
    createPrompt: createPrompt.mutate,
    isCreating: createPrompt.isPending,
    activatePrompt: activatePrompt.mutate,
    isActivating: activatePrompt.isPending,
    updatePrompt: updatePrompt.mutate,
    isUpdating: updatePrompt.isPending,
  };
};
