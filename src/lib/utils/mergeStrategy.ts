import { Lead, MergeDecision, MergedLeadResult, MERGE_RULES, STAGE_ORDER } from '@/lib/types/merge';

/**
 * Determina qual valor é mais completo (mais longo/completo)
 */
function isMostComplete(valueA: any, valueB: any): 'A' | 'B' {
  if (!valueA && valueB) return 'B';
  if (valueA && !valueB) return 'A';
  if (!valueA && !valueB) return 'A';
  
  // Para strings
  if (typeof valueA === 'string' && typeof valueB === 'string') {
    return valueA.length >= valueB.length ? 'A' : 'B';
  }
  
  // Para objetos/arrays
  if (typeof valueA === 'object' && typeof valueB === 'object') {
    const keysA = Object.keys(valueA || {}).length;
    const keysB = Object.keys(valueB || {}).length;
    return keysA >= keysB ? 'A' : 'B';
  }
  
  return 'A';
}

/**
 * Determina qual valor é mais recente
 */
function isNewest(leadA: Lead, leadB: Lead): 'A' | 'B' {
  const dateA = new Date(leadA.updated_at || leadA.created_at || 0);
  const dateB = new Date(leadB.updated_at || leadB.created_at || 0);
  return dateA >= dateB ? 'A' : 'B';
}

/**
 * Determina qual stage é mais avançado
 */
function isHighestStage(stageA: string | null, stageB: string | null): 'A' | 'B' {
  if (!stageA && stageB) return 'B';
  if (stageA && !stageB) return 'A';
  if (!stageA && !stageB) return 'A';
  
  const indexA = STAGE_ORDER.indexOf(stageA);
  const indexB = STAGE_ORDER.indexOf(stageB);
  
  // Se stage não está na lista, considera como Novo (index 0)
  const finalIndexA = indexA === -1 ? 0 : indexA;
  const finalIndexB = indexB === -1 ? 0 : indexB;
  
  return finalIndexA >= finalIndexB ? 'A' : 'B';
}

/**
 * Algoritmo principal de merge inteligente
 */
export function decideMergeStrategy(leadA: Lead, leadB: Lead): MergedLeadResult {
  const merged: any = {
    id: leadA.id, // Master lead mantém o ID
  };
  const mergeLog: MergeDecision[] = [];
  
  for (const [fieldKey, rule] of Object.entries(MERGE_RULES)) {
    const field = rule.field as keyof Lead;
    const valueA = leadA[field];
    const valueB = leadB[field];
    
    let chosen: 'A' | 'B' = 'A';
    let reason = '';
    
    // Se ambos vazios, pular
    if (!valueA && !valueB) {
      continue;
    }
    
    // Se apenas um tem valor
    if (!valueA && valueB) {
      chosen = 'B';
      reason = 'B tem valor, A está vazio';
      merged[field] = valueB;
    } else if (valueA && !valueB) {
      chosen = 'A';
      reason = 'A tem valor, B está vazio';
      merged[field] = valueA;
    } else {
      // Ambos têm valor: aplicar regra de priorização
      switch (rule.priority) {
        case 'most_complete':
          chosen = isMostComplete(valueA, valueB);
          reason = `Valor mais completo (${chosen})`;
          merged[field] = chosen === 'A' ? valueA : valueB;
          break;
          
        case 'newest':
          chosen = isNewest(leadA, leadB);
          reason = `Valor mais recente (${chosen})`;
          merged[field] = chosen === 'A' ? valueA : valueB;
          break;
          
        case 'highest_stage':
          if (field === 'stage') {
            chosen = isHighestStage(valueA as string, valueB as string);
            reason = `Stage mais avançado (${chosen})`;
            merged[field] = chosen === 'A' ? valueA : valueB;
          } else if (field === 'score_bant') {
            // Para score_bant, pegar o maior
            chosen = (valueA as number) >= (valueB as number) ? 'A' : 'B';
            reason = `Score BANT mais alto (${chosen})`;
            merged[field] = chosen === 'A' ? valueA : valueB;
          }
          break;
          
        case 'manual':
          // Requer decisão manual - por padrão escolher A
          chosen = 'A';
          reason = 'Requer decisão manual (padrão A)';
          merged[field] = valueA;
          break;
      }
    }
    
    mergeLog.push({
      field: fieldKey,
      chosen,
      reason,
      valueA,
      valueB
    });
    
    // Se keepBoth=true, salvar valor alternativo em metadata
    if (rule.keepBoth && valueA && valueB && valueA !== valueB) {
      const alternativeField = `${fieldKey}_alternativo`;
      merged.metadata = {
        ...(merged.metadata || {}),
        [alternativeField]: chosen === 'A' ? valueB : valueA
      };
    }
  }
  
  // Manter timestamps do lead master (A)
  merged.created_at = leadA.created_at;
  merged.updated_at = new Date().toISOString();
  
  return { merged, mergeLog };
}

/**
 * Calcula score de similaridade entre dois leads
 */
export function calculateSimilarityScore(leadA: Lead, leadB: Lead): number {
  let score = 0;
  
  // Telefone exato: 100 pontos
  if (leadA.telefone && leadB.telefone && leadA.telefone === leadB.telefone) {
    score = 100;
  }
  
  // Email exato: 90 pontos
  if (leadA.email && leadB.email && 
      leadA.email.toLowerCase() === leadB.email.toLowerCase()) {
    score = Math.max(score, 90);
  }
  
  // Nome similar: 60 pontos (simplificado - no banco usa SIMILARITY)
  if (leadA.nome && leadB.nome) {
    const similarity = calculateStringSimilarity(leadA.nome, leadB.nome);
    if (similarity > 0.7) {
      score = Math.max(score, 60);
    }
  }
  
  return score;
}

/**
 * Calcula similaridade entre duas strings (Levenshtein simplificado)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);
  
  if (maxLen === 0) return 1;
  
  let matches = 0;
  for (let i = 0; i < Math.min(len1, len2); i++) {
    if (s1[i] === s2[i]) matches++;
  }
  
  return matches / maxLen;
}
