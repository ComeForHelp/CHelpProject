'use client';

import { Alert, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconCalendarRepeat, IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { CategoryIcon } from '@/entities/category';
import { useRecurringRules } from '@/entities/recurring';
import { TaskCard, useMyTasks } from '@/entities/task';
import { RecurringRuleControls, describeSchedule } from '@/features/recurring';
import { RepeatTask } from '@/features/task-actions';
import { dayLabel } from '@/shared/lib/date';
import { BigButton, EmptyState, QueryState } from '@/shared/ui';

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

/** Главная получателя: большая кнопка, ближайшее регулярное поручение, активные заявки. */
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
  const next = (rules.data ?? [])
    .filter((r) => r.isActive && r.nextDates.length)
    .sort((a, b) => a.nextDates[0].localeCompare(b.nextDates[0]))[0];

  return (
    <Stack gap="xl">
      {greeting && <Title order={1}>{greeting}</Title>}
      <BigButton
        href={`${basePath}/tasks/new`}
        leftSection={<IconPlus size={28} aria-hidden />}
        h={80}
        fz="1.4rem"
      >
        Нужна помощь
      </BigButton>

      {next && (
        <Paper withBorder p="md" radius="md" bg="blue.0">
          <Group gap="sm" wrap="nowrap">
            <IconCalendarRepeat size={32} aria-hidden color="var(--mantine-color-blue-8)" />
            <Stack gap={2}>
              <Text fw={700}>
                Ближайшее регулярное: {next.title} — {dayLabel(next.nextDates[0]).toLowerCase()},{' '}
                {next.timeFrom}–{next.timeTo}
              </Text>
              <Text c="dimmed">Заявка появится сама за несколько дней</Text>
            </Stack>
          </Group>
        </Paper>
      )}

      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={2}>Активные заявки</Title>
          <Button component={Link} href={`${basePath}/history`} variant="subtle" size="md">
            История
          </Button>
        </Group>
        <ActiveTasksList recipientId={recipientId} basePath={basePath} />
      </Stack>
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
