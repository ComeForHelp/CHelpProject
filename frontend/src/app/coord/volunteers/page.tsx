'use client';

import { Suspense } from 'react';
import { LoadingBlock, PageHeader } from '@/shared/ui';
import { VolunteersTabs } from '@/widgets/coordinator';

export default function CoordVolunteersPage() {
  return (
    <>
      <PageHeader title="Волонтёры" />
      <Suspense fallback={<LoadingBlock />}>
        <VolunteersTabs />
      </Suspense>
    </>
  );
}
