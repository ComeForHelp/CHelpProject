'use client';

import { RecurringRuleForm } from '@/features/recurring';
import { PageHeader } from '@/shared/ui';

export default function NewRecurringPage() {
  return (
    <>
      <PageHeader title="Новое регулярное поручение" />
      <RecurringRuleForm basePath="/my" />
    </>
  );
}
