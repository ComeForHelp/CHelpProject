'use client';

import { Anchor, Group, Paper, Rating, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useVolunteer } from '@/entities/volunteer';
import { VerifyVolunteerActions } from '@/features/profile';
import { formatDateTime } from '@/shared/lib/date';
import { formatPhone } from '@/shared/lib/format';
import { InfoRow, PageHeader, QueryState, StatusBadge } from '@/shared/ui';
import { SectionTitle, VerificationBadge } from '@/widgets/coordinator';

export default function CoordVolunteerPage() {
  const { id } = useParams<{ id: string }>();
  const query = useVolunteer(id);
  return (
    <QueryState query={query}>
      {(v) => (
        <Stack gap="lg">
          <PageHeader
            title={`${v.lastName} ${v.firstName} ${v.middleName ?? ''}`}
            action={<VerificationBadge status={v.profile?.verificationStatus} />}
          />
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <SectionTitle>Решение</SectionTitle>
              {v.profile?.verificationNote && (
                <Text>Комментарий: {v.profile.verificationNote}</Text>
              )}
              {v.profile?.verifiedBy && (
                <Text c="dimmed">
                  Проверил(а): {v.profile.verifiedBy.firstName} {v.profile.verifiedBy.lastName}
                  {v.profile.verifiedAt ? `, ${formatDateTime(v.profile.verifiedAt)}` : ''}
                </Text>
              )}
              <VerifyVolunteerActions volunteerId={v.id} status={v.profile?.verificationStatus} />
            </Stack>
          </Paper>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Paper withBorder p="md" radius="md">
              <SectionTitle>Профиль</SectionTitle>
              <Stack gap={6}>
                <InfoRow label="Телефон">{formatPhone(v.phone)}</InfoRow>
                {v.email && <InfoRow label="Почта">{v.email}</InfoRow>}
                <InfoRow label="Районы">
                  {v.profile?.districts.map((d) => d.name).join(', ') || 'не указаны'}
                </InfoRow>
                <InfoRow label="Машина">{v.profile?.hasCar ? 'есть' : 'нет'}</InfoRow>
                <InfoRow label="Зарегистрирован">{formatDateTime(v.createdAt)}</InfoRow>
                <InfoRow label="Сейчас в работе">{v.activeTasks}</InfoRow>
                <InfoRow label="Выполнено">{v.profile?.tasksDone ?? 0}</InfoRow>
                {v.profile?.about && <Text mt="xs">«{v.profile.about}»</Text>}
              </Stack>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <SectionTitle>Отзывы</SectionTitle>
              {v.reviews.length ? (
                <Stack gap="sm">
                  {v.reviews.map((r) => (
                    <Stack key={r.id} gap={2}>
                      <Group gap="xs">
                        <Rating
                          value={r.rating}
                          readOnly
                          size="sm"
                          aria-label={`Оценка ${r.rating}`}
                        />
                        <Text size="sm" c="dimmed">
                          {r.author.firstName} {r.author.lastName}, {formatDateTime(r.createdAt)}
                        </Text>
                      </Group>
                      {r.comment && <Text>«{r.comment}»</Text>}
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed">Отзывов пока нет</Text>
              )}
            </Paper>
          </SimpleGrid>
          <Paper withBorder p="md" radius="md">
            <Title order={2} size="h3" mb="sm">
              Последние заявки
            </Title>
            {v.recentTasks.length ? (
              <Stack gap="xs">
                {v.recentTasks.map((t) => (
                  <Group key={t.id} justify="space-between" wrap="nowrap">
                    <Anchor component={Link} href={`/coord/tasks/${t.id}`}>
                      {t.title} · {formatDateTime(t.windowStart)}
                    </Anchor>
                    <StatusBadge status={t.status} size="md" />
                  </Group>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed">Заявок пока не было</Text>
            )}
          </Paper>
        </Stack>
      )}
    </QueryState>
  );
}
