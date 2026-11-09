import { Paper, Stack, Title } from '@mantine/core';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Регистрация' };

export default function RegisterPage() {
  return (
    <Stack maw={720} mx="auto" gap="lg">
      <Title order={1}>Регистрация</Title>
      <Paper withBorder p="lg" radius="md">
        <Suspense>
          <RegisterForm />
        </Suspense>
      </Paper>
    </Stack>
  );
}
