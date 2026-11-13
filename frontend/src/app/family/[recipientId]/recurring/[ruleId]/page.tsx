'use client';

import { useParams } from 'next/navigation';
import { useRecurringRule } from '@/entities/recurring';
import { RecurringRuleForm } from '@/features/recurring';
import { QueryState } from '@/shared/ui';

export default function WardEditRecurringPage() {
  const { recipientId, ruleId } = useParams<{ recipientId: string; ruleId: string }>();
  const rule = useRecurringRule(ruleId);
  return (
    <QueryState query={rule}>
      {(r) => <RecurringRuleForm rule={r} basePath={`/family/${recipientId}`} />}
    </QueryState>
  );
}
