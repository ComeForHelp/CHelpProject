'use client';

import { Badge, Paper, Stack, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { useMe, useVolunteerProfile } from '@/entities/user';
import { ChangePasswordForm, ProfileForm, VolunteerProfileForm } from '@/features/profile';
import { VERIFICATION_STATUS } from '@/shared/config/dictionaries';
import { PageHeader, QueryState } from '@/shared/ui';

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

export default function VolunteerProfilePage() {
  const me = useMe();
  const profile = useVolunteerProfile();
  const status = profile.data ? VERIFICATION_STATUS[profile.data.verificationStatus] : null;
  return (
    <Stack gap="lg">
      <PageHeader
        title="Профиль"
        action={
          status && (
            <Badge color={status.color} c={`${status.color}.9`} size="xl">
              {status.label}
            </Badge>
          )
        }
      />
      <Block title="Районы и о себе">
        <QueryState query={profile}>{(p) => <VolunteerProfileForm profile={p} />}</QueryState>
      </Block>
      <Block title="Контакты">
        <QueryState query={me}>{(m) => <ProfileForm me={m} />}</QueryState>
      </Block>
      <Block title="Пароль">
        <ChangePasswordForm />
      </Block>
    </Stack>
  );
}
