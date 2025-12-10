interface DegradedState {
  active: boolean;
  failureCount: number;
  lastFailure: Date;
  activatedAt?: Date;
}

let degradedState: DegradedState = {
  active: false,
  failureCount: 0,
  lastFailure: new Date()
};

export function recordFailure() {
  degradedState.failureCount++;
  degradedState.lastFailure = new Date();
  
  // Ativar modo degradado após 3 falhas em 5 minutos
  if (degradedState.failureCount >= 3) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (degradedState.lastFailure > fiveMinutesAgo) {
      activateDegradedMode();
    }
  }
}

export function recordSuccess() {
  if (degradedState.active) {
    console.log('OpenAI recovered, deactivating degraded mode');
    deactivateDegradedMode();
  }
  degradedState.failureCount = 0;
}

function activateDegradedMode() {
  if (!degradedState.active) {
    console.warn('🚨 ACTIVATING DEGRADED MODE - OpenAI appears down');
    degradedState.active = true;
    degradedState.activatedAt = new Date();
  }
}

function deactivateDegradedMode() {
  degradedState.active = false;
  degradedState.failureCount = 0;
  degradedState.activatedAt = undefined;
}

export function isDegraded(): boolean {
  return degradedState.active;
}

export function getDegradedResponse(message: string): string {
  return `Desculpe, estou com um problema técnico temporário. 🛠️

Por favor, tente:
1. Reformular sua mensagem
2. Enviar novamente em alguns minutos
3. Se urgente, solicitar contato com nossa equipe: digite "falar com humano"

Agradeço a compreensão!`;
}
