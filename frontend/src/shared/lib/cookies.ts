/**
 * Небольшие cookie для middleware.ts: по ним сервер Next.js решает, куда пускать.
 * Это не защита данных — её делает backend, проверяя токен и роль по БД.
 */
export const AUTH_COOKIE = 'chp_auth';
export const ROLE_COOKIE = 'chp_role';

const MAX_AGE = 60 * 60 * 24 * 30; // как у refresh-токена

export function setCookie(name: string, value: string, maxAge = MAX_AGE): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}
