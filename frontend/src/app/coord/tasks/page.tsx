'use client';

import { Suspense } from 'react';
import { LoadingBlock, PageHeader } from '@/shared/ui';
import { TasksTable } from '@/widgets/coordinator';

export default function CoordTasksPage() {
  return (
    <>
      <PageHeader title="Все заявки" />
      <Suspense fallback={<LoadingBlock />}>
        <TasksTable />
      </Suspense>
    </>
  );
}
