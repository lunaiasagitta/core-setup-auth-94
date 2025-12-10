import { z } from 'zod';

/**
 * Remove todos os caracteres não numéricos do telefone
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Normaliza telefone para formato internacional: 5511999999999
 * Adiciona código do Brasil (55) se necessário
 * Adiciona o 9 se necessário para celulares brasileiros
 */
export function normalizePhone(phone: string, countryCode: string = '55'): string {
  const cleaned = cleanPhone(phone);
  
  // Se já tem 13 dígitos (55 + DDD + número), retorna
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    return ensureNinthDigit(cleaned);
  }
  
  // Se tem 11 dígitos (DDD + número), adiciona código do país
  if (cleaned.length === 11) {
    return ensureNinthDigit(`${countryCode}${cleaned}`);
  }
  
  // Se tem 10 dígitos (DDD + número sem 9), adiciona código do país e 9
  if (cleaned.length === 10) {
    return ensureNinthDigit(`${countryCode}${cleaned}`);
  }
  
  // Se tem 12 dígitos e começa com 5, assume que é 55 + DDD incompleto
  if (cleaned.length === 12 && cleaned.startsWith('5')) {
    return ensureNinthDigit(`5${cleaned}`);
  }
  
  // Retorna o que veio (será validado depois)
  return cleaned;
}

/**
 * Garante que números de celular brasileiros tenham o 9º dígito
 * 5511988887777 -> 5511988887777 (já tem)
 * 551188887777 -> 5511988887777 (adiciona o 9)
 */
export function ensureNinthDigit(phone: string): string {
  // Se não começa com 55 (Brasil), retorna sem modificar
  if (!phone.startsWith('55')) return phone;
  
  // Se tem 13 dígitos, já está correto
  if (phone.length === 13) return phone;
  
  // Se tem 12 dígitos (55 + DDD + 8 dígitos), adiciona o 9
  if (phone.length === 12) {
    const ddd = phone.substring(2, 4);
    const number = phone.substring(4);
    return `55${ddd}9${number}`;
  }
  
  return phone;
}

/**
 * Normaliza telefone para comparação de duplicatas
 * Remove variações do 9º dígito para detectar números iguais
 * 5511988887777 -> 551188887777
 * 551188887777 -> 551188887777
 */
export function normalizePhoneForComparison(phone: string): string {
  const normalized = normalizePhone(phone);
  
  // Se não é brasileiro ou não tem 13 dígitos, retorna normalizado
  if (!normalized.startsWith('55') || normalized.length !== 13) {
    return normalized;
  }
  
  // Remove o 9º dígito se existir (55 + DDD + 9 + 8 dígitos -> 55 + DDD + 8 dígitos)
  const ddd = normalized.substring(2, 4);
  const firstDigit = normalized.charAt(4);
  
  if (firstDigit === '9') {
    // Tem o 9, remove ele
    return `55${ddd}${normalized.substring(5)}`;
  }
  
  // Não tem o 9, já está no formato de comparação
  return normalized;
}

/**
 * Valida se é um telefone brasileiro válido
 */
export function isValidBrazilianPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  
  // Deve ter 13 dígitos (55 + 11 dígitos)
  if (normalized.length !== 13) return false;
  
  // Deve começar com 55
  if (!normalized.startsWith('55')) return false;
  
  // DDD deve estar entre 11 e 99
  const ddd = parseInt(normalized.substring(2, 4));
  if (ddd < 11 || ddd > 99) return false;
  
  // Primeiro dígito do número deve ser 9 (celular)
  const firstDigit = normalized.charAt(4);
  if (firstDigit !== '9') return false;
  
  return true;
}

/**
 * Formata telefone para exibição: (11) 99999-9999
 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  
  if (normalized.length === 13) {
    const ddd = normalized.substring(2, 4);
    const firstPart = normalized.substring(4, 9);
    const secondPart = normalized.substring(9, 13);
    return `(${ddd}) ${firstPart}-${secondPart}`;
  }
  
  return phone;
}

/**
 * Valida e retorna informações sobre o telefone
 */
export function validateAndFormatPhone(phone: string): {
  valid: boolean;
  normalized: string;
  formatted: string;
  error?: string;
} {
  if (!phone || phone.trim() === '') {
    return {
      valid: false,
      normalized: '',
      formatted: '',
      error: 'Telefone não pode ser vazio',
    };
  }

  const normalized = normalizePhone(phone);
  const valid = isValidBrazilianPhone(normalized);

  if (!valid) {
    return {
      valid: false,
      normalized,
      formatted: phone,
      error: 'Telefone inválido. Use o formato: (11) 99999-9999',
    };
  }

  return {
    valid: true,
    normalized,
    formatted: formatPhoneDisplay(normalized),
  };
}

/**
 * Schema Zod para validação de telefone
 */
export const phoneSchema = z
  .string()
  .min(1, 'Telefone é obrigatório')
  .transform((val) => cleanPhone(val))
  .refine(
    (val) => {
      const normalized = normalizePhone(val);
      return isValidBrazilianPhone(normalized);
    },
    {
      message: 'Telefone inválido. Use o formato: (11) 99999-9999',
    }
  )
  .transform((val) => normalizePhone(val));

/**
 * Aplica máscara de telefone brasileiro durante digitação
 */
export function applyPhoneMask(value: string): string {
  const cleaned = cleanPhone(value);
  
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 2) return `(${cleaned}`;
  if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  if (cleaned.length <= 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  
  // Limita a 11 dígitos
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
}
