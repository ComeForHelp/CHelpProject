'use client';

import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { createQueryClient } from '@/shared/api/query-client';
import { useUiPrefs } from '@/shared/model/ui-prefs';
import { cssVariablesResolver, theme } from '@/shared/theme/theme';

/** Размер шрифта из переключателя применяется ко всему интерфейсу через html { font-size }. */
function FontSizeEffect() {
  const fontSize = useUiPrefs((s) => s.fontSize);
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);
  return null;
}

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
          <FontSizeEffect />
          {children}
        </ModalsProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
}
