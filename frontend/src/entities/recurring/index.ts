'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { S } from '@/shared/api/types';

/** Регулярные поручения. */
export const recurringKeys = {
  list: (recipientId?: string) => ['recurring', 'list', recipientId ?? 'me'] as const,
  detail: (id: string) => ['recurring', 'detail', id] as const,
};

export function useRecurringRules(recipientId?: string) {
  return useQuery({
    queryKey: recurringKeys.list(recipientId),
    queryFn: async () =>
      (
        await api.get<S['RecurringRuleDto'][]>('/recurring-rules', {
          params: recipientId ? { recipientId } : {},
        })
      ).data,
  });
}

export function useRecurringRule(id: string | undefined) {
  return useQuery({
    queryKey: recurringKeys.detail(id ?? ''),
    queryFn: async () => (await api.get<S['RecurringRuleDto']>(`/recurring-rules/${id}`)).data,
    enabled: !!id,
  });
}
