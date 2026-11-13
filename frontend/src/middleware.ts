import { type NextRequest, NextResponse } from 'next/server';
import { resolveRedirect } from '@/shared/config/routes';
import { AUTH_COOKIE, ROLE_COOKIE } from '@/shared/lib/cookies';

/**
 * Нет входа → /login; чужая роль → свой кабинет; вошёл и открыл /login → свой кабинет.
 * Это удобство, а не защита: данные защищает backend (токен + роль из БД).
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const redirect = resolveRedirect(
    pathname,
    {
      authed: request.cookies.get(AUTH_COOKIE)?.value === '1',
      role: request.cookies.get(ROLE_COOKIE)?.value,
    },
    search,
  );
  if (!redirect) return NextResponse.next();
  return NextResponse.redirect(new URL(redirect, request.url));
}

export const config = {
  matcher: [
    '/my/:path*',
    '/family/:path*',
    '/volunteer/:path*',
    '/coord/:path*',
    '/login',
    '/register',
  ],
};
