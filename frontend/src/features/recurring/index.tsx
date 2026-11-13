'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Chip,
  Group,
  NumberInput,
  Paper,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { addressLine, useAddresses } from '@/entities/address';
import { CATEGORY_DEFAULT_TITLE, categoryHasList, useCategories } from '@/entities/category';
import { recurringKeys } from '@/entities/recurring';
import { api } from '@/shared/api/client';
import { getErrorMessage } from '@/shared/api/errors';
import type { Frequency, PaymentMethod, S } from '@/shared/api/types';
import { FREQUENCY, PAYMENT_METHOD, WEEKDAYS } from '@/shared/config/dictionaries';
import { DAY_PARTS, type DayPart, todayYmd } from '@/shared/lib/date';
import { LoadingBlock, confirmAction } from '@/shared/ui';
import { ShoppingListEditor } from '../create-task';

type Rule = S['RecurringRuleDto'];

/** «Каждую неделю: вт, чт · 10:00–13:00» */
export function describeSchedule(
  rule: Pick<Rule, 'frequency' | 'daysOfWeek' | 'dayOfMonth' | 'timeFrom' | 'timeTo'>,
): string {
  const time = `${rule.timeFrom}–${rule.timeTo}`;
  if (rule.frequency === 'MONTHLY')
    return `${FREQUENCY.MONTHLY}, ${rule.dayOfMonth}-го числа · ${time}`;
  const days = WEEKDAYS.filter((d) => rule.daysOfWeek.includes(d.value)).map((d) =>
    d.short.toLowerCase(),
  );
  return `${FREQUENCY[rule.frequency]}: ${days.join(', ')} · ${time}`;
}

const schema = z
  .object({
    categoryId: z.string().min(1, 'Выберите, что нужно'),
    title: z.string().trim().min(1, 'Напишите, что нужно сделать').max(200),
    description: z.string().max(2000).optional(),
    items: z.array(z.object({ name: z.string(), quantity: z.string() })),
    frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']),
    daysOfWeek: z.array(z.number()),
    dayOfMonth: z.number().int().min(1).max(28).optional(),
    part: z.enum(['morning', 'day', 'evening']),
    startsOn: z.string().min(1, 'Укажите, с какого дня'),
    endsOn: z.string().optional(),
    addressId: z.string().min(1, 'Выберите адрес'),
    paymentMethod: z.enum(['CASH_ON_DELIVERY', 'TRANSFER', 'PREPAID', 'NONE']),
    estimatedCost: z.number().min(0).optional(),
  })
  .refine((v) => v.frequency === 'MONTHLY' || v.daysOfWeek.length > 0, {
    path: ['daysOfWeek'],
    message: 'Выберите хотя бы один день недели',
  })
  .refine((v) => v.frequency !== 'MONTHLY' || !!v.dayOfMonth, {
    path: ['dayOfMonth'],
    message: 'Укажите число месяца',
  })
  .refine((v) => !v.endsOn || v.endsOn >= v.startsOn, {
    path: ['endsOn'],
    message: 'Окончание раньше начала',
  });
type Values = z.infer<typeof schema>;

function partFromTime(from: string): DayPart {
  return (Object.keys(DAY_PARTS) as DayPart[]).find((p) => DAY_PARTS[p].from === from) ?? 'morning';
}

/** RecurringRuleForm — те же вопросы, что в заявке, плюс дни недели и период. */
export function RecurringRuleForm({
  recipientId,
  rule,
  basePath,
}: {
  recipientId?: string;
  rule?: Rule;
  basePath: string;
}) {
  const categories = useCategories();
  const addresses = useAddresses(recipientId ?? rule?.recipientId);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: rule ? String(rule.categoryId) : '',
      title: rule?.title ?? '',
      description: rule?.description ?? '',
      items: rule?.itemsTemplate.length
        ? rule.itemsTemplate.map((i) => ({ name: i.name, quantity: i.quantity ?? '' }))
        : [{ name: '', quantity: '' }],
      frequency: rule?.frequency ?? 'WEEKLY',
      daysOfWeek: rule?.daysOfWeek ?? [],
      dayOfMonth: rule?.dayOfMonth ?? undefined,
      part: rule ? partFromTime(rule.timeFrom) : 'morning',
      startsOn: rule?.startsOn ?? todayYmd(),
      endsOn: rule?.endsOn ?? '',
      addressId: rule?.addressId ?? '',
      paymentMethod: rule?.paymentMethod ?? 'NONE',
      estimatedCost: rule?.estimatedCost ?? undefined,
    },
  });
  const errors = form.formState.errors;
  const values = form.watch();
  const category = categories.data?.find((c) => String(c.id) === values.categoryId);

  // Основной адрес по умолчанию
  useEffect(() => {
    if (form.getValues('addressId') || !addresses.data?.length) return;
    const def = addresses.data.find((a) => a.isDefault) ?? addresses.data[0];
    form.setValue('addressId', def.id);
  }, [addresses.data, form]);

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    const part = DAY_PARTS[v.part];
    const needsMoney = category?.needsMoney ?? false;
    const body = {
      categoryId: Number(v.categoryId),
      addressId: v.addressId,
      title: v.title,
      description: v.description || undefined,
      itemsTemplate: v.items
        .filter((i) => i.name.trim())
        .map((i) => ({ name: i.name.trim(), quantity: i.quantity.trim() || undefined })),
      frequency: v.frequency,
      daysOfWeek: v.frequency === 'MONTHLY' ? undefined : v.daysOfWeek,
      dayOfMonth: v.frequency === 'MONTHLY' ? v.dayOfMonth : undefined,
      timeFrom: part.from,
      timeTo: part.to,
      startsOn: v.startsOn,
      endsOn: v.endsOn || null,
      paymentMethod: needsMoney ? v.paymentMethod : 'NONE',
      estimatedCost: needsMoney ? v.estimatedCost : undefined,
    } satisfies S['UpdateRecurringRuleDto'];
    try {
      if (rule) await api.patch(`/recurring-rules/${rule.id}`, body);
      else
        await api.post('/recurring-rules', {
          ...body,
          recipientId,
        } satisfies S['CreateRecurringRuleDto']);
      await queryClient.invalidateQueries({ queryKey: ['recurring'] });
      notifications.show({
        color: 'green',
        title: rule ? 'Изменения сохранены' : 'Регулярное поручение создано',
        message: 'Заявки будут появляться сами за несколько дней до нужной даты.',
      });
      router.push(`${basePath}/recurring`);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  if (categories.isPending || addresses.isPending) return <LoadingBlock />;

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack gap="lg">
        <Controller
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <Select
              label="Что нужно"
              data={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
              value={field.value || null}
              onChange={(v) => {
                field.onChange(v ?? '');
                const c = categories.data?.find((x) => String(x.id) === v);
                if (c && !form.getValues('title'))
                  form.setValue('title', CATEGORY_DEFAULT_TITLE[c.code] ?? c.name);
                if (c && !c.needsMoney) form.setValue('paymentMethod', 'NONE');
                if (c?.needsMoney && form.getValues('paymentMethod') === 'NONE')
                  form.setValue('paymentMethod', 'CASH_ON_DELIVERY');
              }}
              error={errors.categoryId?.message}
              allowDeselect={false}
            />
          )}
        />
        <TextInput
          label="Коротко: что сделать"
          {...form.register('title')}
          error={errors.title?.message}
        />
        {categoryHasList(category?.code) && (
          <Stack gap="xs">
            <Text fw={700} size="lg">
              Список (будет в каждой заявке)
            </Text>
            <Controller
              control={form.control}
              name="items"
              render={({ field }) => (
                <ShoppingListEditor items={field.value} onChange={field.onChange} />
              )}
            />
          </Stack>
        )}
        <Textarea
          label="Что ещё важно знать"
          description="Необязательно"
          {...form.register('description')}
        />

        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Text fw={700} size="lg">
              Как часто
            </Text>
            <Controller
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <SegmentedControl
                  fullWidth
                  value={field.value}
                  onChange={(v) => field.onChange(v as Frequency)}
                  data={(Object.keys(FREQUENCY) as Frequency[]).map((f) => ({
                    value: f,
                    label: FREQUENCY[f],
                  }))}
                  aria-label="Как часто"
                />
              )}
            />
            {values.frequency === 'MONTHLY' ? (
              <Controller
                control={form.control}
                name="dayOfMonth"
                render={({ field }) => (
                  <NumberInput
                    label="Какого числа"
                    description="С 1 по 28 — такие числа есть в каждом месяце"
                    min={1}
                    max={28}
                    allowDecimal={false}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(typeof v === 'number' ? v : undefined)}
                    error={errors.dayOfMonth?.message}
                  />
                )}
              />
            ) : (
              <Controller
                control={form.control}
                name="daysOfWeek"
                render={({ field }) => (
                  <Stack gap={6}>
                    <Text fw={600} id="days-label">
                      По каким дням
                    </Text>
                    <Chip.Group
                      multiple
                      value={field.value.map(String)}
                      onChange={(v) => field.onChange(v.map(Number).sort())}
                    >
                      <Group gap="xs" role="group" aria-labelledby="days-label">
                        {WEEKDAYS.map((d) => (
                          <Chip key={d.value} value={String(d.value)} size="lg" aria-label={d.long}>
                            {d.short}
                          </Chip>
                        ))}
                      </Group>
                    </Chip.Group>
                    {errors.daysOfWeek && (
                      <Text c="red.8" role="alert">
                        {errors.daysOfWeek.message}
                      </Text>
                    )}
                  </Stack>
                )}
              />
            )}
            <Controller
              control={form.control}
              name="part"
              render={({ field }) => (
                <Stack gap={6}>
                  <Text fw={600} id="part-label">
                    Время
                  </Text>
                  <SimpleGrid cols={{ base: 1, xs: 3 }} role="group" aria-labelledby="part-label">
                    {(Object.keys(DAY_PARTS) as DayPart[]).map((p) => (
                      <Button
                        key={p}
                        variant={field.value === p ? 'filled' : 'default'}
                        onClick={() => field.onChange(p)}
                        aria-pressed={field.value === p}
                      >
                        {DAY_PARTS[p].label} {DAY_PARTS[p].from}–{DAY_PARTS[p].to}
                      </Button>
                    ))}
                  </SimpleGrid>
                </Stack>
              )}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                type="date"
                label="Начать с"
                {...form.register('startsOn')}
                error={errors.startsOn?.message}
              />
              <TextInput
                type="date"
                label="Закончить"
                description="Необязательно"
                {...form.register('endsOn')}
                error={errors.endsOn?.message}
              />
            </SimpleGrid>
          </Stack>
        </Paper>

        <Controller
          control={form.control}
          name="addressId"
          render={({ field }) => (
            <Select
              label="Адрес"
              data={(addresses.data ?? []).map((a) => ({
                value: a.id,
                label: `${a.label ? `${a.label}: ` : ''}${addressLine(a)}`,
              }))}
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? '')}
              error={
                errors.addressId?.message ??
                (!addresses.data?.length ? 'Сначала добавьте адрес в профиле' : undefined)
              }
              allowDeselect={false}
            />
          )}
        />

        {category?.needsMoney && (
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Controller
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <Select
                  label="Как оплатить"
                  data={(['CASH_ON_DELIVERY', 'TRANSFER', 'PREPAID'] as PaymentMethod[]).map(
                    (m) => ({
                      value: m,
                      label: PAYMENT_METHOD[m].label,
                    }),
                  )}
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? 'CASH_ON_DELIVERY')}
                  allowDeselect={false}
                />
              )}
            />
            <Controller
              control={form.control}
              name="estimatedCost"
              render={({ field }) => (
                <NumberInput
                  label="Примерная сумма"
                  suffix=" ₽"
                  min={0}
                  thousandSeparator=" "
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(typeof v === 'number' ? v : undefined)}
                />
              )}
            />
          </SimpleGrid>
        )}

        {error && (
          <Alert color="red" c="red.9" role="alert">
            {error}
          </Alert>
        )}
        <Group justify="space-between">
          <Button variant="default" size="xl" onClick={() => router.push(`${basePath}/recurring`)}>
            Назад
          </Button>
          <Button type="submit" size="xl" loading={form.formState.isSubmitting}>
            {rule ? 'Сохранить' : 'Создать'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Переключатель «на паузе» и удаление правила. */
export function RecurringRuleControls({ rule }: { rule: Rule }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['recurring'] });
  const toggle = useMutation({
    mutationFn: (isActive: boolean) =>
      api.patch(`/recurring-rules/${rule.id}`, { isActive } satisfies S['UpdateRecurringRuleDto']),
    onSuccess: (_d, isActive) => {
      void refresh();
      notifications.show({
        color: 'green',
        message: isActive ? 'Поручение снова работает' : 'Поручение на паузе',
      });
    },
    onError: (e) => notifications.show({ color: 'red', message: getErrorMessage(e) }),
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/recurring-rules/${rule.id}`),
    onSuccess: () => {
      void queryClient.removeQueries({ queryKey: recurringKeys.detail(rule.id) });
      void refresh();
      notifications.show({ color: 'green', message: 'Регулярное поручение удалено' });
    },
    onError: (e) => notifications.show({ color: 'red', message: getErrorMessage(e) }),
  });
  return (
    <Group gap="md" wrap="wrap">
      <Switch
        size="lg"
        checked={rule.isActive}
        disabled={toggle.isPending}
        onChange={(e) => toggle.mutate(e.currentTarget.checked)}
        label={rule.isActive ? 'Работает' : 'На паузе'}
      />
      <Button
        variant="subtle"
        color="red"
        size="md"
        loading={remove.isPending}
        onClick={() =>
          confirmAction({
            title: 'Удалить регулярное поручение?',
            message: 'Новые заявки по нему больше не будут создаваться. Уже созданные останутся.',
            confirmLabel: 'Да, удалить',
            danger: true,
            onConfirm: () => remove.mutate(),
          })
        }
      >
        Удалить
      </Button>
    </Group>
  );
}
