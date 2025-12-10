import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useKnowledgeBase = () => {
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["knowledge-base-stats"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("knowledge_base")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      // Pegar documentos únicos
      const { data: docs } = await supabase
        .from("knowledge_base")
        .select("title")
        .order("title");

      const uniqueDocs = docs ? [...new Set(docs.map(d => d.title))] : [];

      return {
        totalChunks: count || 0,
        totalDocuments: uniqueDocs.length,
        documents: uniqueDocs,
      };
    },
  });

  const processDocument = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      const { data, error } = await supabase.functions.invoke("knowledge-base-process", {
        body: { title, content },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base-stats"] });
      toast.success(`${data.title}: ${data.chunks} chunks processados!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao processar: ${error.message}`);
    },
  });

  return {
    stats,
    isLoading,
    processDocument: processDocument.mutate,
    isProcessing: processDocument.isPending,
  };
};
