interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  indicators: string[];
}

export function analyzeSentiment(message: string): SentimentResult {
  const normalized = message.toLowerCase();
  
  const positiveWords = ['ótimo', 'perfeito', 'adorei', 'legal', 'bom', 'gostei', 'massa', 'show', 'top', 'excelente', 'maravilha'];
  const negativeWords = ['caro', 'ruim', 'problema', 'não', 'nunca', 'péssimo', 'horrível', 'difícil', 'complicado', 'confuso'];
  const frustrationWords = ['não entendo', 'não consigo', 'complicado demais', 'tá difícil', 'confuso'];
  const enthusiasmWords = ['vamos', 'quero sim', 'adorei', 'demais', 'maravilha'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  const indicators: string[] = [];
  
  // Contar palavras positivas
  for (const word of positiveWords) {
    if (normalized.includes(word)) {
      positiveCount++;
      indicators.push(`positive:${word}`);
    }
  }
  
  // Contar palavras negativas
  for (const word of negativeWords) {
    if (normalized.includes(word)) {
      negativeCount++;
      indicators.push(`negative:${word}`);
    }
  }
  
  // Detectar padrões específicos
  if (frustrationWords.some(phrase => normalized.includes(phrase))) {
    negativeCount += 2;
    indicators.push('frustration_detected');
  }
  
  if (enthusiasmWords.some(phrase => normalized.includes(phrase))) {
    positiveCount += 2;
    indicators.push('enthusiasm_detected');
  }
  
  // Calcular sentimento
  const total = positiveCount + negativeCount;
  if (total === 0) {
    return { sentiment: 'neutral', score: 0.5, indicators };
  }
  
  const score = positiveCount / total;
  let sentiment: 'positive' | 'neutral' | 'negative';
  
  if (score > 0.6) sentiment = 'positive';
  else if (score < 0.4) sentiment = 'negative';
  else sentiment = 'neutral';
  
  return { sentiment, score, indicators };
}

export function getSentimentGuidance(sentiment: SentimentResult): string {
  if (sentiment.sentiment === 'negative') {
    return `\n\nALERTA: Lead demonstrando sentimento NEGATIVO (score: ${sentiment.score.toFixed(2)}).
Indicadores: ${sentiment.indicators.join(', ')}

AJUSTE SUA ABORDAGEM:
- Seja mais empático e compreensivo
- Simplifique explicações
- Ofereça resolver dúvidas via call
- Considere handoff se frustração persistir`;
  }
  
  if (sentiment.sentiment === 'positive') {
    return `\n\nOTIMO: Lead demonstrando sentimento POSITIVO (score: ${sentiment.score.toFixed(2)}).
Indicadores: ${sentiment.indicators.join(', ')}

APROVEITE O MOMENTO:
- Corresponda o entusiasmo (moderadamente)
- Acelere para agendamento
- Seja mais direto e proativo`;
  }
  
  return '';
}
