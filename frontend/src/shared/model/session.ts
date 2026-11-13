'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { S } from '../api/types';
import { AUTH_COOKIE, ROLE_COOKIE, deleteCookie, setCookie } from '../lib/cookies';

export type SessionUser = S['AuthUserDto'];

interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  /** После входа, регистрации и обновления токена. */
  setSession: (res: S['AuthResponseDto']) => void;
  clear: () => void;
}

/**
 * Сессия пользователя. Хранится в localStorage, чтобы не выходить при перезагрузке.
 * Роль дублируется в cookie — её читает middleware.ts.
 */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (res) => {
        setCookie(AUTH_COOKIE, '1');
        setCookie(ROLE_COOKIE, res.user.role);
        set({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user });
      },
      clear: () => {
        deleteCookie(AUTH_COOKIE);
        deleteCookie(ROLE_COOKIE);
        set({ accessToken: null, refreshToken: null, user: null });
      },
    }),
    { name: 'chp-session', storage: createJSONStorage(() => localStorage) },
  ),
);
