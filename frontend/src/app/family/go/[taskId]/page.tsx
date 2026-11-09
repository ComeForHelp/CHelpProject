'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTask } from '@/entities/task';
import { ErrorBlock, LoadingBlock } from '@/shared/ui';

/** Переход из уведомления: узнаём подопечного по заявке и открываем её в его разделе. */
export default function FamilyGoToTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const task = useTask(taskId);
  const router = useRouter();
  const recipientId = task.data?.recipient.id;
  useEffect(() => {
    if (recipientId) router.replace(`/family/${recipientId}/tasks/${taskId}`);
  }, [recipientId, router, taskId]);
  return task.error ? (
    <ErrorBlock error={task.error} />
  ) : (
    <LoadingBlock label="Открываем заявку…" />
  );
}
