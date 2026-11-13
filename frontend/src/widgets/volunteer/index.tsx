'use client';

import {
  Alert,
  Button,
  Group,
  Paper,
  Rating,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { IconCircleCheck, IconClock, IconFilter, IconX } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import { useDistricts } from '@/entities/address';
import { useCategories } from '@/entities/category';
import { type CatalogFilters, CatalogTaskCard, useCatalog } from '@/entities/task';
import { useVolunteerHistory } from '@/entities/volunteer';
import type { S } from '@/shared/api/types';
import { VERIFICATION_STATUS } from '@/shared/config/dictionaries';
import { formatDateTime } from '@/shared/lib/date';
import { EmptyState, ErrorBlock, LoadingBlock, QueryState, StatusBadge } from '@/shared/ui';

const ALL = 'all';
const MINE = 'mine';

/** TaskFilters + TaskCatalog: только открытые заявки, срочные сверху, обновление раз в 30 с. */
export function TaskCatalog() {
  const districts = useDistricts();
  const categories = useCategories();
  const [district, setDistrict] = useState<string>(MINE);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState<string>('any');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [money, setMoney] = useState<string>('any');
  const [view, setView] = useState('list');

  const filters: CatalogFilters = {
    allDistricts: district === ALL || undefined,
    districtIds: district !== ALL && district !== MINE ? [Number(district)] : undefined,
    categoryId: categoryId ? Number(categoryId) : undefined,
    date: date === 'any' ? undefined : (date as CatalogFilters['date']),
    urgency: urgentOnly ? 'URGENT' : undefined,
    needsMoney: money === 'any' ? undefined : money === 'yes',
  };
  const catalog = useCatalog(filters);
  const items = catalog.data?.pages.flatMap((p) => p.items) ?? [];
  const total = catalog.data?.pages[0]?.total ?? 0;
  const narrowed =
    district !== ALL || !!categoryId || date !== 'any' || urgentOnly || money !== 'any';

  const reset = () => {
    setDistrict(ALL);
    setCategoryId(null);
    setDate('any');
    setUrgentOnly(false);
    setMoney('any');
  };

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md">
        <Stack gap="sm">
          <Group gap="xs">
            <IconFilter size={20} aria-hidden />
            <Text fw={700}>Фильтры</Text>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label="Район"
              value={district}
              onChange={(v) => setDistrict(v ?? MINE)}
              allowDeselect={false}
              data={[
                { value: MINE, label: 'Мои районы' },
                { value: ALL, label: 'Все районы' },
                ...(districts.data ?? []).map((d) => ({ value: String(d.id), label: d.name })),
              ]}
            />
            <Select
              label="Что нужно"
              placeholder="Любая помощь"
              clearable
              value={categoryId}
              onChange={setCategoryId}
              data={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
            />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="xs" role="group" aria-label="Когда">
            {[
              { value: 'any', label: 'Все дни' },
              { value: 'today', label: 'Сегодня' },
              { value: 'tomorrow', label: 'Завтра' },
              { value: 'week', label: 'Неделя' },
            ].map((d) => (
              <Button
                key={d.value}
                size="md"
                variant={date === d.value ? 'filled' : 'default'}
                aria-pressed={date === d.value}
                onClick={() => setDate(d.value)}
              >
                {d.label}
              </Button>
            ))}
          </SimpleGrid>
          <Group gap="lg" wrap="wrap">
            <Switch
              checked={urgentOnly}
              onChange={(e) => setUrgentOnly(e.currentTarget.checked)}
              label="Только срочные"
            />
            <Select
              aria-label="Свои деньги"
              size="md"
              value={money}
              onChange={(v) => setMoney(v ?? 'any')}
              allowDeselect={false}
              data={[
                { value: 'any', label: 'Деньги: неважно' },
                { value: 'yes', label: 'Нужны свои деньги на покупку' },
                { value: 'no', label: 'Без своих денег' },
              ]}
            />
          </Group>
          {/* Место под карту: появится, если команда подключит карты */}
          <SegmentedControl
            value={view}
            onChange={setView}
            aria-label="Вид"
            data={[
              { value: 'list', label: 'Список' },
              { value: 'map', label: 'Карта (скоро)', disabled: true },
            ]}
            style={{ alignSelf: 'flex-start' }}
          />
        </Stack>
      </Paper>

      <Text c="dimmed" aria-live="polite">
        {catalog.isPending ? 'Ищем заявки…' : `Найдено: ${total}. Список обновляется сам`}
      </Text>

      {catalog.isPending ? (
        <LoadingBlock />
      ) : catalog.error ? (
        <ErrorBlock error={catalog.error} onRetry={() => catalog.refetch()} />
      ) : items.length ? (
        <Stack gap="sm">
          {items.map((t) => (
            <CatalogTaskCard key={t.id} task={t} href={`/volunteer/tasks/${t.id}`} />
          ))}
          {catalog.hasNextPage && (
            <Button
              variant="light"
              size="lg"
              loading={catalog.isFetchingNextPage}
              onClick={() => catalog.fetchNextPage()}
            >
              Показать ещё
            </Button>
          )}
        </Stack>
      ) : (
        <EmptyState
          title="Подходящих заявок нет"
          text={
            narrowed
              ? 'Попробуйте расширить фильтры — например, выбрать все районы'
              : 'Сейчас все заявки разобраны. Загляните позже'
          }
          action={
            narrowed && (
              <Button variant="light" leftSection={<IconX aria-hidden />} onClick={reset}>
                Сбросить фильтры
              </Button>
            )
          }
        />
      )}
    </Stack>
  );
}

/** Статус проверки волонтёра и что делать дальше (/volunteer/pending). */
export function VerificationStatusCard({ profile }: { profile: S['VolunteerProfileDto'] }) {
  const status = VERIFICATION_STATUS[profile.verificationStatus];
  const hasDistricts = profile.districts.length > 0;
  return (
    <Stack gap="md">
      <Paper withBorder p="lg" radius="md">
        <Stack gap="sm">
          <Group gap="sm">
            {profile.verificationStatus === 'VERIFIED' ? (
              <IconCircleCheck size={36} color="var(--mantine-color-green-8)" aria-hidden />
            ) : (
              <IconClock size={36} color="var(--mantine-color-yellow-8)" aria-hidden />
            )}
            <Title order={2}>{status.label}</Title>
          </Group>
          {profile.verificationStatus === 'PENDING' && (
            <Text size="lg">
              Координатор проверит вашу анкету и позвонит. Обычно это занимает 1–2 рабочих дня.
              После проверки вы увидите заявки и сможете их брать.
            </Text>
          )}
          {profile.verificationStatus === 'VERIFIED' && (
            <Button
              component={Link}
              href="/volunteer/catalog"
              size="lg"
              style={{ alignSelf: 'flex-start' }}
            >
              Перейти к заявкам
            </Button>
          )}
          {(profile.verificationStatus === 'REJECTED' ||
            profile.verificationStatus === 'BLOCKED') && (
            <Alert color="red" c="red.9">
              {profile.verificationNote
                ? `Причина: ${profile.verificationNote}`
                : 'Свяжитесь с координатором, чтобы узнать подробности.'}
            </Alert>
          )}
        </Stack>
      </Paper>
      {profile.verificationStatus === 'PENDING' && (
        <Paper withBorder p="lg" radius="md">
          <Stack gap="xs">
            <Title order={3}>Пока ждёте</Title>
            <Text>{hasDistricts ? '✓' : '•'} Выберите районы, где готовы помогать</Text>
            <Text>{profile.about ? '✓' : '•'} Расскажите о себе</Text>
            <Button
              component={Link}
              href="/volunteer/profile"
              variant="light"
              style={{ alignSelf: 'flex-start' }}
            >
              Заполнить профиль
            </Button>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

/** История волонтёра: выполненные, полученные оценки, рейтинг. */
export function VolunteerHistory() {
  const query = useVolunteerHistory();
  return (
    <QueryState query={query}>
      {(h) => (
        <Stack gap="md">
          <Paper withBorder p="lg" radius="md">
            <Group gap="xl" wrap="wrap">
              <Stack gap={2}>
                <Text c="dimmed">Рейтинг</Text>
                <Group gap="xs">
                  <Rating
                    value={h.ratingAvg}
                    fractions={4}
                    readOnly
                    size="lg"
                    aria-label={`Рейтинг ${h.ratingAvg}`}
                  />
                  <Text fw={700} size="xl">
                    {h.ratingAvg ? h.ratingAvg.toFixed(2) : '—'}
                  </Text>
                </Group>
              </Stack>
              <Stack gap={2}>
                <Text c="dimmed">Выполнено заявок</Text>
                <Text fw={700} size="xl">
                  {h.tasksDone}
                </Text>
              </Stack>
            </Group>
          </Paper>
          {h.items.length ? (
            h.items.map((t) => (
              <Paper
                key={t.id}
                withBorder
                p="md"
                radius="md"
                component={Link}
                href={`/volunteer/tasks/${t.id}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                <Stack gap={4}>
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={700}>{t.title}</Text>
                    <StatusBadge status={t.status} size="md" />
                  </Group>
                  <Text c="dimmed">
                    {t.address.district.name} · {t.doneAt ? formatDateTime(t.doneAt) : ''}
                  </Text>
                  {t.reviews.map((r, i) => (
                    <Group key={i} gap="xs">
                      <Rating
                        value={r.rating}
                        readOnly
                        size="sm"
                        aria-label={`Оценка ${r.rating}`}
                      />
                      {r.comment && <Text>«{r.comment}»</Text>}
                    </Group>
                  ))}
                </Stack>
              </Paper>
            ))
          ) : (
            <EmptyState
              title="Выполненных заявок пока нет"
              text="Возьмите первую заявку в каталоге"
            />
          )}
        </Stack>
      )}
    </QueryState>
  );
}
