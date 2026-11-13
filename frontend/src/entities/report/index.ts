'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { S } from '@/shared/api/types';
import { POLL_INTERVAL_MS } from '@/shared/config/env';

/** Координатор. */
export function useDashboard() {
  return useQuery({
    queryKey: ['coordinator', 'dashboard'],
    queryFn: async () => (await api.get<S['DashboardDto']>('/coordinator/dashboard')).data,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useReport(from: string, to: string) {
  return useQuery({
    queryKey: ['coordinator', 'reports', from, to],
    queryFn: async () =>
      (await api.get<S['ReportDto']>('/coordinator/reports', { params: { from, to } })).data,
    placeholderData: keepPreviousData,
  });
}
