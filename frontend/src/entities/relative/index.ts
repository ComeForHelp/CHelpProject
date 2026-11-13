'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { S } from '@/shared/api/types';
import { POLL_INTERVAL_MS } from '@/shared/config/env';

/** Родственники. */
export const relativeKeys = { links: ['relatives', 'links'] as const };

/** Родственнику — подопечные (WardLinkDto), получателю — родственники (RelativeOfRecipientDto). */
export function useWardLinks() {
  return useQuery({
    queryKey: relativeKeys.links,
    queryFn: async () => (await api.get<S['WardLinkDto'][]>('/relatives/links')).data,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useMyRelatives() {
  return useQuery({
    queryKey: relativeKeys.links,
    queryFn: async () => (await api.get<S['RelativeOfRecipientDto'][]>('/relatives/links')).data,
  });
}
