import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizeEmail } from '@/lib/utils/emailValidation';

export interface Lead {
  id: string;
  nome: string | null;
  telefone: string;
  email: string | null;
  empresa: string | null;
  necessidade: string | null;
  stage: string;
  score_bant: number;
  bant_details: any;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadInput {
  nome?: string;
  telefone: string;
  email?: string;
  empresa?: string;
  necessidade?: string;
}

export const useLeads = (filters?: {
  search?: string;
  stages?: string[];
  necessidades?: string[];
  scoreMin?: number;
  scoreMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}) => {
  const queryClient = useQueryClient();

  // Buscar todos os leads
  const { data: leadsData, isLoading, error } = useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      let query = supabase.from('leads').select('*', { count: 'exact' });

      // Filtros
      if (filters?.search) {
        query = query.or(
          `nome.ilike.%${filters.search}%,` +
          `telefone.ilike.%${filters.search}%,` +
          `email.ilike.%${filters.search}%,` +
          `empresa.ilike.%${filters.search}%`
        );
      }

      if (filters?.stages && filters.stages.length > 0) {
        query = query.in('stage', filters.stages);
      }

      if (filters?.necessidades && filters.necessidades.length > 0) {
        query = query.in('necessidade', filters.necessidades);
      }

      if (filters?.scoreMin !== undefined) {
        query = query.gte('score_bant', filters.scoreMin);
      }

      if (filters?.scoreMax !== undefined) {
        query = query.lte('score_bant', filters.scoreMax);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString());
      }

      // Sorting
      const sortBy = filters?.sortBy || 'created_at';
      const sortOrder = filters?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      if (filters?.page !== undefined && filters?.pageSize !== undefined) {
        const from = filters.page * filters.pageSize;
        const to = from + filters.pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { leads: data as Lead[], total: count || 0 };
    },
    refetchInterval: 30000, // Refetch a cada 30s
  });

  const leads = leadsData?.leads;
  const total = leadsData?.total || 0;

  // Criar novo lead
  const createLead = useMutation({
    mutationFn: async (input: CreateLeadInput) => {
      // Normalizar e-mail se presente
      const normalizedInput = {
        ...input,
        email: input.email ? normalizeEmail(input.email) : undefined,
      };
      
      // Verificar duplicado por e-mail (case-insensitive)
      if (normalizedInput.email) {
        const { data: existing } = await supabase
          .from('leads')
          .select('id, nome')
          .ilike('email', normalizedInput.email)
          .maybeSingle();
        
        if (existing) {
          throw new Error(`Lead com e-mail ${normalizedInput.email} já existe (${existing.nome})`);
        }
      }
      
      const { data, error } = await supabase
        .from('leads')
        .insert([normalizedInput])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar lead:', error);
      toast.error(error.message || 'Erro ao criar lead');
    },
  });

  // Atualizar lead
  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      // Normalizar e-mail se presente
      const normalizedUpdates = {
        ...updates,
        email: updates.email ? normalizeEmail(updates.email) : updates.email,
      };
      
      const { data, error } = await supabase
        .from('leads')
        .update(normalizedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar lead:', error);
      toast.error(error.message || 'Erro ao atualizar lead');
    },
  });

  // Deletar lead
  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deletado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao deletar lead:', error);
      toast.error(error.message || 'Erro ao deletar lead');
    },
  });

  // Deletar múltiplos leads
  const bulkDeleteLeads = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Leads deletados com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao deletar leads:', error);
      toast.error(error.message || 'Erro ao deletar leads');
    },
  });

  // Atualizar stage em massa
  const bulkUpdateStage = useMutation({
    mutationFn: async ({ ids, stage }: { ids: string[]; stage: string }) => {
      const { error } = await supabase
        .from('leads')
        .update({ stage })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Leads atualizados com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar leads:', error);
      toast.error(error.message || 'Erro ao atualizar leads');
    },
  });

  return {
    leads,
    total,
    isLoading,
    error,
    createLead,
    updateLead,
    deleteLead,
    bulkDeleteLeads,
    bulkUpdateStage,
  };
};

// Hook para buscar um lead específico
export const useLead = (id: string) => {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Lead;
    },
    enabled: !!id,
  });
};

// Hook standalone para atualizar lead
export const useUpdateLead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
    },
  });
};

// Hooks standalone para operações
export const useDeleteLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deletado!');
    },
  });
};

export const useBulkDeleteLeads = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('leads').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Leads deletados!');
    },
  });
};

export const useBulkUpdateStage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, stage }: { ids: string[]; stage: string }) => {
      const { error } = await supabase.from('leads').update({ stage }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Leads atualizados!');
    },
  });
};
