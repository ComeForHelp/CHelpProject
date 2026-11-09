'use client';

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../config/env';
import { useSession } from '../model/session';
import type { S } from './types';

/** Общий axios-клиент: подставляет токен и сам обновляет его при 401. */
export const api = axios.create({ baseURL: API_URL, timeout: 20_000 });

api.interceptors.request.use((config) => {
  const token = useSession.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * refresh-токен одноразовый: если несколько запросов одновременно получат 401
 * и каждый пойдёт обновлять токен, второй получит 401 и разлогинит пользователя.
 * Поэтому все ждут ОДИН общий промис обновления.
 */
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, setSession } = useSession.getState();
  if (!refreshToken) throw new Error('Нет refresh-токена');
  const { data } = await axios.post<S['AuthResponseDto']>(`${API_URL}/auth/refresh`, {
    refreshToken,
  });
  setSession(data);
  return data.accessToken;
}

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as RetryConfig | undefined;
  const isAuthCall = original?.url?.startsWith('/auth/');
  if (error.response?.status !== 401 || !original || original._retry || isAuthCall) {
    throw error;
  }
  original._retry = true;
  try {
    refreshing ??= refreshAccessToken().finally(() => {
      refreshing = null;
    });
    const token = await refreshing;
    original.headers.Authorization = `Bearer ${token}`;
    return api(original);
  } catch {
    useSession.getState().clear();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/login?expired=1&next=${next}`);
    }
    throw error;
  }
});
