'use client';

import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { createQueryClient } from '@/shared/api/query-client';
import { cssVariablesResolver, theme } from '@/shared/theme/theme';
import { A11yEffect, A11yPanel } from '@/shared/ui';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="light"
    >
      <QueryClientProvider client={queryClient}>
        <ModalsProvider labels={{ confirm: 'Да', cancel: 'Отмена' }}>
          <Notifications position="top-center" autoClose={5000} />
          {/* Размер шрифта и версия для слабовидящих — ко всему сайту через <html> */}
          <A11yEffect />
          <A11yPanel />
          {children}
        </ModalsProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
}
