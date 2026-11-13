import { isAxiosError } from 'axios';
import type { S } from './types';

/**
 * Текст ошибки для пользователя. Backend всегда отвечает ErrorResponseDto
 * с готовым сообщением на русском — показываем его как есть.
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'Что-то пошло не так. Попробуйте ещё раз',
): string {
  if (isAxiosError<S['ErrorResponseDto']>(error)) {
    if (!error.response) return 'Нет связи с сервером. Проверьте интернет и попробуйте снова';
    const message = error.response.data?.message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string' && message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function getErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}
