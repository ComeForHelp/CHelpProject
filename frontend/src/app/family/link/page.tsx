'use client';

import { Paper, Tabs } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { LinkRecipientForm, RecipientForm } from '@/features/profile';
import { PageHeader } from '@/shared/ui';

export default function FamilyLinkPage() {
  const router = useRouter();
  return (
    <>
      <PageHeader title="Добавить подопечного" />
      <Paper withBorder p="lg" radius="md">
        <Tabs defaultValue="find">
          <Tabs.List grow mb="lg">
            <Tabs.Tab value="find" fz="lg">
              Уже зарегистрирован
            </Tabs.Tab>
            <Tabs.Tab value="new" fz="lg">
              Зарегистрировать
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="find">
            <LinkRecipientForm onDone={() => router.push('/family')} />
          </Tabs.Panel>
          <Tabs.Panel value="new">
            <RecipientForm asRelative onCreated={(id) => router.push(`/family/${id}`)} />
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </>
  );
}
