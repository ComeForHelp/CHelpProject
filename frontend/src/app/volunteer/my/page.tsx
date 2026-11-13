'use client';

import { Button, Stack } from '@mantine/core';
import Link from 'next/link';
import { TaskCard, useMyTasks } from '@/entities/task';
import { EmptyState, PageHeader, QueryState } from '@/shared/ui';

export default function VolunteerMyPage() {
  const query = useMyTasks({ scope: 'active' });
  return (
    <>
      <PageHeader title="Мои поручения" description="Взятые и в работе, по времени" />
      <QueryState query={query}>
        {(data) =>
          data.items.length ? (
            <Stack gap="sm">
              {data.items.map((t) => (
                <TaskCard key={t.id} task={t} href={`/volunteer/tasks/${t.id}`} showRecipient />
              ))}
            </Stack>
          ) : (
            <EmptyState
              title="Сейчас поручений нет"
              text="Выберите заявку в каталоге"
              action={
                <Button component={Link} href="/volunteer/catalog">
                  Открыть каталог
                </Button>
              }
            />
          )
        }
      </QueryState>
    </>
  );
}
