// ============= MERGE UTILITIES =============
// Replicação da lógica de merge do frontend para o backend

export interface Lead {
  id: string;
  nome: string | null;
  telefone: string;
  email: string | null;
  empresa: string | null;
  necessidade: string | null;
  stage: string | null;
  score_bant: number | null;
  bant_details: any;
  proposta_ia: string | null;
  os_funil_lead: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface MergeDecision {
  field: string;
  chosen: 'A' | 'B';
  reason: string;
  valueA?: any;
  valueB?: any;
}

const STAGE_ORDER = [
  'Novo',
  'Apresentação Enviada',
  'Segundo Contato',
  'Reunião Agendada',
  'Proposta Enviada',
  'Fechado',
  'Perdido'
];

function isMostComplete(valueA: any, valueB: any): boolean {
  if (!valueA && !valueB) return false;
  if (!valueA) return false;
  if (!valueB) return true;
  
  if (typeof valueA === 'string' && typeof valueB === 'string') {
    return valueA.length >= valueB.length;
  }
  
  if (typeof valueA === 'object' && typeof valueB === 'object') {
    return Object.keys(valueA).length >= Object.keys(valueB).length;
  }
  
  return true;
}

function isNewest(leadA: Lead, leadB: Lead): boolean {
  const dateA = new Date(leadA.updated_at || leadA.created_at);
  const dateB = new Date(leadB.updated_at || leadB.created_at);
  return dateA >= dateB;
}

function isHighestStage(stageA: string | null, stageB: string | null): boolean {
  if (!stageA && !stageB) return false;
  if (!stageA) return false;
  if (!stageB) return true;
  
  const indexA = STAGE_ORDER.indexOf(stageA);
  const indexB = STAGE_ORDER.indexOf(stageB);
  
  if (indexA === -1 && indexB === -1) return true;
  if (indexA === -1) return false;
  if (indexB === -1) return true;
  
  return indexA >= indexB;
}

export function decideMergeStrategy(leadA: Lead, leadB: Lead): {
  merged: Partial<Lead>;
  mergeLog: MergeDecision[];
} {
  const merged: any = { id: leadA.id };
  const mergeLog: MergeDecision[] = [];

  const fields = [
    { key: 'nome', priority: 'most_complete' },
    { key: 'telefone', priority: 'most_complete', keepBoth: true },
    { key: 'email', priority: 'most_complete', keepBoth: true },
    { key: 'empresa', priority: 'most_complete' },
    { key: 'necessidade', priority: 'newest' },
    { key: 'stage', priority: 'highest_stage' },
    { key: 'score_bant', priority: 'highest_stage' },
    { key: 'bant_details', priority: 'most_complete' },
    { key: 'proposta_ia', priority: 'newest' },
    { key: 'os_funil_lead', priority: 'most_complete' },
    { key: 'metadata', priority: 'most_complete' }
  ];

  for (const field of fields) {
    const valueA = (leadA as any)[field.key];
    const valueB = (leadB as any)[field.key];

    if (!valueA && !valueB) {
      merged[field.key] = null;
      continue;
    }

    if (!valueA) {
      merged[field.key] = valueB;
      mergeLog.push({
        field: field.key,
        chosen: 'B',
        reason: 'A estava vazio',
        valueA,
        valueB
      });
      continue;
    }

    if (!valueB) {
      merged[field.key] = valueA;
      mergeLog.push({
        field: field.key,
        chosen: 'A',
        reason: 'B estava vazio',
        valueA,
        valueB
      });
      continue;
    }

    let chosen: 'A' | 'B' = 'A';
    let reason = '';

    if (field.priority === 'most_complete') {
      chosen = isMostComplete(valueA, valueB) ? 'A' : 'B';
      reason = 'Valor mais completo';
    } else if (field.priority === 'newest') {
      chosen = isNewest(leadA, leadB) ? 'A' : 'B';
      reason = 'Valor mais recente';
    } else if (field.priority === 'highest_stage') {
      if (field.key === 'stage') {
        chosen = isHighestStage(valueA, valueB) ? 'A' : 'B';
        reason = 'Stage mais avançado';
      } else {
        chosen = isHighestStage(leadA.stage, leadB.stage) ? 'A' : 'B';
        reason = 'Do lead com stage mais avançado';
      }
    }

    merged[field.key] = chosen === 'A' ? valueA : valueB;
    mergeLog.push({
      field: field.key,
      chosen,
      reason,
      valueA,
      valueB
    });

    // Guardar valores alternativos em metadata para telefone/email
    if (field.keepBoth && valueA !== valueB) {
      if (!merged.metadata) merged.metadata = {};
      const altKey = `${field.key}_alternativo`;
      merged.metadata[altKey] = chosen === 'A' ? valueB : valueA;
    }
  }

  return { merged, mergeLog };
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    return cleaned;
  }
  
  if (cleaned.length === 11) {
    return `55${cleaned}`;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('5')) {
    return `5${cleaned}`;
  }
  
  return cleaned;
}
