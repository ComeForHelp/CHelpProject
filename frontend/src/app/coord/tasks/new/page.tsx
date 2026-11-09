'use client';

import { Button, Group, Paper, Select, Stack, Text } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconUserPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useRecipient, useRecipients } from '@/entities/recipient';
import { TaskFormSingle } from '@/features/create-task';
import { formatPhone } from '@/shared/lib/format';
import { LoadingBlock, PageHeader } from '@/shared/ui';

function NewTaskByPhone() {
  const params = useSearchParams();
  const router = useRouter();
  const recipientId = params.get('recipientId') ?? undefined;
  const [search, setSearch] = useState('');
  const [debounced] = useDebouncedValue(search, 300);
  const list = useRecipients(debounced);
  const selected = useRecipient(recipientId);

  const options = (list.data?.items ?? []).map((r) => ({
    value: r.id,
    label: `${r.lastName} ${r.firstName} ${r.middleName ?? ''} · ${formatPhone(r.phone)}`,
  }));
  if (selected.data && !options.some((o) => o.value === selected.data.id)) {
    const r = selected.data;
    options.unshift({
      value: r.id,
      label: `${r.lastName} ${r.firstName} ${r.middleName ?? ''} · ${formatPhone(r.phone)}`,
    });
  }

  return (
    <Stack gap="lg">
      <Paper withBorder p="lg" radius="md">
        <Stack gap="sm">
          <Group align="flex-end" wrap="wrap">
            <Select
              style={{ flex: 1, minWidth: 320 }}
              label="Кто звонит (получатель)"
              placeholder="Начните вводить ФИО или телефон"
              searchable
              searchValue={search}
              onSearchChange={setSearch}
              filter={({ options }) => options}
              data={options}
              value={recipientId ?? null}
              onChange={(v) =>
                router.replace(v ? `/coord/tasks/new?recipientId=${v}` : '/coord/tasks/new')
              }
              nothingFoundMessage="Не найдено — зарегистрируйте нового получателя"
            />
            <Button
              component={Link}
              href="/coord/recipients/new"
              variant="light"
              leftSection={<IconUserPlus aria-hidden />}
            >
              Новый получатель
            </Button>
          </Group>
          {selected.data?.mobilityNotes && (
            <Text c="dimmed">Особенности: {selected.data.mobilityNotes}</Text>
          )}
        </Stack>
      </Paper>
      {recipientId ? (
        <TaskFormSingle key={recipientId} recipientId={recipientId} basePath="/coord" />
      ) : (
        <Text c="dimmed">Выберите получателя — появится форма заявки.</Text>
      )}
    </Stack>
  );
}

export default function CoordNewTaskPage() {
  return (
    <>
      <PageHeader
        title="Заявка по звонку"
        description="Выберите получателя и заполните заявку с его слов"
      />
      <Suspense fallback={<LoadingBlock />}>
        <NewTaskByPhone />
      </Suspense>
    </>
  );
}
