'use client';

import {
  IconChartBar,
  IconClipboardList,
  IconHeartHandshake,
  IconLayoutDashboard,
  IconPhonePlus,
  IconUsers,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { AppLayout } from '@/widgets/app-shell';

const NAV = [
  {
    href: '/coord',
    label: 'Обзор',
    icon: <IconLayoutDashboard size={20} aria-hidden />,
    exact: true,
  },
  { href: '/coord/tasks', label: 'Все заявки', icon: <IconClipboardList size={20} aria-hidden /> },
  {
    href: '/coord/tasks/new',
    label: 'Заявка по звонку',
    icon: <IconPhonePlus size={20} aria-hidden />,
    exact: true,
  },
  {
    href: '/coord/volunteers',
    label: 'Волонтёры',
    icon: <IconHeartHandshake size={20} aria-hidden />,
  },
  { href: '/coord/recipients', label: 'Получатели', icon: <IconUsers size={20} aria-hidden /> },
  { href: '/coord/reports', label: 'Отчёты', icon: <IconChartBar size={20} aria-hidden /> },
];

export default function CoordLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayout nav={NAV} taskHref={(id) => `/coord/tasks/${id}`} size="xl" showFontSwitcher={false}>
      {children}
    </AppLayout>
  );
}
