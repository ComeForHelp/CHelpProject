'use client';

import {
  Anchor,
  Button,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Tooltip,
  VisuallyHidden,
} from '@mantine/core';
import Link from 'next/link';
import { useStaffTasks } from '@/entities/task';
import { useVolunteers } from '@/entities/volunteer';
import { addDaysYmd, formatDateTime, toYmd, todayYmd } from '@/shared/lib/date';
import { shortName } from '@/shared/lib/format';
import { LoadingBlock, StatusBadge } from '@/shared/ui';
import classes from './coordinator.module.css';

const WEEKDAY = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' });

/**
 * «Заявки за неделю» из макета: сколько заявок создано в каждый из последних 7 дней.
 * Один цвет, столбики тонкие и прижаты к оси; число — по наведению и с клавиатуры,
 * для экранного диктора — скрытая таблица с теми же значениями.
 * Считаем по последним 200 заявкам: для пилота этого хватает с запасом.
 */
export function WeekChart() {
  const query = useStaffTasks({ sort: 'createdAt', limit: 100 });
  const query2 = useStaffTasks({ sort: 'createdAt', limit: 100, page: 2 });
  if (query.isPending) return <LoadingBlock />;

  const today = todayYmd();
  const days = Array.from({ length: 7 }, (_, i) => addDaysYmd(today, i - 6));
  const all = [...(query.data?.items ?? []), ...(query2.data?.items ?? [])];
  const counts = days.map((d) => all.filter((t) => toYmd(t.createdAt) === d).length);
  const max = Math.max(1, ...counts);
  const label = (ymd: string) => WEEKDAY.format(new Date(`${ymd}T12:00:00Z`)).replace('.', '');
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <Stack gap="xs">
      <Text c="dimmed" size="sm">
        Всего за 7 дней: {total}
      </Text>
      <div className={classes.week} aria-hidden>
        {days.map((d, i) => (
          <Tooltip
            key={d}
            label={`${label(d)}, ${d.slice(8)}.${d.slice(5, 7)}: ${counts[i]}`}
            withArrow
          >
            <div className={classes.weekCol} tabIndex={0}>
              <div className={classes.weekTrack}>
                {counts[i] > 0 && (
                  <div
                    className={classes.weekBar}
                    style={{ height: `${(counts[i] / max) * 100}%` }}
                  />
                )}
              </div>
              <Text
                size="sm"
                c="dimmed"
                data-today={d === today || undefined}
                className={classes.weekLabel}
              >
                {label(d)}
              </Text>
            </div>
          </Tooltip>
        ))}
      </div>
      <VisuallyHidden>
        <table>
          <caption>Заявки по дням за последнюю неделю</caption>
          <tbody>
            {days.map((d, i) => (
              <tr key={d}>
                <th scope="row">{d}</th>
                <td>{counts[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </VisuallyHidden>
    </Stack>
  );
}

/** «Недавно созданные» — последние 5 заявок. */
export function RecentTasks() {
  const query = useStaffTasks({ sort: 'createdAt', limit: 5 });
  if (query.isPending) return <LoadingBlock />;
  const items = query.data?.items ?? [];
  if (!items.length) return <Text c="dimmed">Заявок пока нет</Text>;
  return (
    <Paper withBorder radius="lg">
      <Table.ScrollContainer minWidth={640}>
        <Table verticalSpacing="sm" fz="md" highlightOnHover>
          <Table.Tbody>
            {items.map((t) => (
              <Table.Tr key={t.id}>
                <Table.Td>
                  <Anchor component={Link} href={`/coord/tasks/${t.id}`} fw={600}>
                    {t.title}
                  </Anchor>
                </Table.Td>
                <Table.Td>{shortName(t.recipient)}</Table.Td>
                <Table.Td c="dimmed">{t.category.name}</Table.Td>
                <Table.Td c="dimmed">{formatDateTime(t.createdAt)}</Table.Td>
                <Table.Td>
                  <StatusBadge status={t.status} size="md" />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}

/** «Ждут проверки» — новые волонтёры с кнопкой «Проверить». */
export function PendingVolunteers() {
  const query = useVolunteers({ status: 'PENDING', limit: 5 });
  if (query.isPending) return <LoadingBlock />;
  const items = query.data?.items ?? [];
  if (!items.length) return <Text c="dimmed">Новых волонтёров на проверку нет</Text>;
  return (
    <Stack gap="sm">
      {items.map((v) => (
        <Paper key={v.id} withBorder p="md" radius="lg">
          <Group justify="space-between" wrap="wrap" gap="sm">
            <Text>
              <b>
                {v.lastName} {v.firstName}
              </b>{' '}
              · зарегистрирован {formatDateTime(v.createdAt)}
            </Text>
            <Button component={Link} href={`/coord/volunteers/${v.id}`} variant="outline" size="md">
              Проверить
            </Button>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
