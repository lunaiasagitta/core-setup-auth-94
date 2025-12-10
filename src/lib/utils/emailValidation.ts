import { z } from 'zod';

/**
 * Normaliza e-mail: lowercase + trim
 * Exemplo: " Correaelias13@Gmail.COM " → "correaelias13@gmail.com"
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Valida formato de e-mail
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida e retorna informações sobre o e-mail
 * (Similar a validateAndFormatPhone)
 */
export function validateAndFormatEmail(email: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (!email || email.trim() === '') {
    return {
      valid: false,
      normalized: '',
      error: 'E-mail não pode ser vazio',
    };
  }

  const normalized = normalizeEmail(email);
  const valid = isValidEmail(normalized);

  if (!valid) {
    return {
      valid: false,
      normalized,
      error: 'E-mail inválido',
    };
  }

  return {
    valid: true,
    normalized,
  };
}

/**
 * Schema Zod para validação de e-mail
 * (Similar a phoneSchema)
 */
export const emailSchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .transform((val) => val ? normalizeEmail(val) : undefined)
  .refine(
    (val) => !val || isValidEmail(val),
    { message: 'E-mail inválido' }
  );
