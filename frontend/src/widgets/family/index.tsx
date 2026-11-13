'use client';

import { Badge, Button, Group, Paper, Select, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconCalendarRepeat, IconHistory, IconHome, IconPlus, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useWardLinks } from '@/entities/relative';
import { formatPhone, plural } from '@/shared/lib/format';
import { EmptyState, LinkCard, QueryState } from '@/shared/ui';

/** Карточки подопечных с числом активных заявок (/family). */
export function WardCards() {
  const query = useWardLinks();
  return (
    <QueryState query={query}>
      {(links) =>
        links.length ? (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {links.map((l) =>
              l.status === 'CONFIRMED' ? (
                <LinkCard key={l.id} href={`/family/${l.recipient.id}`}>
                  <Stack gap={6}>
                    <Text fw={700} size="lg">
                      {l.recipient.lastName} {l.recipient.firstName} {l.recipient.middleName ?? ''}
                    </Text>
                    {l.relation && <Text c="dimmed">{l.relation}</Text>}
                    {l.recipient.phone && <Text c="dimmed">{formatPhone(l.recipient.phone)}</Text>}
                    <Group gap="xs">
                      <Badge
                        color={l.activeTasks ? 'brand' : 'ink'}
                        c={l.activeTasks ? 'brand.8' : 'ink.7'}
                      >
                        {l.activeTasks
                          ? `${l.activeTasks} ${plural(l.activeTasks, ['активная заявка', 'активные заявки', 'активных заявок'])}`
                          : 'Нет активных заявок'}
                      </Badge>
                      {l.awaitingConfirmation > 0 && (
                        <Badge color="teal" c="teal.9">
                          Ждут подтверждения: {l.awaitingConfirmation}
                        </Badge>
                      )}
                    </Group>
                  </Stack>
                </LinkCard>
              ) : (
                <Paper key={l.id} withBorder p="md" radius="md" bg="gray.1">
                  <Stack gap={6}>
                    <Text fw={700} size="lg">
                      {l.recipient.lastName} {l.recipient.firstName}
                    </Text>
                    <Badge color="yellow" c="yellow.9">
                      Ждём подтверждения от подопечного
                    </Badge>
                    <Text c="dimmed" size="sm">
                      Попросите его подтвердить запрос в профиле или позвоните координатору.
                    </Text>
                  </Stack>
                </Paper>
              ),
            )}
          </SimpleGrid>
        ) : (
          <EmptyState
            title="Подопечных пока нет"
            text="Добавьте маму, папу или бабушку — по телефону или зарегистрируйте их сами"
            action={
              <Button component={Link} href="/family/link" leftSection={<IconPlus aria-hidden />}>
                Добавить подопечного
              </Button>
            }
          />
        )
      }
    </QueryState>
  );
}

/** WardSwitcher + меню подопечного: переключение между подопечными без возврата к списку. */
export function WardHeader({ recipientId }: { recipientId: string }) {
  const links = useWardLinks();
  const router = useRouter();
  const pathname = usePathname();
  const base = `/family/${recipientId}`;
  const wards = (links.data ?? []).filter((l) => l.status === 'CONFIRMED');
  const current = wards.find((l) => l.recipient.id === recipientId);

  const nav = [
    { href: base, label: 'Заявки', icon: <IconHome size={20} aria-hidden />, exact: true },
    { href: `${base}/history`, label: 'История', icon: <IconHistory size={20} aria-hidden /> },
    {
      href: `${base}/recurring`,
      label: 'Регулярные',
      icon: <IconCalendarRepeat size={20} aria-hidden />,
    },
    {
      href: `${base}/profile`,
      label: 'Адреса и особенности',
      icon: <IconUser size={20} aria-hidden />,
    },
  ];

  return (
    <Paper withBorder p="md" radius="md" mb="lg">
      <Stack gap="sm">
        {wards.length > 1 ? (
          <Select
            label="Подопечный"
            value={recipientId}
            data={wards.map((l) => ({
              value: l.recipient.id,
              label: `${l.recipient.lastName} ${l.recipient.firstName}`,
            }))}
            onChange={(v) =>
              v &&
              router.push(pathname.replace(base, `/family/${v}`).replace(/\/tasks\/[^/]+$/, ''))
            }
            allowDeselect={false}
            maw={420}
          />
        ) : (
          <Text fw={700} size="lg">
            {current
              ? `${current.recipient.lastName} ${current.recipient.firstName} ${current.recipient.middleName ?? ''}`
              : ' '}
          </Text>
        )}
        <Group gap="xs" component="nav" aria-label="Разделы подопечного">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
            return (
              <Button
                key={n.href}
                component={Link}
                href={n.href}
                size="sm"
                variant={active ? 'filled' : 'light'}
                leftSection={n.icon}
                aria-current={active ? 'page' : undefined}
              >
                {n.label}
              </Button>
            );
          })}
        </Group>
      </Stack>
    </Paper>
  );
}
