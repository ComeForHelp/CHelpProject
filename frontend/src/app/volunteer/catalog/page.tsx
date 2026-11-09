'use client';

import { PageHeader } from '@/shared/ui';
import { TaskCatalog } from '@/widgets/volunteer';

export default function VolunteerCatalogPage() {
  return (
    <>
      <PageHeader
        title="Открытые заявки"
        description="Срочные — сверху, дальше по ближайшему времени"
      />
      <TaskCatalog />
    </>
  );
}
