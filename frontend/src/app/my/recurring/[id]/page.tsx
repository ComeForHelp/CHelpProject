'use client';

import { useParams } from 'next/navigation';
import { useRecurringRule } from '@/entities/recurring';
import { RecurringRuleForm } from '@/features/recurring';
import { PageHeader, QueryState } from '@/shared/ui';

export default function EditRecurringPage() {
  const { id } = useParams<{ id: string }>();
  const rule = useRecurringRule(id);
  return (
    <>
      <PageHeader title="Регулярное поручение" />
      <QueryState query={rule}>{(r) => <RecurringRuleForm rule={r} basePath="/my" />}</QueryState>
    </>
  );
}
