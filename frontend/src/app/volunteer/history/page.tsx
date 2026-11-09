'use client';

import { PageHeader } from '@/shared/ui';
import { VolunteerHistory } from '@/widgets/volunteer';

export default function VolunteerHistoryPage() {
  return (
    <>
      <PageHeader title="История" description="Выполненные заявки и оценки" />
      <VolunteerHistory />
    </>
  );
}
