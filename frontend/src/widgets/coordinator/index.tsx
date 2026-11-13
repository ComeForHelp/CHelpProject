'use client';

import {
  Anchor,
  Badge,
  Box,
  Button,
  Group,
  Pagination,
  Paper,
  Progress,
  Rating,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  VisuallyHidden,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconAlertTriangle, IconClock, IconSearch } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { useDistricts } from '@/entities/address';
import { useCategories } from '@/entities/category';
import { useRecipients } from '@/entities/recipient';
import { useDashboard, useReport } from '@/entities/report';
import { type StaffTaskFilters, useStaffTasks } from '@/entities/task';
import { useVolunteers } from '@/entities/volunteer';
import type { Role, TaskStatus, VerificationStatus } from '@/shared/api/types';
import { ROLE_LABEL, TASK_STATUS, VERIFICATION_STATUS } from '@/shared/config/dictionaries';
import { formatDateTime, formatWindow, localToIso, todayYmd, addDaysYmd } from '@/shared/lib/date';
import { formatPhone, shortName } from '@/shared/lib/format';
import { EmptyState, ErrorBlock, LoadingBlock, StatusBadge } from '@/shared/ui';
import classes from './coordinator.module.css';

// ───────────── Карточки-показатели (StatCards) ─────────────

/** Stat tile: подпись, значение, необязательная пометка. Клик ведёт в отфильтрованную таблицу. */
function StatTile({
  label,
  value,
  href,
  note,
  alert,
}: {
  label: string;
  value: ReactNode;
  href?: string;
  note?: string;
  alert?: boolean;
}) {
  // Подпись сверху, число прижато к низу — в ряду карточек числа стоят на одной линии
  const body = (
    <Stack gap={6} justify="space-between" h="100%">
      <Group gap={6} wrap="nowrap" align="flex-start">
        {alert && (
          <IconAlertTriangle
            size={20}
            color="var(--mantine-color-red-8)"
            aria-hidden
            style={{ flexShrink: 0 }}
          />
        )}
        <Text c="dimmed" fw={600}>
          {label}
        </Text>
      </Group>
      <Group gap="xs" align="baseline" wrap="wrap">
        <Text fz="2rem" fw={700} lh={1.1}>
          {value}
        </Text>
        {note && (
          <Text size="sm" c={alert ? 'red.8' : 'dimmed'} fw={alert ? 600 : 400}>
            {note}
          </Text>
        )}
      </Group>
    </Stack>
  );
  return href ? (
    <Paper
      component={Link}
      href={href}
      withBorder
      p="md"
      radius="md"
      className={classes.tile}
      h="100%"
    >
      {body}
    </Paper>
  ) : (
    <Paper withBorder p="md" radius="md" h="100%">
      {body}
    </Paper>
  );
}

export function StatCards() {
  const dash = useDashboard();
  if (dash.isPending) return <LoadingBlock />;
  if (dash.error || !dash.data)
    return <ErrorBlock error={dash.error} onRetry={() => dash.refetch()} />;
  const d = dash.data;
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
      <StatTile label="Без волонтёра" value={d.unassigned} href="/coord/tasks?status=NEW" />
      <StatTile
        label="Срочные"
        value={d.urgent}
        href="/coord/tasks?status=NEW&urgency=URGENT"
        alert={d.urgent > 0}
        note={d.urgent ? 'нужен волонтёр' : undefined}
      />
      <StatTile
        label="Просроченные"
        value={d.overdue}
        href="/coord/tasks?overdue=1"
        alert={d.overdue > 0}
        note={d.overdue ? 'окно прошло' : undefined}
      />
      <StatTile
        label="В работе"
        value={d.inProgress}
        href="/coord/tasks?status=ASSIGNED,IN_PROGRESS"
      />
      <StatTile
        label="Ждут подтверждения"
        value={d.awaitingConfirmation}
        href="/coord/tasks?status=DONE"
      />
      <StatTile
        label="Волонтёры на проверке"
        value={d.pendingVolunteers}
        href="/coord/volunteers?tab=PENDING"
      />
    </SimpleGrid>
  );
}

/** Срочные заявки без волонтёра — первые пять. */
export function UrgentQueue() {
  const query = useStaffTasks({ status: ['NEW'], urgency: 'URGENT', limit: 5 });
  if (query.isPending) return <LoadingBlock />;
  const items = query.data?.items ?? [];
  if (!items.length) return <Text c="dimmed">Срочных заявок без волонтёра нет</Text>;
  return (
    <Stack gap="xs">
      {items.map((t) => (
        <Group key={t.id} justify="space-between" wrap="nowrap">
          <Anchor component={Link} href={`/coord/tasks/${t.id}`} fw={600}>
            {t.title} — {shortName(t.recipient)}
          </Anchor>
          <Text c="dimmed" size="sm" style={{ flexShrink: 0 }}>
            {formatWindow(t.windowStart, t.windowEnd)} · {t.district.name}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

// ───────────── Таблица заявок (TasksTable) ─────────────

const STATUS_OPTIONS = (Object.keys(TASK_STATUS) as TaskStatus[]).map((s) => ({
  value: s,
  label: TASK_STATUS[s].label,
}));

/** Фильтры хранятся в адресной строке: ссылку можно отправить коллеге, «Назад» работает. */
function useUrlFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const get = (k: string) => params.get(k) ?? undefined;
  const filters: StaffTaskFilters = {
    status: get('status')?.split(',') as TaskStatus[] | undefined,
    districtId: get('districtId') ? Number(get('districtId')) : undefined,
    categoryId: get('categoryId') ? Number(get('categoryId')) : undefined,
    urgency: get('urgency') as StaffTaskFilters['urgency'],
    overdue: get('overdue') === '1' || undefined,
    unassigned: get('unassigned') === '1' || undefined,
    q: get('q'),
    from: get('from') ? localToIso(get('from')!, '00:00') : undefined,
    to: get('to') ? localToIso(addDaysYmd(get('to')!, 1), '00:00') : undefined,
    page: get('page') ? Number(get('page')) : 1,
  };
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in patch)) next.delete('page');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  return { filters, raw: get, set };
}

export function TasksTable() {
  const { filters, raw, set } = useUrlFilters();
  const districts = useDistricts();
  const categories = useCategories();
  const [q, setQ] = useState(raw('q') ?? '');
  const [debouncedQ] = useDebouncedValue(q, 400);
  const currentQ = raw('q');
  useEffect(() => {
    if ((debouncedQ || undefined) !== currentQ) set({ q: debouncedQ || undefined });
    // set меняется на каждой отрисовке — следим только за значением поиска
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);
  const query = useStaffTasks(filters);

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
          <TextInput
            size="md"
            label="Поиск"
            placeholder="Заголовок, ФИО, телефон"
            leftSection={<IconSearch size={18} aria-hidden />}
            value={q}
            onChange={(e) => setQ(e.currentTarget.value)}
          />
          <Select
            size="md"
            label="Статус"
            placeholder="Все"
            clearable
            data={[
              { value: 'ASSIGNED,IN_PROGRESS', label: 'В работе (взята или выполняется)' },
              ...STATUS_OPTIONS,
            ]}
            value={raw('status') ?? null}
            onChange={(v) => set({ status: v ?? undefined })}
          />
          <Select
            size="md"
            label="Район"
            placeholder="Все"
            clearable
            data={(districts.data ?? []).map((d) => ({ value: String(d.id), label: d.name }))}
            value={raw('districtId') ?? null}
            onChange={(v) => set({ districtId: v ?? undefined })}
          />
          <Select
            size="md"
            label="Категория"
            placeholder="Все"
            clearable
            data={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
            value={raw('categoryId') ?? null}
            onChange={(v) => set({ categoryId: v ?? undefined })}
          />
          <TextInput
            size="md"
            type="date"
            label="Окно с"
            value={raw('from') ?? ''}
            onChange={(e) => set({ from: e.currentTarget.value || undefined })}
          />
          <TextInput
            size="md"
            type="date"
            label="по"
            value={raw('to') ?? ''}
            onChange={(e) => set({ to: e.currentTarget.value || undefined })}
          />
          <Stack gap={6} justify="flex-end">
            <Switch
              label="Только срочные"
              checked={raw('urgency') === 'URGENT'}
              onChange={(e) => set({ urgency: e.currentTarget.checked ? 'URGENT' : undefined })}
            />
            <Switch
              label="Только просроченные"
              checked={raw('overdue') === '1'}
              onChange={(e) => set({ overdue: e.currentTarget.checked ? '1' : undefined })}
            />
          </Stack>
          <Group align="flex-end">
            <Button
              variant="subtle"
              size="md"
              onClick={() => {
                setQ('');
                set({
                  status: undefined,
                  districtId: undefined,
                  categoryId: undefined,
                  urgency: undefined,
                  overdue: undefined,
                  unassigned: undefined,
                  q: undefined,
                  from: undefined,
                  to: undefined,
                });
              }}
            >
              Сбросить фильтры
            </Button>
          </Group>
        </SimpleGrid>
      </Paper>

      {query.isPending ? (
        <LoadingBlock />
      ) : query.error || !query.data ? (
        <ErrorBlock error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length ? (
        <>
          <Text c="dimmed">Найдено: {query.data.total}</Text>
          <Paper withBorder radius="md">
            <Table.ScrollContainer minWidth={900}>
              <Table striped highlightOnHover verticalSpacing="sm" fz="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Заявка</Table.Th>
                    <Table.Th>Получатель</Table.Th>
                    <Table.Th>Район</Table.Th>
                    <Table.Th>Когда</Table.Th>
                    <Table.Th>Статус</Table.Th>
                    <Table.Th>Волонтёр</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {query.data.items.map((t) => {
                    const overdue =
                      ['ASSIGNED', 'IN_PROGRESS'].includes(t.status) &&
                      new Date(t.windowEnd) < new Date();
                    return (
                      <Table.Tr key={t.id}>
                        <Table.Td>
                          <Group gap={6} wrap="nowrap">
                            {t.urgency === 'URGENT' && (
                              <Badge color="red" c="red.9" size="sm">
                                Срочно
                              </Badge>
                            )}
                            <Anchor component={Link} href={`/coord/tasks/${t.id}`} fw={600}>
                              {t.title}
                            </Anchor>
                          </Group>
                          <Text size="sm" c="dimmed">
                            {t.category.name}
                          </Text>
                        </Table.Td>
                        <Table.Td>{shortName(t.recipient)}</Table.Td>
                        <Table.Td>{t.district.name}</Table.Td>
                        <Table.Td>
                          {formatWindow(t.windowStart, t.windowEnd)}
                          {overdue && (
                            <Group gap={4} c="red.8">
                              <IconClock size={16} aria-hidden />
                              <Text size="sm" fw={600}>
                                просрочена
                              </Text>
                            </Group>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <StatusBadge status={t.status} size="md" />
                        </Table.Td>
                        <Table.Td>
                          {t.volunteer ? shortName(t.volunteer) : <Text c="dimmed">—</Text>}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
          {query.data.total > query.data.limit && (
            <Pagination
              total={Math.ceil(query.data.total / query.data.limit)}
              value={query.data.page}
              onChange={(p) => set({ page: String(p) })}
              size="lg"
              getControlProps={(c) => ({
                'aria-label':
                  c === 'previous'
                    ? 'Предыдущая страница'
                    : c === 'next'
                      ? 'Следующая страница'
                      : c,
              })}
            />
          )}
        </>
      ) : (
        <EmptyState title="Заявок не найдено" text="Измените или сбросьте фильтры" />
      )}
    </Stack>
  );
}

// ───────────── Волонтёры ─────────────

const VOLUNTEER_TABS: Array<{ value: VerificationStatus; label: string }> = [
  { value: 'PENDING', label: 'На проверке' },
  { value: 'VERIFIED', label: 'Активные' },
  { value: 'BLOCKED', label: 'Заблокированные' },
  { value: 'REJECTED', label: 'Отклонённые' },
];

export function VolunteersTabs() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get('tab') as VerificationStatus) ?? 'PENDING';
  const [q, setQ] = useState('');
  const [debouncedQ] = useDebouncedValue(q, 400);
  const [page, setPage] = useState(1);
  const query = useVolunteers({
    status: tab,
    q: debouncedQ || undefined,
    page,
    limit: 25,
    sort: tab === 'VERIFIED' ? 'rating' : 'createdAt',
  });

  return (
    <Stack gap="md">
      <Tabs
        value={tab}
        onChange={(v) => {
          setPage(1);
          router.replace(`/coord/volunteers?tab=${v}`);
        }}
      >
        <Tabs.List>
          {VOLUNTEER_TABS.map((t) => (
            <Tabs.Tab key={t.value} value={t.value} fz="md">
              {t.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
      <TextInput
        size="md"
        maw={420}
        label="Поиск"
        placeholder="ФИО или телефон"
        leftSection={<IconSearch size={18} aria-hidden />}
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
      />
      {query.isPending ? (
        <LoadingBlock />
      ) : query.data?.items.length ? (
        <Paper withBorder radius="md">
          <Table.ScrollContainer minWidth={760}>
            <Table striped highlightOnHover verticalSpacing="sm" fz="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Волонтёр</Table.Th>
                  <Table.Th>Телефон</Table.Th>
                  <Table.Th>Районы</Table.Th>
                  <Table.Th>Рейтинг</Table.Th>
                  <Table.Th>Выполнено</Table.Th>
                  <Table.Th>Зарегистрирован</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {query.data.items.map((v) => (
                  <Table.Tr key={v.id}>
                    <Table.Td>
                      <Anchor component={Link} href={`/coord/volunteers/${v.id}`} fw={600}>
                        {v.lastName} {v.firstName}
                      </Anchor>
                      {v.hasCar && (
                        <Text size="sm" c="dimmed">
                          есть машина
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>{formatPhone(v.phone)}</Table.Td>
                    <Table.Td>{v.districts.map((d) => d.name).join(', ') || '—'}</Table.Td>
                    <Table.Td>{v.ratingAvg ? v.ratingAvg.toFixed(2) : '—'}</Table.Td>
                    <Table.Td>{v.tasksDone}</Table.Td>
                    <Table.Td>{formatDateTime(v.createdAt)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      ) : (
        <EmptyState
          title="Никого нет"
          text={tab === 'PENDING' ? 'Новых волонтёров на проверку нет' : undefined}
        />
      )}
      {query.data && query.data.total > query.data.limit && (
        <Pagination
          total={Math.ceil(query.data.total / query.data.limit)}
          value={page}
          onChange={setPage}
          size="lg"
        />
      )}
    </Stack>
  );
}

/** Статус проверки бейджем — используется на карточке волонтёра. */
export function VerificationBadge({ status }: { status: VerificationStatus | null | undefined }) {
  if (!status) return null;
  const s = VERIFICATION_STATUS[status];
  return (
    <Badge color={s.color} c={`${s.color}.9`} size="xl">
      {s.label}
    </Badge>
  );
}

// ───────────── Получатели ─────────────

export function RecipientsList() {
  const [q, setQ] = useState('');
  const [debouncedQ] = useDebouncedValue(q, 400);
  const [page, setPage] = useState(1);
  const query = useRecipients(debouncedQ, page);
  return (
    <Stack gap="md">
      <TextInput
        size="md"
        maw={420}
        label="Поиск по ФИО или телефону"
        leftSection={<IconSearch size={18} aria-hidden />}
        value={q}
        onChange={(e) => {
          setQ(e.currentTarget.value);
          setPage(1);
        }}
      />
      {query.isPending ? (
        <LoadingBlock />
      ) : query.data?.items.length ? (
        <Paper withBorder radius="md">
          <Table.ScrollContainer minWidth={760}>
            <Table striped highlightOnHover verticalSpacing="sm" fz="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Получатель</Table.Th>
                  <Table.Th>Телефон</Table.Th>
                  <Table.Th>Адрес</Table.Th>
                  <Table.Th>Активных заявок</Table.Th>
                  <Table.Th>Вход на сайт</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {query.data.items.map((r) => (
                  <Table.Tr key={r.id}>
                    <Table.Td>
                      <Anchor component={Link} href={`/coord/recipients/${r.id}`} fw={600}>
                        {r.lastName} {r.firstName} {r.middleName ?? ''}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>{formatPhone(r.phone)}</Table.Td>
                    <Table.Td>
                      {r.defaultAddress
                        ? `${r.defaultAddress.district.name}, ${r.defaultAddress.street}, ${r.defaultAddress.house}`
                        : '—'}
                    </Table.Td>
                    <Table.Td>{r.activeTasks}</Table.Td>
                    <Table.Td>{r.canLogin ? 'да' : 'нет, заявки по телефону'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      ) : (
        <EmptyState title="Никого не нашли" />
      )}
      {query.data && query.data.total > query.data.limit && (
        <Pagination
          total={Math.ceil(query.data.total / query.data.limit)}
          value={page}
          onChange={setPage}
          size="lg"
        />
      )}
    </Stack>
  );
}

// ───────────── Отчёты (ReportsPanel) ─────────────

/**
 * Упорядоченные горизонтальные полосы одного цвета + цифры в столбце.
 * Это и график, и таблица: значения читаются без цвета, порядок — по убыванию.
 */
function BarTable({
  caption,
  rows,
  valueLabel,
}: {
  caption: string;
  rows: Array<{ label: string; value: number; extra?: string }>;
  valueLabel: string;
}) {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...sorted.map((r) => r.value));
  return (
    <Table verticalSpacing={6} fz="md" className={classes.barTable}>
      <caption className={classes.caption}>{caption}</caption>
      <Table.Thead>
        <Table.Tr>
          <Table.Th scope="col">Название</Table.Th>
          <Table.Th scope="col" w="45%">
            <VisuallyHidden>Доля</VisuallyHidden>
          </Table.Th>
          <Table.Th scope="col" ta="right">
            {valueLabel}
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {sorted.map((r) => (
          <Table.Tr key={r.label} title={`${r.label}: ${r.value}${r.extra ? `, ${r.extra}` : ''}`}>
            <Table.Td>{r.label}</Table.Td>
            <Table.Td aria-hidden>
              {r.value > 0 && (
                <Box className={classes.bar} style={{ width: `${(r.value / max) * 100}%` }} />
              )}
            </Table.Td>
            <Table.Td ta="right" className={classes.num}>
              {r.value}
              {r.extra && (
                <Text span c="dimmed" size="sm">
                  {' '}
                  · {r.extra}
                </Text>
              )}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function minutesLabel(min: number | null): string {
  if (min === null) return '—';
  if (min < 1) return 'меньше минуты';
  if (min < 60) return `${Math.round(min)} мин`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

const PERIODS = [
  { value: '7', label: '7 дней' },
  { value: '30', label: '30 дней' },
  { value: '90', label: '90 дней' },
];

export function ReportsPanel() {
  const [days, setDays] = useState('30');
  const today = todayYmd();
  const from = localToIso(addDaysYmd(today, -Number(days) + 1), '00:00');
  const to = localToIso(addDaysYmd(today, 1), '00:00');
  const report = useReport(from, to);
  const categories = useCategories();

  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="wrap">
        <SegmentedControl value={days} onChange={setDays} data={PERIODS} aria-label="Период" />
        {report.data && (
          <Text c="dimmed">
            {formatDateTime(report.data.period.from)} — {formatDateTime(report.data.period.to)}
          </Text>
        )}
      </Group>

      {report.isPending ? (
        <LoadingBlock />
      ) : report.error || !report.data ? (
        <ErrorBlock error={report.error} onRetry={() => report.refetch()} />
      ) : (
        (() => {
          const r = report.data;
          const rate = r.tasks.completionRate;
          return (
            <>
              <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
                <StatTile label="Создано заявок" value={r.tasks.total} />
                <Paper withBorder p="md" radius="md">
                  <Stack gap={6}>
                    <Text c="dimmed" fw={600}>
                      Доля выполненных
                    </Text>
                    <Text fz="2rem" fw={700} lh={1.1}>
                      {rate === null ? '—' : `${rate}%`}
                    </Text>
                    {/* Meter: заливка и фон — один оттенок */}
                    <Progress
                      value={rate ?? 0}
                      color="brand.6"
                      size="md"
                      radius="xl"
                      classNames={{ root: classes.meterTrack }}
                      aria-label={`Выполнено ${rate ?? 0}%`}
                    />
                    <Text size="sm" c="dimmed">
                      {r.tasks.completed} из {r.tasks.total}
                      {r.tasks.completionRateOfClosed !== null
                        ? ` · среди закрытых ${r.tasks.completionRateOfClosed}%`
                        : ''}
                    </Text>
                  </Stack>
                </Paper>
                <StatTile
                  label="Среднее время до отклика"
                  value={minutesLabel(r.timing.avgResponseMinutes)}
                  note={`выполнение — ${minutesLabel(r.timing.avgCompletionMinutes)}`}
                />
                <Paper withBorder p="md" radius="md">
                  <Stack gap={4}>
                    <Text c="dimmed" fw={600}>
                      Средняя оценка
                    </Text>
                    <Text fz="2rem" fw={700} lh={1.1}>
                      {r.reviews.avgRating?.toFixed(2) ?? '—'}
                    </Text>
                    {r.reviews.avgRating !== null && (
                      <Rating value={r.reviews.avgRating} fractions={4} readOnly aria-hidden />
                    )}
                    <Text size="sm" c="dimmed">
                      отзывов: {r.reviews.count}
                    </Text>
                  </Stack>
                </Paper>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                <Paper withBorder p="md" radius="md">
                  <BarTable
                    caption="Заявки по видам помощи"
                    valueLabel="Заявок"
                    rows={r.tasks.byCategory.map((c) => ({
                      label: categories.data?.find((x) => x.id === c.categoryId)?.name ?? c.name,
                      value: c.total,
                    }))}
                  />
                </Paper>
                <Paper withBorder p="md" radius="md">
                  <BarTable
                    caption="Заявки по районам"
                    valueLabel="Заявок"
                    rows={r.tasks.byDistrict.map((d) => ({
                      label: d.name,
                      value: d.total,
                      extra: `выполнено ${d.completed}`,
                    }))}
                  />
                </Paper>
                <Paper withBorder p="md" radius="md">
                  <BarTable
                    caption="Заявки по статусам"
                    valueLabel="Заявок"
                    rows={(Object.keys(r.tasks.byStatus) as TaskStatus[]).map((s) => ({
                      label: TASK_STATUS[s].label,
                      value: r.tasks.byStatus[s],
                    }))}
                  />
                </Paper>
                <Paper withBorder p="md" radius="md">
                  <Table verticalSpacing={6} fz="md">
                    <caption className={classes.caption}>Пользователи</caption>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th scope="col">Роль</Table.Th>
                        <Table.Th scope="col" ta="right">
                          Всего активных
                        </Table.Th>
                        <Table.Th scope="col" ta="right">
                          Новых за период
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {(Object.keys(r.users.activeByRole) as Role[]).map((role) => (
                        <Table.Tr key={role}>
                          <Table.Td>{ROLE_LABEL[role]}</Table.Td>
                          <Table.Td ta="right" className={classes.num}>
                            {r.users.activeByRole[role]}
                          </Table.Td>
                          <Table.Td ta="right" className={classes.num}>
                            {r.users.newByRole[role]}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                  <Text size="sm" c="dimmed" mt="sm">
                    Проверенных волонтёров: {r.users.volunteersVerified}, брали заявки за период:{' '}
                    {r.users.volunteersActiveInPeriod}
                  </Text>
                </Paper>
              </SimpleGrid>
            </>
          );
        })()
      )}
    </Stack>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Title order={2} size="h3" mb="sm">
      {children}
    </Title>
  );
}

export { PendingVolunteers, RecentTasks, WeekChart } from './overview';
