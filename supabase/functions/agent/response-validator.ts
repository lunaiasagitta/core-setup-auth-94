interface ValidationResult {
  valid: boolean;
  error?: string;
  fallbackMessage?: string;
}

export function validateResponse(response: string): ValidationResult {
  // 1. Resposta não vazia
  if (!response || response.trim().length === 0) {
    return {
      valid: false,
      error: 'empty_response',
      fallbackMessage: 'Desculpe, tive um problema técnico. Pode reformular sua pergunta?'
    };
  }
  
  // 2. Tamanho mínimo
  if (response.length < 10) {
    return {
      valid: false,
      error: 'too_short',
      fallbackMessage: 'Hmm, não tenho certeza se entendi bem. Pode me dar mais detalhes?'
    };
  }
  
  // 3. Tamanho máximo (indica problema)
  if (response.length > 1000) {
    return {
      valid: false,
      error: 'too_long',
      fallbackMessage: 'Vou simplificar: posso te ajudar com websites, sistemas ou apps. Qual seu interesse?'
    };
  }
  
  // 4. Não vazar instruções
  const forbiddenPhrases = [
    'system prompt',
    'você é luna',
    'instrução',
    'ferramentas disponíveis',
    'tool_calls',
    'function calling'
  ];
  
  const lowerResponse = response.toLowerCase();
  for (const phrase of forbiddenPhrases) {
    if (lowerResponse.includes(phrase)) {
      return {
        valid: false,
        error: 'leaked_instructions',
        fallbackMessage: 'Desculpe, houve um erro. Vou recomeçar: como posso te ajudar hoje?'
      };
    }
  }
  
  // 5. Idioma português (mais tolerante)
  const portugueseWords = [
    'você', 'está', 'pode', 'como', 'que', 'para', 'com', 
    'são', 'estão', 'tenho', 'dia', 'horário', 'horários',
    'segunda', 'terça', 'quarta', 'quinta', 'sexta',
    'disponível', 'disponíveis', 'reunião', 'agendar'
  ];
  
  // Detectar palavras em inglês claramente problemáticas
  const englishWords = ['hi', 'hello', 'sorry', 'please', 'thank', 'welcome', 'help me'];
  const hasEnglish = englishWords.some(word => lowerResponse.includes(word));
  
  // Se tem inglês e pouquíssimo português, rejeitar
  let portugueseCount = 0;
  for (const word of portugueseWords) {
    if (lowerResponse.includes(word)) portugueseCount++;
  }
  
  if (hasEnglish && portugueseCount === 0) {
    return {
      valid: false,
      error: 'wrong_language',
      fallbackMessage: 'Desculpe, preciso me comunicar em português. Como posso te ajudar?'
    };
  }
  
  // 6. Respostas muito genéricas
  const genericPhrases = [
    'não entendi',
    'desculpe',
    'não posso ajudar',
    'não sei'
  ];
  
  let genericCount = 0;
  for (const phrase of genericPhrases) {
    if (lowerResponse.includes(phrase)) genericCount++;
  }
  
  if (genericCount >= 2) {
    return {
      valid: false,
      error: 'too_generic',
      fallbackMessage: 'Deixa eu ser mais específico: você quer informações sobre websites, sistemas ou outro serviço?'
    };
  }
  
  return { valid: true };
}
