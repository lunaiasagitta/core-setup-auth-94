import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Activity {
  id: string;
  lead_id: string;
  event_type: string;
  details: any;
  timestamp: string;
}

export const useLeadActivities = (leadId: string) => {
  return useQuery({
    queryKey: ['activities', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('lead_id', leadId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!leadId,
  });
};
