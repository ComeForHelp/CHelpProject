'use client';

import { useParams } from 'next/navigation';
import { TaskWizard } from '@/features/create-task';

export default function WardNewTaskPage() {
  const { recipientId } = useParams<{ recipientId: string }>();
  return <TaskWizard recipientId={recipientId} basePath={`/family/${recipientId}`} />;
}
