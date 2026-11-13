'use client';

import { useVolunteerProfile } from '@/entities/user';
import { PageHeader, QueryState } from '@/shared/ui';
import { VerificationStatusCard } from '@/widgets/volunteer';

export default function VolunteerPendingPage() {
  const profile = useVolunteerProfile();
  return (
    <>
      <PageHeader title="Проверка волонтёра" />
      <QueryState query={profile}>{(p) => <VerificationStatusCard profile={p} />}</QueryState>
    </>
  );
}
