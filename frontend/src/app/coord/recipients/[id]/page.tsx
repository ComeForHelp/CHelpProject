'use client';

import { Anchor, Badge, Button, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconPhonePlus } from '@tabler/icons-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRecipient } from '@/entities/recipient';
import { AddressManager } from '@/features/address';
import { RecipientProfileForm } from '@/features/profile';
import { FREQUENCY } from '@/shared/config/dictionaries';
import { formatWindow } from '@/shared/lib/date';
import { formatPhone } from '@/shared/lib/format';
import { InfoRow, PageHeader, QueryState, StatusBadge } from '@/shared/ui';
import { SectionTitle } from '@/widgets/coordinator';

export default function CoordRecipientPage() {
  const { id } = useParams<{ id: string }>();
  const query = useRecipient(id);
  return (
    <QueryState query={query}>
      {(r) => (
        <Stack gap="lg">
          <PageHeader
            title={`${r.lastName} ${r.firstName} ${r.middleName ?? ''}`}
            description={`${formatPhone(r.phone)} · ${r.canLogin ? 'входит на сайт сам' : 'заявки по телефону'}`}
            action={
              <Button
                component={Link}
                href={`/coord/tasks/new?recipientId=${r.id}`}
                leftSection={<IconPhonePlus aria-hidden />}
              >
                Создать заявку
              </Button>
            }
          />
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Paper withBorder p="md" radius="md">
              <SectionTitle>Особенности и связь</SectionTitle>
              <RecipientProfileForm
                recipientId={r.id}
                mobilityNotes={r.mobilityNotes}
                contactPreference={r.contactPreference}
              />
            </Paper>
            <Paper withBorder p="md" radius="md">
              <SectionTitle>Родственники</SectionTitle>
              {r.relatives.length ? (
                <Stack gap="xs">
                  {r.relatives.map((rel) => (
                    <Group key={rel.linkId} gap="xs" wrap="wrap">
                      <Text fw={600}>
                        {rel.lastName} {rel.firstName}
                      </Text>
                      {rel.relation && <Text c="dimmed">({rel.relation})</Text>}
                      <Text>{formatPhone(rel.phone)}</Text>
                      {rel.status === 'PENDING' && (
                        <Badge color="yellow" c="yellow.9">
                          не подтверждено
                        </Badge>
                      )}
                    </Group>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed">Родственников нет</Text>
              )}
              <Stack gap={6} mt="md">
                <InfoRow label="Согласие на обработку ПД">
                  {r.pdConsentAt ? 'получено' : 'нет'}
                </InfoRow>
              </Stack>
            </Paper>
          </SimpleGrid>
          <Paper withBorder p="md" radius="md">
            <SectionTitle>Адреса</SectionTitle>
            <AddressManager recipientId={r.id} />
          </Paper>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Paper withBorder p="md" radius="md">
              <SectionTitle>Последние заявки</SectionTitle>
              {r.tasks.length ? (
                <Stack gap="xs">
                  {r.tasks.map((t) => (
                    <Group key={t.id} justify="space-between" wrap="nowrap">
                      <Anchor component={Link} href={`/coord/tasks/${t.id}`}>
                        {t.title} · {formatWindow(t.windowStart, t.windowEnd)}
                      </Anchor>
                      <StatusBadge status={t.status} size="md" />
                    </Group>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed">Заявок пока не было</Text>
              )}
            </Paper>
            <Paper withBorder p="md" radius="md">
              <SectionTitle>Регулярные поручения</SectionTitle>
              {r.recurringRules.length ? (
                <Stack gap="xs">
                  {r.recurringRules.map((rule) => (
                    <Group key={rule.id} justify="space-between">
                      <Text>
                        {rule.title} · {FREQUENCY[rule.frequency].toLowerCase()}
                      </Text>
                      <Badge
                        color={rule.isActive ? 'green' : 'gray'}
                        c={rule.isActive ? 'green.9' : 'gray.9'}
                      >
                        {rule.isActive ? 'работает' : 'на паузе'}
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed">Нет</Text>
              )}
            </Paper>
          </SimpleGrid>
        </Stack>
      )}
    </QueryState>
  );
}
