'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { Paginated, S } from '@/shared/api/types';
import { POLL_INTERVAL_MS } from '@/shared/config/env';

/** Уведомления. */
export const notificationKeys = {
  unread: ['notifications', 'unread'] as const,
  list: ['notifications', 'list'] as const,
};

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: async () => (await api.get<S['CountDto']>('/notifications/unread-count')).data.count,
    refetchInterval: POLL_INTERVAL_MS,
    enabled,
  });
}

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: async () =>
      (await api.get<Paginated<S['NotificationDto']>>('/notifications', { params: { limit: 30 } }))
        .data,
    enabled,
  });
}
