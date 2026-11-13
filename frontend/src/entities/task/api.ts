'use client';

import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { Paginated, S, TaskStatus, Urgency } from '@/shared/api/types';
import { POLL_INTERVAL_MS } from '@/shared/config/env';

export type TaskDetail = S['TaskDetailDto'];
export type TaskCardData = S['TaskCardDto'];
export type CatalogCard = S['CatalogCardDto'];

export interface MyTasksParams {
  scope: 'active' | 'history' | 'all';
  recipientId?: string;
  page?: number;
  limit?: number;
}

export interface CatalogFilters {
  districtIds?: number[];
  allDistricts?: boolean;
  categoryId?: number;
  date?: 'today' | 'tomorrow' | 'week';
  urgency?: Urgency;
  needsMoney?: boolean;
}

export interface StaffTaskFilters {
  status?: TaskStatus[];
  districtId?: number;
  categoryId?: number;
  urgency?: Urgency;
  recipientId?: string;
  volunteerId?: string;
  unassigned?: boolean;
  overdue?: boolean;
  from?: string;
  to?: string;
  q?: string;
  sort?: 'windowStart' | 'createdAt';
  page?: number;
  limit?: number;
}

export const taskKeys = {
  all: ['tasks'] as const,
  my: (p: MyTasksParams) => ['tasks', 'my', p] as const,
  catalog: (f: CatalogFilters) => ['tasks', 'catalog', f] as const,
  staff: (f: StaffTaskFilters) => ['tasks', 'staff', f] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
  history: (id: string) => ['tasks', 'history', id] as const,
  comments: (id: string) => ['tasks', 'comments', id] as const,
  attachments: (id: string) => ['tasks', 'attachments', id] as const,
};

/** Массивы в query-строку через запятую — так их понимает backend. */
function toParams(obj: object): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    out[k] = Array.isArray(v) ? v.join(',') : String(v);
  }
  return out;
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => (await api.get<TaskDetail>(`/tasks/${id}`)).data,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useMyTasks(params: MyTasksParams) {
  return useQuery({
    queryKey: taskKeys.my(params),
    queryFn: async () =>
      (
        await api.get<Paginated<TaskCardData>>('/tasks/my', {
          params: toParams({ limit: 50, ...params }),
        })
      ).data,
    refetchInterval: params.scope === 'active' ? POLL_INTERVAL_MS : false,
    placeholderData: keepPreviousData,
  });
}

/** Каталог с подгрузкой «Показать ещё»; обновляется сам раз в 30 с. */
export function useCatalog(filters: CatalogFilters) {
  return useInfiniteQuery({
    queryKey: taskKeys.catalog(filters),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      (
        await api.get<S['CatalogPageDto']>('/tasks/catalog', {
          params: toParams({ ...filters, page: pageParam, limit: 20 }),
        })
      ).data,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useStaffTasks(filters: StaffTaskFilters) {
  return useQuery({
    queryKey: taskKeys.staff(filters),
    queryFn: async () =>
      (
        await api.get<Paginated<TaskCardData>>('/tasks', {
          params: toParams({ limit: 25, ...filters }),
        })
      ).data,
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useTaskHistory(id: string) {
  return useQuery({
    queryKey: taskKeys.history(id),
    queryFn: async () => (await api.get<S['StatusHistoryEntryDto'][]>(`/tasks/${id}/history`)).data,
  });
}

export function useTaskComments(id: string, enabled = true) {
  return useQuery({
    queryKey: taskKeys.comments(id),
    queryFn: async () => (await api.get<S['CommentDto'][]>(`/tasks/${id}/comments`)).data,
    refetchInterval: POLL_INTERVAL_MS,
    enabled,
  });
}
