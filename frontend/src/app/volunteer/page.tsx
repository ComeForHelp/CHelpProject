'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useVolunteerProfile } from '@/entities/user';
import { LoadingBlock } from '@/shared/ui';

/** Вход в раздел: проверенному — каталог, остальным — статус проверки. */
export default function VolunteerIndexPage() {
  const profile = useVolunteerProfile();
  const router = useRouter();
  useEffect(() => {
    if (!profile.data) return;
    router.replace(
      profile.data.verificationStatus === 'VERIFIED' ? '/volunteer/catalog' : '/volunteer/pending',
    );
  }, [profile.data, router]);
  return <LoadingBlock />;
}
