'use client';

import { useParams } from 'next/navigation';
import { TaskDetails } from '@/widgets/task-details';

export default function WardTaskPage() {
  const { recipientId, id } = useParams<{ recipientId: string; id: string }>();
  return <TaskDetails taskId={id} basePath={`/family/${recipientId}`} />;
}
