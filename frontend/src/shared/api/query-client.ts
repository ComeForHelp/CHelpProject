import { QueryClient } from '@tanstack/react-query';
import { getErrorStatus } from './errors';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        refetchOnWindowFocus: true,
        // Ошибки 4xx повторять бессмысленно — это не сбой сети.
        retry: (count, error) => {
          const status = getErrorStatus(error);
          if (status && status >= 400 && status < 500) return false;
          return count < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}
