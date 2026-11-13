'use client';

import { Button, Stack } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TaskDetails } from '@/widgets/task-details';

export default function MyTaskPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Stack gap="md">
      <Button
        component={Link}
        href="/my"
        variant="subtle"
        size="md"
        leftSection={<IconArrowLeft aria-hidden />}
        style={{ alignSelf: 'flex-start' }}
      >
        На главную
      </Button>
      <TaskDetails taskId={id} basePath="/my" />
    </Stack>
  );
}
