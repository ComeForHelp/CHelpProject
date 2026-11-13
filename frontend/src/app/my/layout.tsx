'use client';

import {
  IconCalendarRepeat,
  IconHeart,
  IconHistory,
  IconHome,
  IconUser,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { AppLayout } from '@/widgets/app-shell';

const NAV = [
  { href: '/my', label: 'Главная', icon: <IconHome size={20} aria-hidden />, exact: true },
  {
    href: '/my/tasks/new',
    label: 'Нужна помощь',
    icon: <IconHeart size={20} aria-hidden />,
    exact: true,
  },
  { href: '/my/history', label: 'История', icon: <IconHistory size={20} aria-hidden /> },
  {
    href: '/my/recurring',
    label: 'Регулярные',
    icon: <IconCalendarRepeat size={20} aria-hidden />,
  },
  { href: '/my/profile', label: 'Профиль', icon: <IconUser size={20} aria-hidden /> },
];

export default function RecipientLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayout nav={NAV} taskHref={(id) => `/my/tasks/${id}`}>
      {children}
    </AppLayout>
  );
}
