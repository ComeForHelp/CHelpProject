'use client';

import { Paper } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { RecipientForm } from '@/features/profile';
import { PageHeader } from '@/shared/ui';

export default function CoordNewRecipientPage() {
  const router = useRouter();
  return (
    <>
      <PageHeader
        title="Новый получатель"
        description="Регистрация человека без интернета — с его слов по телефону"
      />
      <Paper withBorder p="lg" radius="md">
        <RecipientForm
          asRelative={false}
          onCreated={(id) => router.push(`/coord/recipients/${id}`)}
        />
      </Paper>
    </>
  );
}
