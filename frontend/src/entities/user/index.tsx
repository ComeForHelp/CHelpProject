'use client';

import { Group, Paper, Rating, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { S } from '@/shared/api/types';
import { CONTACT_PREFERENCE } from '@/shared/config/dictionaries';
import { formatPhone, fullName } from '@/shared/lib/format';
import { useSession } from '@/shared/model/session';
import { PhoneLink } from '@/shared/ui';

export type Me = S['MeDto'];

export const userKeys = {
  me: ['users', 'me'] as const,
  volunteerProfile: ['volunteers', 'me'] as const,
  recipientMe: ['recipients', 'me'] as const,
};

export function useMe() {
  const authed = useSession((s) => !!s.accessToken);
  return useQuery({
    queryKey: userKeys.me,
    queryFn: async () => (await api.get<Me>('/users/me')).data,
    enabled: authed,
  });
}

export function useVolunteerProfile() {
  return useQuery({
    queryKey: userKeys.volunteerProfile,
    queryFn: async () => (await api.get<S['VolunteerProfileDto']>('/volunteers/me')).data,
  });
}

/** RecipientContact: имя, телефон, особенности — показывается волонтёру только после взятия. */
export function RecipientContact({ recipient }: { recipient: S['TaskRecipientDto'] }) {
  return (
    <Stack gap="xs">
      <Text fw={700} size="lg">
        {fullName({
          lastName: recipient.lastName,
          firstName: recipient.firstName,
          middleName: recipient.middleName,
        })}
      </Text>
      {recipient.mobilityNotes && (
        <Paper bg="yellow.0" p="sm" radius="md" withBorder>
          <Text fw={600}>Особенности: {recipient.mobilityNotes}</Text>
        </Paper>
      )}
      {recipient.phone && (
        <Group gap="sm" wrap="wrap">
          <PhoneLink phone={recipient.phone} label="Позвонить получателю" />
          <Text c="dimmed">
            {formatPhone(recipient.phone)}
            {recipient.contactPreference
              ? ` · ${CONTACT_PREFERENCE[recipient.contactPreference]}`
              : ''}
          </Text>
        </Group>
      )}
    </Stack>
  );
}

/** VolunteerContact: кто взял заявку и кнопка «Позвонить». */
export function VolunteerContact({ volunteer }: { volunteer: S['TaskVolunteerDto'] }) {
  return (
    <Stack gap="xs">
      <Text fw={700} size="lg">
        {volunteer.firstName} {volunteer.lastName}
      </Text>
      {volunteer.ratingAvg ? (
        <Group gap="xs">
          <Rating
            value={volunteer.ratingAvg}
            fractions={2}
            readOnly
            aria-label={`Рейтинг ${volunteer.ratingAvg}`}
          />
          <Text c="dimmed">
            {volunteer.ratingAvg.toFixed(1)} · выполнено заявок: {volunteer.tasksDone ?? 0}
          </Text>
        </Group>
      ) : (
        <Text c="dimmed">Выполнено заявок: {volunteer.tasksDone ?? 0}</Text>
      )}
      <Group gap="sm" wrap="wrap">
        <PhoneLink phone={volunteer.phone} label="Позвонить волонтёру" />
        <Text c="dimmed">{formatPhone(volunteer.phone)}</Text>
      </Group>
    </Stack>
  );
}
