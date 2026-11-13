'use client';

import { Paper, Stack, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { useRecipientMe } from '@/entities/recipient';
import { useMe } from '@/entities/user';
import { AddressManager } from '@/features/address';
import {
  ChangePasswordForm,
  MyRelatives,
  ProfileForm,
  RecipientProfileForm,
} from '@/features/profile';
import { FontSizeSwitcher, PageHeader, QueryState } from '@/shared/ui';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper withBorder p="lg" radius="md">
      <Stack gap="md">
        <Title order={2} size="h3">
          {title}
        </Title>
        {children}
      </Stack>
    </Paper>
  );
}

export default function MyProfilePage() {
  const me = useMe();
  const recipient = useRecipientMe();
  return (
    <Stack gap="lg">
      <PageHeader title="Профиль" />
      <Block title="Размер шрифта">
        <FontSizeSwitcher />
      </Block>
      <Block title="Обо мне">
        <QueryState query={me}>{(m) => <ProfileForm me={m} />}</QueryState>
      </Block>
      <Block title="Особенности и связь">
        <QueryState query={recipient}>
          {(r) => (
            <RecipientProfileForm
              mobilityNotes={r.mobilityNotes}
              contactPreference={r.contactPreference}
            />
          )}
        </QueryState>
      </Block>
      <Block title="Мои адреса">
        <AddressManager />
      </Block>
      <Block title="Родственники">
        <MyRelatives />
      </Block>
      <Block title="Пароль">
        <ChangePasswordForm />
      </Block>
    </Stack>
  );
}
