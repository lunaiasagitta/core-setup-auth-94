import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AgentResource {
  id: string;
  tipo: string;
  nome: string;
  link: string;
  preco?: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const useAgentResources = () => {
  const queryClient = useQueryClient();

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["agent-resources"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("agent-resources", {
        method: "GET",
      });

      if (error) throw error;
      return data as AgentResource[];
    },
  });

  const createResource = useMutation({
    mutationFn: async (resource: Omit<AgentResource, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.functions.invoke("agent-resources", {
        method: "POST",
        body: resource,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-resources"] });
      toast.success("Recurso adicionado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar: ${error.message}`);
    },
  });

  const updateResource = useMutation({
    mutationFn: async (resource: AgentResource) => {
      const { data, error } = await supabase.functions.invoke("agent-resources", {
        method: "PUT",
        body: resource,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-resources"] });
      toast.success("Recurso atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteResource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke(`agent-resources?id=${id}`, {
        method: "DELETE",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-resources"] });
      toast.success("Recurso removido com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  return {
    resources,
    isLoading,
    createResource: createResource.mutate,
    updateResource: updateResource.mutate,
    deleteResource: deleteResource.mutate,
    isCreating: createResource.isPending,
    isUpdating: updateResource.isPending,
    isDeleting: deleteResource.isPending,
  };
};
