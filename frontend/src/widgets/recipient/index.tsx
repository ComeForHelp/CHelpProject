'use client';

import { Alert, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconCalendarRepeat, IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { CategoryIcon } from '@/entities/category';
import { useNotifications } from '@/entities/notification';
import { useRecurringRules } from '@/entities/recurring';
import { TaskCard, type TaskCardData, useMyTasks } from '@/entities/task';
import { RecurringRuleControls, describeSchedule } from '@/features/recurring';
import { RepeatTask } from '@/features/task-actions';
import { dayLabel } from '@/shared/lib/date';
import { BigButton, EmptyState, LinkCard, QueryState, StatusBadge } from '@/shared/ui';

/** ActiveTasksList — заявки, которые ещё не закрыты. Обновляется раз в 30 с. */
export function ActiveTasksList({
  recipientId,
  basePath,
  showRecipient,
}: {
  recipientId?: string;
  basePath: string;
  showRecipient?: boolean;
}) {
  const query = useMyTasks({ scope: 'active', recipientId });
  return (
    <QueryState query={query} loadingLabel="Загружаем заявки…">
      {(data) =>
        data.items.length ? (
          <Stack gap="sm">
            {data.items.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                href={`${basePath}/tasks/${t.id}`}
                showVolunteer
                showRecipient={showRecipient}
              />
            ))}
          </Stack>
        ) : (
          <EmptyState
            title="Активных заявок нет"
            text="Когда понадобится помощь, нажмите «Нужна помощь»"
          />
        )
      }
    </QueryState>
  );
}

/** Короткая строка обращения: «28.10 · Продукты» + статус. */
function RecentRow({ task, href }: { task: TaskCardData; href: string }) {
  return (
    <LinkCard href={href} p="md">
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Text>
          {new Date(task.windowStart).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            timeZone: 'Asia/Vladivostok',
          })}{' '}
          · {task.category.name}
        </Text>
        <StatusBadge status={task.status} size="md" />
      </Group>
    </LinkCard>
  );
}

/**
 * Главная получателя по макету: приветствие, «Нужна помощь», активные заявки,
 * ближайшее регулярное поручение, уведомления, последние обращения.
 * Родственнику (recipientId задан) — то же от имени подопечного, без его уведомлений.
 */
export function RecipientHome({
  recipientId,
  basePath,
  greeting,
}: {
  recipientId?: string;
  basePath: string;
  greeting?: string;
}) {
  const rules = useRecurringRules(recipientId);
  const active = useMyTasks({ scope: 'active', recipientId });
  const recent = useMyTasks({ scope: 'history', recipientId, limit: 3 });
  const notes = useNotifications(!recipientId);
  const next = (rules.data ?? [])
    .filter((r) => r.isActive && r.nextDates.length)
    .sort((a, b) => a.nextDates[0].localeCompare(b.nextDates[0]))[0];
  const unread = (notes.data?.items ?? []).filter((n) => !n.readAt).slice(0, 3);

  return (
    <Stack gap="lg">
      {greeting && (
        <Stack gap={6}>
          <Title order={1}>{greeting}</Title>
          <Text c="dimmed">Что вам нужно сделать сейчас?</Text>
        </Stack>
      )}
      <BigButton href={`${basePath}/tasks/new`} h={64} fz="1.2rem">
        Нужна помощь
      </BigButton>

      <QueryState query={active} loadingLabel="Загружаем заявки…">
        {(data) =>
          data.items.length ? (
            <Stack gap="sm">
              <Title order={2} size="h3">
                Активные заявки
              </Title>
              {data.items.map((t) => (
                <TaskCard key={t.id} task={t} href={`${basePath}/tasks/${t.id}`} showVolunteer />
              ))}
            </Stack>
          ) : (
            <Paper withBorder p="lg">
              <Title order={2} size="h4" mb={6}>
                Сейчас нет активных заявок
              </Title>
              <Text c="dimmed">Нажмите «Нужна помощь», чтобы оставить новую заявку.</Text>
            </Paper>
          )
        }
      </QueryState>

      {next && (
        <Stack gap="sm">
          <Title order={2} size="h3">
            Ближайшее регулярное поручение
          </Title>
          <LinkCard href={`${basePath}/recurring/${next.id}`} p="lg">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <IconCalendarRepeat size={28} aria-hidden color="var(--mantine-color-brand-6)" />
              <Stack gap={2}>
                <Text>
                  <b>{next.title}</b> · {describeSchedule(next)}
                </Text>
                <Text c="dimmed">Следующее: {dayLabel(next.nextDates[0]).toLowerCase()}</Text>
              </Stack>
            </Group>
          </LinkCard>
        </Stack>
      )}

      {!recipientId && (
        <Stack gap="xs">
          <Title order={2} size="h3">
            Уведомления
          </Title>
          {unread.length ? (
            unread.map((n) => (
              <Paper key={n.id} withBorder p="md" bg="brand.0">
                <Text fw={700}>{n.title}</Text>
                {n.body && <Text c="dimmed">{n.body}</Text>}
              </Paper>
            ))
          ) : (
            <Text c="dimmed">Новых уведомлений нет.</Text>
          )}
        </Stack>
      )}

      {!!recent.data?.items.length && (
        <Stack gap="sm">
          <Title order={2} size="h3">
            Последние обращения
          </Title>
          {recent.data.items.map((t) => (
            <RecentRow key={t.id} task={t} href={`${basePath}/tasks/${t.id}`} />
          ))}
          <Button
            component={Link}
            href={`${basePath}/history`}
            variant="subtle"
            style={{ alignSelf: 'flex-start' }}
          >
            Вся история
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

/** История: завершённые и отменённые заявки с кнопкой «Повторить». */
export function TaskHistoryList({
  recipientId,
  basePath,
}: {
  recipientId?: string;
  basePath: string;
}) {
  const query = useMyTasks({ scope: 'history', recipientId });
  return (
    <QueryState query={query}>
      {(data) =>
        data.items.length ? (
          <Stack gap="md">
            {data.items.map((t) => (
              <Stack key={t.id} gap={6}>
                <TaskCard task={t} href={`${basePath}/tasks/${t.id}`} showVolunteer />
                <Group justify="flex-end">
                  <RepeatTask taskId={t.id} basePath={basePath} size="md" />
                </Group>
              </Stack>
            ))}
          </Stack>
        ) : (
          <EmptyState title="Пока пусто" text="Здесь появятся выполненные и отменённые заявки" />
        )
      }
    </QueryState>
  );
}

/** RecurringList — регулярные поручения с переключателем «на паузе». */
export function RecurringList({
  recipientId,
  basePath,
}: {
  recipientId?: string;
  basePath: string;
}) {
  const query = useRecurringRules(recipientId);
  return (
    <Stack gap="md">
      <Button
        component={Link}
        href={`${basePath}/recurring/new`}
        size="lg"
        leftSection={<IconPlus aria-hidden />}
        style={{ alignSelf: 'flex-start' }}
      >
        Новое регулярное поручение
      </Button>
      <QueryState query={query}>
        {(rules) =>
          rules.length ? (
            <Stack gap="sm">
              {rules.map((r) => (
                <Paper key={r.id} withBorder p="md" radius="md" opacity={r.isActive ? 1 : 0.85}>
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Group gap="sm" align="flex-start" wrap="nowrap">
                        <CategoryIcon code={r.category.code} size={30} />
                        <Stack gap={2}>
                          <Text fw={700} size="lg">
                            {r.title}
                          </Text>
                          <Text>{describeSchedule(r)}</Text>
                          {r.isActive && r.nextDates[0] && (
                            <Text c="dimmed">
                              Следующая: {dayLabel(r.nextDates[0]).toLowerCase()}
                            </Text>
                          )}
                          {r.preferredVolunteer && (
                            <Text c="dimmed">
                              Постоянный волонтёр: {r.preferredVolunteer.firstName}{' '}
                              {r.preferredVolunteer.lastName}
                            </Text>
                          )}
                        </Stack>
                      </Group>
                      <Button
                        component={Link}
                        href={`${basePath}/recurring/${r.id}`}
                        variant="light"
                        size="md"
                      >
                        Изменить
                      </Button>
                    </Group>
                    <RecurringRuleControls rule={r} />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <EmptyState
              title="Регулярных поручений нет"
              text="Например: «каждый вторник — лекарства из аптеки». Заявки будут создаваться сами"
            />
          )
        }
      </QueryState>
      <Alert color="gray" c="gray.9">
        Заявки по регулярным поручениям появляются автоматически за несколько дней до нужной даты.
      </Alert>
    </Stack>
  );
}
