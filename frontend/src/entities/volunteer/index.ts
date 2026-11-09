'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { Paginated, S, VerificationStatus } from '@/shared/api/types';

/** Волонтёры. */
export const volunteerKeys = {
  list: (p: object) => ['volunteers', 'list', p] as const,
  detail: (id: string) => ['volunteers', 'detail', id] as const,
  history: (page: number) => ['volunteers', 'history', page] as const,
};

export function useVolunteers(params: {
  status?: VerificationStatus;
  districtId?: number;
  q?: string;
  sort?: 'rating' | 'name' | 'createdAt';
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: volunteerKeys.list(params),
    queryFn: async () =>
      (await api.get<Paginated<S['VolunteerListItemDto']>>('/volunteers', { params })).data,
    placeholderData: keepPreviousData,
  });
}

export function useVolunteer(id: string) {
  return useQuery({
    queryKey: volunteerKeys.detail(id),
    queryFn: async () => (await api.get<S['VolunteerDetailDto']>(`/volunteers/${id}`)).data,
  });
}

export function useVolunteerHistory(page = 1) {
  return useQuery({
    queryKey: volunteerKeys.history(page),
    queryFn: async () =>
      (
        await api.get<S['VolunteerHistoryDto']>('/volunteers/me/history', {
          params: { page, limit: 20 },
        })
      ).data,
  });
}
