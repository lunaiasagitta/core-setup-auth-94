// Análise de contexto conversacional para detectar tópicos e preferências

export interface ConversationPreferences {
  communication_style: 'formal' | 'casual';
  detail_level: 'high' | 'medium' | 'low';
  decision_speed: 'fast' | 'moderate' | 'slow';
}

export interface TopicDetection {
  current_topic: string;
  confidence: number;
}

/**
 * Detecta o tópico atual da conversa baseado na mensagem do usuário
 */
export function detectCurrentTopic(message: string): TopicDetection {
  const msg = message.toLowerCase();
  
  // Tópicos e suas palavras-chave
  const topics = {
    pricing: ['preço', 'custa', 'custo', 'valor', 'investimento', 'pagar', 'orçamento', 'quanto'],
    features: ['funcionalidade', 'recurso', 'faz', 'consegue', 'pode', 'tem', 'oferece', 'inclui'],
    timeline: ['prazo', 'tempo', 'quanto tempo', 'quando', 'demora', 'pronto', 'entrega'],
    process: ['como funciona', 'processo', 'etapa', 'passo', 'metodologia', 'começa'],
    technical: ['tecnologia', 'integração', 'sistema', 'plataforma', 'técnico', 'desenvolvido'],
    scheduling: ['agendar', 'marcar', 'reunião', 'call', 'conversar', 'horário', 'disponibilidade'],
    objection: ['caro', 'muito', 'não tenho', 'problema', 'dúvida', 'preocupado', 'mas'],
    interest: ['quero', 'preciso', 'interessado', 'vamos', 'fazer', 'contratar', 'começar'],
  };
  
  let maxScore = 0;
  let detectedTopic = 'general';
  
  for (const [topic, keywords] of Object.entries(topics)) {
    const score = keywords.reduce((sum, keyword) => {
      return sum + (msg.includes(keyword) ? 1 : 0);
    }, 0);
    
    if (score > maxScore) {
      maxScore = score;
      detectedTopic = topic;
    }
  }
  
  const confidence = Math.min(maxScore / 2, 1); // Normalize to 0-1
  
  return {
    current_topic: detectedTopic,
    confidence,
  };
}

/**
 * Analisa preferências de comunicação baseado no histórico de mensagens
 */
export function analyzePreferences(messages: Array<{ role: string; content: string }>): ConversationPreferences {
  const userMessages = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase());
  
  if (userMessages.length === 0) {
    return {
      communication_style: 'casual',
      detail_level: 'medium',
      decision_speed: 'moderate',
    };
  }
  
  // Detectar estilo de comunicação
  const formalIndicators = ['senhor', 'senhora', 'prezado', 'gostaria', 'poderia', 'agradeço'];
  const casualIndicators = ['oi', 'olá', 'blz', 'top', 'legal', 'show', 'massa'];
  
  let formalScore = 0;
  let casualScore = 0;
  
  userMessages.forEach(msg => {
    formalScore += formalIndicators.filter(word => msg.includes(word)).length;
    casualScore += casualIndicators.filter(word => msg.includes(word)).length;
  });
  
  const communication_style = formalScore > casualScore ? 'formal' : 'casual';
  
  // Detectar nível de detalhe
  const avgMessageLength = userMessages.reduce((sum, msg) => sum + msg.length, 0) / userMessages.length;
  const detail_level = avgMessageLength > 100 ? 'high' : avgMessageLength > 40 ? 'medium' : 'low';
  
  // Detectar velocidade de decisão
  const fastDecisionIndicators = ['agora', 'hoje', 'urgente', 'rápido', 'logo', 'já'];
  const slowDecisionIndicators = ['avaliar', 'analisar', 'pensar', 'depois', 'talvez', 'não sei'];
  
  let fastScore = 0;
  let slowScore = 0;
  
  userMessages.forEach(msg => {
    fastScore += fastDecisionIndicators.filter(word => msg.includes(word)).length;
    slowScore += slowDecisionIndicators.filter(word => msg.includes(word)).length;
  });
  
  const decision_speed = fastScore > slowScore ? 'fast' : slowScore > fastScore ? 'slow' : 'moderate';
  
  return {
    communication_style,
    detail_level,
    decision_speed,
  };
}

/**
 * Gera guidance para o prompt baseado nas preferências detectadas
 */
export function getPreferencesGuidance(preferences: ConversationPreferences): string {
  let guidance = '\n\n=== PREFERÊNCIAS DO LEAD ===\n';
  
  if (preferences.communication_style === 'formal') {
    guidance += '- Estilo de comunicação: FORMAL (use "senhor/senhora", seja mais profissional)\n';
  } else {
    guidance += '- Estilo de comunicação: CASUAL (seja amigável e descontraído, use "você")\n';
  }
  
  if (preferences.detail_level === 'high') {
    guidance += '- Nível de detalhe: ALTO (forneça explicações detalhadas, use exemplos)\n';
  } else if (preferences.detail_level === 'low') {
    guidance += '- Nível de detalhe: BAIXO (seja direto e objetivo, respostas curtas)\n';
  } else {
    guidance += '- Nível de detalhe: MÉDIO (equilibre informação e concisão)\n';
  }
  
  if (preferences.decision_speed === 'fast') {
    guidance += '- Velocidade de decisão: RÁPIDA (seja eficiente, vá direto ao ponto, proponha próximos passos)\n';
  } else if (preferences.decision_speed === 'slow') {
    guidance += '- Velocidade de decisão: LENTA (seja paciente, explique bem, não pressione)\n';
  } else {
    guidance += '- Velocidade de decisão: MODERADA (equilibre informação e ação)\n';
  }
  
  return guidance;
}

/**
 * Gera guidance sobre o tópico atual para o prompt
 */
export function getTopicGuidance(topic: string, bantProgress: any): string {
  let guidance = `\n\n=== CONTEXTO DO TÓPICO ATUAL ===\nTópico detectado: ${topic}\n`;
  
  const topicAdvice: Record<string, string> = {
    pricing: 'O lead está perguntando sobre preços. Se necessidade já foi identificada, forneça valores. Se não, qualifique primeiro.',
    features: 'O lead quer saber sobre funcionalidades. Seja específico e mencione benefícios práticos.',
    timeline: 'O lead pergunta sobre prazos. Seja realista e explique as etapas.',
    process: 'O lead quer entender o processo. Explique de forma clara e simples.',
    technical: 'O lead tem dúvidas técnicas. Use termos técnicos apropriados mas explique quando necessário.',
    scheduling: 'O lead está pronto para agendar! Busque slots disponíveis e proponha horários específicos.',
    objection: 'O lead tem uma objeção. Use a técnica SPIN para entender e resolver.',
    interest: 'O lead demonstrou interesse direto! Acelere para o próximo passo (enviar apresentação ou agendar).',
  };
  
  guidance += topicAdvice[topic] || 'Continue a conversa naturalmente.';
  
  // Adicionar informação sobre progresso BANT
  if (bantProgress) {
    guidance += '\n\n=== PROGRESSO DE QUALIFICAÇÃO (BANT) ===\n';
    guidance += `- Budget: ${bantProgress.budget}\n`;
    guidance += `- Authority: ${bantProgress.authority}\n`;
    guidance += `- Need: ${bantProgress.need}\n`;
    guidance += `- Timeline: ${bantProgress.timeline}\n`;
    
    // Sugestões baseadas no progresso
    const notAsked = Object.entries(bantProgress)
      .filter(([_, value]) => value === 'not_asked')
      .map(([key, _]) => key);
    
    if (notAsked.length > 0 && topic !== 'scheduling') {
      guidance += `\nAINDA NÃO PERGUNTADO: ${notAsked.join(', ')}. Encontre oportunidade natural para perguntar se relevante.\n`;
    }
  }
  
  return guidance;
}
