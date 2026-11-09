'use client';

import { useParams } from 'next/navigation';
import { RecurringRuleForm } from '@/features/recurring';

export default function WardNewRecurringPage() {
  const { recipientId } = useParams<{ recipientId: string }>();
  return <RecurringRuleForm recipientId={recipientId} basePath={`/family/${recipientId}`} />;
}
