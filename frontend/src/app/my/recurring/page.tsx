'use client';

import { PageHeader } from '@/shared/ui';
import { RecurringList } from '@/widgets/recipient';

export default function MyRecurringPage() {
  return (
    <>
      <PageHeader title="Регулярные поручения" description="То, что нужно делать постоянно" />
      <RecurringList basePath="/my" />
    </>
  );
}
