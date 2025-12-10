interface Intent {
  name: string;
  confidence: number;
  keywords?: string[];
}

const INTENT_PATTERNS: Record<string, { keywords: string[]; phrases: string[] }> = {
  pergunta_preco: {
    keywords: ['quanto', 'preço', 'valor', 'custo', 'custa', 'investimento'],
    phrases: ['quanto custa', 'qual o valor', 'quanto fica']
  },
  pergunta_prazo: {
    keywords: ['prazo', 'tempo', 'quando', 'demora', 'dias'],
    phrases: ['quanto tempo', 'qual o prazo', 'quando fica pronto']
  },
  quero_agendar: {
    keywords: ['agendar', 'reunião', 'conversar', 'call', 'ligar'],
    phrases: ['quero agendar', 'marcar reunião', 'podemos conversar']
  },
  falar_humano: {
    keywords: ['humano', 'pessoa', 'atendente', 'alguém', 'real'],
    phrases: ['falar com humano', 'pessoa real', 'alguém de verdade']
  },
  objecao_preco: {
    keywords: ['caro', 'muito', 'alto', 'não tenho'],
    phrases: ['muito caro', 'não tenho grana', 'valor alto']
  },
  interesse_direto: {
    keywords: ['quero', 'preciso', 'vamos', 'sim', 'topo'],
    phrases: ['vamos fazer', 'quero sim', 'preciso disso']
  },
  pergunta_como_funciona: {
    keywords: ['como', 'funciona', 'processo', 'etapas'],
    phrases: ['como funciona', 'qual o processo', 'como vocês fazem']
  }
};

export function classifyIntent(message: string): Intent {
  const normalized = message.toLowerCase().trim();
  
  let bestMatch: Intent = { name: 'unknown', confidence: 0 };
  
  for (const [intentName, pattern] of Object.entries(INTENT_PATTERNS)) {
    let score = 0;
    let matches = 0;
    
    // Check exact phrases (high weight)
    if (pattern.phrases) {
      for (const phrase of pattern.phrases) {
        if (normalized.includes(phrase)) {
          score += 0.4;
          matches++;
        }
      }
    }
    
    // Check keywords (medium weight)
    if (pattern.keywords) {
      for (const keyword of pattern.keywords) {
        if (normalized.includes(keyword)) {
          score += 0.15;
          matches++;
        }
      }
    }
    
    const confidence = Math.min(score, 1.0);
    
    if (confidence > bestMatch.confidence && matches > 0) {
      bestMatch = {
        name: intentName,
        confidence,
        keywords: pattern.keywords
      };
    }
  }
  
  return bestMatch;
}
