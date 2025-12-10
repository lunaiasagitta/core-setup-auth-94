import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLeadAnalytics = (startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['analytics', startDate, endDate],
    queryFn: async () => {
      let query = supabase.from('leads').select('*');

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      // Calcular métricas
      const total = leads.length;
      const qualificados = leads.filter(l => l.score_bant >= 70).length;
      const comReuniao = leads.filter(l => l.stage === 'Reunião Agendada' || l.stage === 'Proposta Enviada' || l.stage === 'Fechado').length;
      const fechados = leads.filter(l => l.stage === 'Fechado').length;

      // Contar por stage
      const byStage = leads.reduce((acc, lead) => {
        acc[lead.stage] = (acc[lead.stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Contar por necessidade
      const byNeed = leads.reduce((acc, lead) => {
        if (lead.necessidade) {
          acc[lead.necessidade] = (acc[lead.necessidade] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Score distribution
      const scoreRanges = {
        '0-30': 0,
        '31-50': 0,
        '51-70': 0,
        '71-85': 0,
        '86-100': 0,
      };

      leads.forEach(lead => {
        const score = lead.score_bant;
        if (score <= 30) scoreRanges['0-30']++;
        else if (score <= 50) scoreRanges['31-50']++;
        else if (score <= 70) scoreRanges['51-70']++;
        else if (score <= 85) scoreRanges['71-85']++;
        else scoreRanges['86-100']++;
      });

      return {
        total,
        qualificados,
        comReuniao,
        fechados,
        taxaQualificacao: total > 0 ? (qualificados / total) * 100 : 0,
        taxaAgendamento: total > 0 ? (comReuniao / total) * 100 : 0,
        taxaConversao: total > 0 ? (fechados / total) * 100 : 0,
        byStage,
        byNeed,
        scoreRanges,
        leads,
      };
    },
  });
};
