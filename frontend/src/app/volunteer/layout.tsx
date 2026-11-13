'use client';

import { IconHistory, IconList, IconListCheck, IconUser } from '@tabler/icons-react';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { useVolunteerProfile } from '@/entities/user';
import { LoadingBlock } from '@/shared/ui';
import { AppLayout } from '@/widgets/app-shell';

const NAV = [
  { href: '/volunteer/catalog', label: 'Каталог', icon: <IconList size={20} aria-hidden /> },
  { href: '/volunteer/my', label: 'Мои поручения', icon: <IconListCheck size={20} aria-hidden /> },
  { href: '/volunteer/history', label: 'История', icon: <IconHistory size={20} aria-hidden /> },
  { href: '/volunteer/profile', label: 'Профиль', icon: <IconUser size={20} aria-hidden /> },
];

/** До проверки координатором доступны только /pending и /profile (раздел 6 ТЗ). */
const OPEN_BEFORE_VERIFICATION = ['/volunteer/pending', '/volunteer/profile'];

export default function VolunteerLayout({ children }: { children: ReactNode }) {
  const profile = useVolunteerProfile();
  const pathname = usePathname();
  const router = useRouter();
  const verified = profile.data?.verificationStatus === 'VERIFIED';
  const allowed = verified || OPEN_BEFORE_VERIFICATION.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (profile.data && !allowed) router.replace('/volunteer/pending');
  }, [profile.data, allowed, router]);

  const nav = verified
    ? NAV
    : [
        { href: '/volunteer/pending', label: 'Проверка', icon: <IconList size={20} aria-hidden /> },
        NAV[3],
      ];

  return (
    <AppLayout
      nav={nav}
      taskHref={(id) => `/volunteer/tasks/${id}`}
      size="sm"
      showFontSwitcher={false}
    >
      {profile.isPending || (profile.data && !allowed) ? <LoadingBlock /> : children}
    </AppLayout>
  );
}
