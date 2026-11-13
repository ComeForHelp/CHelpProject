'use client';

import { PageHeader } from '@/shared/ui';
import { TaskHistoryList } from '@/widgets/recipient';

export default function MyHistoryPage() {
  return (
    <>
      <PageHeader
        title="История заявок"
        description="Выполненные и отменённые. Любую можно повторить"
      />
      <TaskHistoryList basePath="/my" />
    </>
  );
}
