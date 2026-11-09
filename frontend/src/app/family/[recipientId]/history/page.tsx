'use client';

import { useParams } from 'next/navigation';
import { TaskHistoryList } from '@/widgets/recipient';

export default function WardHistoryPage() {
  const { recipientId } = useParams<{ recipientId: string }>();
  return <TaskHistoryList recipientId={recipientId} basePath={`/family/${recipientId}`} />;
}
