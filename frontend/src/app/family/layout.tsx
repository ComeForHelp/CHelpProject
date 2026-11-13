'use client';

import { IconUserPlus, IconUsers } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { AppLayout } from '@/widgets/app-shell';

const NAV = [
  {
    href: '/family',
    label: 'Мои подопечные',
    icon: <IconUsers size={20} aria-hidden />,
    exact: true,
  },
  {
    href: '/family/link',
    label: 'Добавить подопечного',
    icon: <IconUserPlus size={20} aria-hidden />,
  },
];

export default function FamilyLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayout nav={NAV} taskHref={(id) => `/family/go/${id}`}>
      {children}
    </AppLayout>
  );
}
