'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { Paginated, S } from '@/shared/api/types';

/** Получатели. */
export const recipientKeys = {
  list: (q: string, page: number) => ['recipients', 'list', q, page] as const,
  detail: (id: string) => ['recipients', 'detail', id] as const,
  me: ['recipients', 'me'] as const,
};

export function useRecipients(q: string, page = 1) {
  return useQuery({
    queryKey: recipientKeys.list(q, page),
    queryFn: async () =>
      (
        await api.get<Paginated<S['RecipientListItemDto']>>('/recipients', {
          params: { q: q || undefined, page, limit: 25 },
        })
      ).data,
    placeholderData: keepPreviousData,
  });
}

export function useRecipient(id: string | undefined) {
  return useQuery({
    queryKey: recipientKeys.detail(id ?? ''),
    queryFn: async () => (await api.get<S['RecipientDetailDto']>(`/recipients/${id}`)).data,
    enabled: !!id,
  });
}

export function useRecipientMe() {
  return useQuery({
    queryKey: recipientKeys.me,
    queryFn: async () => (await api.get<S['RecipientDetailDto']>('/recipients/me')).data,
  });
}
