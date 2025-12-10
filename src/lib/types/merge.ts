import { Tables } from '@/integrations/supabase/types';

export type Lead = Tables<'leads'>;

export type MergePriority = 'newest' | 'most_complete' | 'highest_stage' | 'manual';

export interface MergeRule {
  field: keyof Lead;
  priority: MergePriority;
  keepBoth?: boolean; // Para campos como telefone/email alternativos
}

export interface MergeDecision {
  field: string;
  chosen: 'A' | 'B';
  reason: string;
  valueA?: any;
  valueB?: any;
}

export interface MergedLeadResult {
  merged: Partial<Lead>;
  mergeLog: MergeDecision[];
}

export interface DuplicateMatch {
  lead_id: string;
  match_type: 'phone_exact' | 'email_exact' | 'name_fuzzy' | 'no_match';
  match_score: number;
  lead_data: Lead;
}

export const STAGE_ORDER = [
  'Novo',
  'Apresentação Enviada',
  'Segundo Contato',
  'Reunião Agendada',
  'Proposta Enviada',
  'Fechado',
  'Perdido'
];

export const MERGE_RULES: Record<string, MergeRule> = {
  nome: { field: 'nome', priority: 'most_complete' },
  telefone: { field: 'telefone', priority: 'most_complete', keepBoth: true },
  email: { field: 'email', priority: 'most_complete', keepBoth: true },
  empresa: { field: 'empresa', priority: 'most_complete' },
  necessidade: { field: 'necessidade', priority: 'newest' },
  stage: { field: 'stage', priority: 'highest_stage' },
  score_bant: { field: 'score_bant', priority: 'highest_stage' },
  bant_details: { field: 'bant_details', priority: 'most_complete' },
  proposta_ia: { field: 'proposta_ia', priority: 'newest' },
  os_funil_lead: { field: 'os_funil_lead', priority: 'most_complete' },
  metadata: { field: 'metadata', priority: 'most_complete' }
};
