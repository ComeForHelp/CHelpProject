import { BadRequestException } from '@nestjs/common';

/**
 * Приводит российский номер к виду +7XXXXXXXXXX.
 * Принимает «8 (914) 123-45-67», «+7 914 1234567», «9141234567».
 */
export function normalizePhone(input: string): string {
  const digits = (input ?? '').replace(/\D/g, '');
  let ten: string | null = null;
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    ten = digits.slice(1);
  } else if (digits.length === 10) {
    ten = digits;
  }
  if (!ten) throw new BadRequestException('Неверный номер телефона');
  return `+7${ten}`;
}
