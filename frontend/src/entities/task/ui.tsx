'use client';

import { Alert, Badge, Group, List, Stack, Text, Timeline } from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconCircleDashed,
  IconClock,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import type { S, TaskStatus } from '@/shared/api/types';
import { ROLE_LABEL, TASK_STATUS } from '@/shared/config/dictionaries';
import { formatDateTime, formatWindow } from '@/shared/lib/date';
import { formatMoney, plural, shortName } from '@/shared/lib/format';
import { LinkCard, StatusBadge } from '@/shared/ui';
import { CategoryIcon } from '../category';
import type { CatalogCard, TaskCardData, TaskDetail } from './api';

/** TaskCard — краткая карточка: иконка категории, что, когда, статус. */
export function TaskCard({
  task,
  href,
  showRecipient,
  showVolunteer,
}: {
  task: TaskCardData;
  href: string;
  showRecipient?: boolean;
  showVolunteer?: boolean;
}) {
  return (
    <LinkCard href={href}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Group gap="sm" align="flex-start" wrap="nowrap" style={{ minWidth: 0 }}>
          <CategoryIcon code={task.category.code} size={32} />
          <Stack gap={4} style={{ minWidth: 0 }}>
            <Text fw={700} size="lg">
              {task.title}
            </Text>
            <Text>{formatWindow(task.windowStart, task.windowEnd)}</Text>
            {showRecipient && <Text c="dimmed">Для: {shortName(task.recipient)}</Text>}
            {showVolunteer && task.volunteer && (
              <Text c="dimmed">Волонтёр: {shortName(task.volunteer)}</Text>
            )}
          </Stack>
        </Group>
        <Stack gap={6} align="flex-end" style={{ flexShrink: 1, minWidth: 0, maxWidth: '50%' }}>
          <StatusBadge status={task.status} size="md" />
          {task.urgency === 'URGENT' && (
            <Badge color="red" c="red.9" size="md">
              Срочно
            </Badge>
          )}
        </Stack>
      </Group>
    </LinkCard>
  );
}

/** CatalogTaskCard — карточка в каталоге волонтёра: только район, без улицы и имени. */
export function CatalogTaskCard({ task, href }: { task: CatalogCard; href: string }) {
  return (
    <LinkCard href={href}>
      <Stack gap={6}>
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="sm" wrap="nowrap" align="flex-start" style={{ minWidth: 0 }}>
            <CategoryIcon code={task.category.code} size={30} />
            <Text fw={700} size="lg" style={{ minWidth: 0 }}>
              {task.title}
            </Text>
          </Group>
          {task.urgency === 'URGENT' && (
            <Badge color="red" c="red.9" style={{ flexShrink: 0 }}>
              Срочно
            </Badge>
          )}
        </Group>
        <Text>{formatWindow(task.windowStart, task.windowEnd)}</Text>
        <Group gap="xs" wrap="wrap">
          <Badge color="gray" c="gray.9">
            {task.district.name}
          </Badge>
          {task.noElevator && (
            <Badge color="orange" c="orange.9">
              Без лифта{task.floor ? `, ${task.floor} эт.` : ''}
            </Badge>
          )}
          {task.itemsCount > 0 && (
            <Badge color="ink" c="ink.8">
              {task.itemsCount} {plural(task.itemsCount, ['позиция', 'позиции', 'позиций'])}
            </Badge>
          )}
          {task.estimatedCost ? (
            <Badge color="ink" c="ink.8">
              ≈ {formatMoney(task.estimatedCost)}
            </Badge>
          ) : null}
        </Group>
        <Text c="brand.7" fw={700}>
          Подробнее →
        </Text>
      </Stack>
    </LinkCard>
  );
}

const TIMELINE: Array<{ status: TaskStatus; at: keyof TaskDetail }> = [
  { status: 'NEW', at: 'createdAt' },
  { status: 'ASSIGNED', at: 'acceptedAt' },
  { status: 'IN_PROGRESS', at: 'startedAt' },
  { status: 'DONE', at: 'doneAt' },
  { status: 'CONFIRMED', at: 'confirmedAt' },
];

/** TaskStatusTimeline — шкала «Создана → Взяли → В пути → Выполнена → Принята» со временем. */
export function TaskStatusTimeline({ task }: { task: TaskDetail }) {
  if (task.status === 'CANCELLED' || task.status === 'EXPIRED') {
    return (
      <Alert
        color={task.status === 'CANCELLED' ? 'gray' : 'red'}
        icon={<IconAlertTriangle aria-hidden />}
      >
        <Text fw={700}>{TASK_STATUS[task.status].label}</Text>
        {task.cancelReason && <Text>Причина: {task.cancelReason}</Text>}
        {task.cancelledAt && <Text c="dimmed">{formatDateTime(task.cancelledAt)}</Text>}
      </Alert>
    );
  }
  const current = TIMELINE.findIndex((s) => s.status === task.status);
  return (
    <Timeline active={current} bulletSize={30} lineWidth={3} aria-label="Ход выполнения заявки">
      {TIMELINE.map((step, i) => {
        const at = task[step.at] as string | null | undefined;
        const done = i <= current;
        return (
          <Timeline.Item
            key={step.status}
            bullet={
              done ? <IconCheck size={18} aria-hidden /> : <IconClock size={18} aria-hidden />
            }
            title={<Text fw={done ? 700 : 500}>{TASK_STATUS[step.status].short}</Text>}
          >
            <Text c="dimmed" size="sm">
              {done && at ? formatDateTime(at) : i === current + 1 ? 'Следующий шаг' : ''}
            </Text>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}

/** Подпись позиции: «Молоко — 2 шт (2,5%)». */
export function itemLabel(item: S['TaskItemDto']): string {
  return (
    item.name +
    (item.quantity ? ` — ${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : '') +
    (item.note ? ` (${item.note})` : '')
  );
}

/** Состояние позиции словами и значком — не только цветом. */
export function itemState(item: S['TaskItemDto']) {
  if (item.isChecked) return { text: 'Куплено', color: 'green.8', Icon: IconCheck };
  if (item.isUnavailable) return { text: 'Нет в наличии', color: 'red.8', Icon: IconX };
  return { text: 'Ещё не куплено', color: 'ink.6', Icon: IconCircleDashed };
}

/**
 * ShoppingListView — список покупок только для просмотра (получатель, родственник).
 * Отметки ставит волонтёр, поэтому здесь не галочки, а состояние словами.
 */
export function ShoppingListView({
  items,
  showState = true,
}: {
  items: S['TaskItemDto'][];
  showState?: boolean;
}) {
  if (!items.length) return <Text c="dimmed">Список не задан</Text>;
  return (
    <Stack gap={8}>
      {showState && (
        <Text c="dimmed" size="sm">
          Отметки «куплено» и «нет в наличии» ставит волонтёр, когда покупает.
        </Text>
      )}
      {items.map((item) => {
        const state = itemState(item);
        return (
          <Group key={item.id} gap="sm" wrap="nowrap" align="flex-start">
            {showState && (
              <state.Icon
                size={22}
                aria-hidden
                color={`var(--mantine-color-${state.color.replace('.', '-')})`}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
            )}
            <Text style={{ minWidth: 0 }}>
              {itemLabel(item)}
              {showState && (
                <Text span c={state.color} fw={600}>
                  {' '}
                  · {state.text}
                </Text>
              )}
            </Text>
          </Group>
        );
      })}
    </Stack>
  );
}

/** StatusHistory — журнал: кто, когда, из какого статуса в какой. */
export function StatusHistory({ entries }: { entries: S['StatusHistoryEntryDto'][] }) {
  return (
    <List spacing="sm" listStyleType="none" p={0}>
      {entries.map((e) => (
        <List.Item key={e.id} icon={<IconUser size={20} aria-hidden />}>
          <Text fw={600}>
            {e.fromStatus ? `${TASK_STATUS[e.fromStatus].short} → ` : ''}
            {TASK_STATUS[e.toStatus].short}
          </Text>
          <Text c="dimmed" size="sm">
            {formatDateTime(e.createdAt)} ·{' '}
            {e.changedBy
              ? `${shortName(e.changedBy)} (${ROLE_LABEL[e.changedBy.role].toLowerCase()})`
              : 'система'}
          </Text>
          {e.comment && <Text size="sm">«{e.comment}»</Text>}
        </List.Item>
      ))}
    </List>
  );
}
