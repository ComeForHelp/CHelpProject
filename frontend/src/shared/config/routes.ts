import type { Role } from '../api/types';

/** Куда отправить пользователя после входа. */
export const ROLE_HOME: Record<Role, string> = {
  RECIPIENT: '/my',
  RELATIVE: '/family',
  VOLUNTEER: '/volunteer',
  COORDINATOR: '/coord',
  ADMIN: '/coord',
};

/** Раздел сайта → кому он доступен. */
const SECTIONS: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: '/my', roles: ['RECIPIENT'] },
  { prefix: '/family', roles: ['RELATIVE'] },
  { prefix: '/volunteer', roles: ['VOLUNTEER'] },
  { prefix: '/coord', roles: ['COORDINATOR', 'ADMIN'] },
];

const AUTH_PAGES = ['/login', '/register'];

function inSection(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isRole(value: string | undefined): value is Role {
  return !!value && value in ROLE_HOME;
}

/**
 * Логика middleware.ts отдельной функцией — чтобы её можно было протестировать.
 * Возвращает путь для перенаправления или null, если можно пускать.
 *  - нет входа и раздел закрытый → /login?next=…
 *  - чужая роль → в свой кабинет
 *  - уже вошёл и открыл /login или /register → в свой кабинет
 */
export function resolveRedirect(
  pathname: string,
  session: { authed: boolean; role?: string },
  search = '',
): string | null {
  const section = SECTIONS.find((s) => inSection(pathname, s.prefix));
  const role = session.authed && isRole(session.role) ? session.role : null;

  if (AUTH_PAGES.some((p) => inSection(pathname, p))) {
    return role ? ROLE_HOME[role] : null;
  }
  if (!section) return null;
  if (!role) return `/login?next=${encodeURIComponent(pathname + search)}`;
  if (!section.roles.includes(role)) return ROLE_HOME[role];
  return null;
}
