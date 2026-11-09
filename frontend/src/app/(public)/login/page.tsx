import { Paper, Stack, Title } from '@mantine/core';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Вход' };

export default function LoginPage() {
  return (
    <Stack maw={480} mx="auto" gap="lg">
      <Title order={1}>Вход</Title>
      <Paper withBorder p="lg" radius="md">
        <Suspense>
          <LoginForm />
        </Suspense>
      </Paper>
    </Stack>
  );
}
