'use client';

import { Paper, Stack, Title } from '@mantine/core';
import { useParams } from 'next/navigation';
import { useRecipient } from '@/entities/recipient';
import { AddressManager } from '@/features/address';
import { RecipientProfileForm } from '@/features/profile';
import { QueryState } from '@/shared/ui';

export default function WardProfilePage() {
  const { recipientId } = useParams<{ recipientId: string }>();
  const recipient = useRecipient(recipientId);
  return (
    <Stack gap="lg">
      <Paper withBorder p="lg" radius="md">
        <Stack gap="md">
          <Title order={2} size="h3">
            Особенности и связь
          </Title>
          <QueryState query={recipient}>
            {(r) => (
              <RecipientProfileForm
                recipientId={recipientId}
                mobilityNotes={r.mobilityNotes}
                contactPreference={r.contactPreference}
              />
            )}
          </QueryState>
        </Stack>
      </Paper>
      <Paper withBorder p="lg" radius="md">
        <Stack gap="md">
          <Title order={2} size="h3">
            Адреса
          </Title>
          <AddressManager recipientId={recipientId} />
        </Stack>
      </Paper>
    </Stack>
  );
}
