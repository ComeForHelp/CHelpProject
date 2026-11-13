'use client';

import { PageHeader } from '@/shared/ui';
import { ReportsPanel } from '@/widgets/coordinator';

export default function CoordReportsPage() {
  return (
    <>
      <PageHeader
        title="Отчёты"
        description="Метрики пилота: пользователи, заявки, время отклика, оценки"
      />
      <ReportsPanel />
    </>
  );
}
