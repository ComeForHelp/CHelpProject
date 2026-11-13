'use client';

import { useParams } from 'next/navigation';
import { RecurringList } from '@/widgets/recipient';

export default function WardRecurringPage() {
  const { recipientId } = useParams<{ recipientId: string }>();
  return <RecurringList recipientId={recipientId} basePath={`/family/${recipientId}`} />;
}
