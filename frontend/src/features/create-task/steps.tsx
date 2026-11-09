'use client';

import {
  ActionIcon,
  Alert,
  Button,
  Group,
  NumberInput,
  Paper,
  Radio,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { AddressView, useAddresses } from '@/entities/address';
import {
  CATEGORY_DEFAULT_TITLE,
  CategoryIcon,
  type Category,
  categoryHasList,
} from '@/entities/category';
import type { PaymentMethod } from '@/shared/api/types';
import { PAYMENT_METHOD } from '@/shared/config/dictionaries';
import {
  DAY_PARTS,
  type DayPart,
  addDaysYmd,
  formatWindow,
  isSlotAvailable,
  slotWindow,
  todayYmd,
} from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/format';
import { IconTile, LoadingBlock } from '@/shared/ui';
import { AddressFormModal } from '../address';
import type { DraftItem, StepId, TaskDraft } from './model';
import { STEP_TITLES } from './model';

export interface StepProps {
  draft: TaskDraft;
  update: (patch: Partial<TaskDraft>) => void;
  categories: Category[];
  recipientId?: string;
}

// ───────────── 1. Что нужно ─────────────

export function CategoryStep({
  draft,
  update,
  categories,
  onPicked,
}: StepProps & { onPicked?: () => void }) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
      {categories.map((c) => (
        <IconTile
          key={c.id}
          icon={<CategoryIcon code={c.code} size={44} />}
          label={c.name}
          selected={draft.categoryId === c.id}
          onClick={() => {
            const prev = categories.find((x) => x.id === draft.categoryId);
            const keepTitle =
              draft.title && draft.title !== CATEGORY_DEFAULT_TITLE[prev?.code ?? ''];
            update({
              categoryId: c.id,
              title: keepTitle ? draft.title : (CATEGORY_DEFAULT_TITLE[c.code] ?? c.name),
              paymentMethod: c.needsMoney ? draft.paymentMethod : 'NONE',
            });
            onPicked?.();
          }}
        />
      ))}
    </SimpleGrid>
  );
}

// ───────────── 2. Подробности и список ─────────────

/** ShoppingListEditor — список покупок или лекарств. */
export function ShoppingListEditor({
  items,
  onChange,
}: {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
}) {
  const set = (i: number, patch: Partial<DraftItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const add = () => onChange([...items, { name: '', quantity: '' }]);
  return (
    <Stack gap="sm">
      {items.map((item, i) => (
        <Group key={i} gap="sm" align="flex-end" wrap="nowrap">
          <TextInput
            style={{ flex: 3 }}
            label={i === 0 ? 'Что купить' : undefined}
            aria-label={`Позиция ${i + 1}`}
            placeholder={i === 0 ? 'Хлеб бородинский' : 'Ещё что-нибудь'}
            value={item.name}
            onChange={(e) => set(i, { name: e.currentTarget.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
          <TextInput
            style={{ flex: 1, minWidth: '5.5rem' }}
            label={i === 0 ? 'Сколько' : undefined}
            aria-label={`Сколько: позиция ${i + 1}`}
            placeholder="2 шт"
            value={item.quantity}
            onChange={(e) => set(i, { quantity: e.currentTarget.value })}
          />
          <ActionIcon
            size={50}
            variant="light"
            color="red"
            aria-label={`Удалить позицию ${i + 1}`}
            disabled={items.length === 1 && !item.name}
            onClick={() =>
              onChange(
                items.length === 1
                  ? [{ name: '', quantity: '' }]
                  : items.filter((_, idx) => idx !== i),
              )
            }
          >
            <IconTrash aria-hidden />
          </ActionIcon>
        </Group>
      ))}
      <Button
        variant="light"
        leftSection={<IconPlus aria-hidden />}
        onClick={add}
        style={{ alignSelf: 'flex-start' }}
      >
        Добавить ещё
      </Button>
    </Stack>
  );
}

export function DetailsStep({ draft, update, categories }: StepProps) {
  const category = categories.find((c) => c.id === draft.categoryId);
  return (
    <Stack gap="lg">
      <TextInput
        label="Коротко: что сделать"
        value={draft.title}
        maxLength={200}
        onChange={(e) => update({ title: e.currentTarget.value })}
      />
      {category?.code === 'escort' && (
        <TextInput
          label="Куда проводить"
          placeholder="Поликлиника №3, ул. Острякова, 5"
          value={draft.destination}
          onChange={(e) => update({ destination: e.currentTarget.value })}
        />
      )}
      {categoryHasList(category?.code) && (
        <Stack gap="xs">
          <Text fw={700} size="lg">
            {category?.code === 'medicine' ? 'Список лекарств' : 'Список покупок'}
          </Text>
          <ShoppingListEditor items={draft.items} onChange={(items) => update({ items })} />
        </Stack>
      )}
      <Textarea
        label="Что ещё важно знать"
        description="Необязательно"
        placeholder="Например: хлеб нарезанный, молоко 2,5%"
        value={draft.description}
        onChange={(e) => update({ description: e.currentTarget.value })}
      />
    </Stack>
  );
}

// ───────────── 3. Когда ─────────────

/** TimeStep — кнопки «Сегодня / Завтра / Дата» + «Утро / День / Вечер» вместо календаря. */
export function TimeStep({ draft, update }: StepProps) {
  const today = todayYmd();
  const tomorrow = addDaysYmd(today, 1);
  const [otherDay, setOtherDay] = useState(
    !!draft.ymd && draft.ymd !== today && draft.ymd !== tomorrow,
  );

  const pickDay = (ymd: string) => {
    const part = draft.part && isSlotAvailable(ymd, draft.part) ? draft.part : undefined;
    update({ ymd, part });
  };

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Text fw={700} size="lg" id="day-label">
          День
        </Text>
        <SimpleGrid cols={3} role="group" aria-labelledby="day-label">
          <Button
            variant={draft.ymd === today && !otherDay ? 'filled' : 'default'}
            onClick={() => {
              setOtherDay(false);
              pickDay(today);
            }}
            aria-pressed={draft.ymd === today && !otherDay}
          >
            Сегодня
          </Button>
          <Button
            variant={draft.ymd === tomorrow && !otherDay ? 'filled' : 'default'}
            onClick={() => {
              setOtherDay(false);
              pickDay(tomorrow);
            }}
            aria-pressed={draft.ymd === tomorrow && !otherDay}
          >
            Завтра
          </Button>
          <Button
            variant={otherDay ? 'filled' : 'default'}
            onClick={() => {
              setOtherDay(true);
              if (!draft.ymd || draft.ymd === today || draft.ymd === tomorrow)
                update({ ymd: addDaysYmd(today, 2) });
            }}
            aria-pressed={otherDay}
          >
            Другой день
          </Button>
        </SimpleGrid>
        {otherDay && (
          <TextInput
            type="date"
            label="Дата"
            min={today}
            max={addDaysYmd(today, 30)}
            value={draft.ymd ?? ''}
            onChange={(e) => e.currentTarget.value && pickDay(e.currentTarget.value)}
          />
        )}
      </Stack>

      <Stack gap="xs">
        <Text fw={700} size="lg" id="part-label">
          Время
        </Text>
        <SimpleGrid cols={{ base: 1, xs: 3 }} role="group" aria-labelledby="part-label">
          {(Object.keys(DAY_PARTS) as DayPart[]).map((part) => {
            const p = DAY_PARTS[part];
            const available = !!draft.ymd && isSlotAvailable(draft.ymd, part);
            const selected = draft.part === part;
            return (
              <Button
                key={part}
                h="auto"
                py="sm"
                variant={selected ? 'filled' : 'default'}
                disabled={!available}
                onClick={() => update({ part })}
                aria-pressed={selected}
              >
                <Stack gap={0} align="center">
                  <span>{p.label}</span>
                  <Text size="sm" c={selected ? 'white' : 'dimmed'} fw={400}>
                    {available ? `${p.from}–${p.to}` : 'уже прошло'}
                  </Text>
                </Stack>
              </Button>
            );
          })}
        </SimpleGrid>
      </Stack>

      <Switch
        size="lg"
        checked={draft.urgent}
        onChange={(e) => update({ urgent: e.currentTarget.checked })}
        label="Срочно — нужно как можно скорее"
      />
    </Stack>
  );
}

// ───────────── 4. Адрес ─────────────

export function AddressStep({ draft, update, recipientId }: StepProps) {
  const addresses = useAddresses(recipientId);
  const [adding, setAdding] = useState(false);
  const list = addresses.data ?? [];
  const selected = draft.addressId ?? list.find((a) => a.isDefault)?.id;

  if (addresses.isPending) return <LoadingBlock />;
  return (
    <Stack gap="md">
      {list.length ? (
        <Radio.Group
          value={selected ?? ''}
          onChange={(addressId) => update({ addressId })}
          aria-label="Адрес"
        >
          <Stack gap="sm">
            {list.map((a) => (
              <Radio.Card key={a.id} value={a.id} radius="md" p="md" withBorder>
                <Group wrap="nowrap" align="flex-start">
                  <Radio.Indicator mt={4} />
                  <Stack gap={2}>
                    {a.label && <Text fw={700}>{a.label}</Text>}
                    <AddressView address={a} />
                  </Stack>
                </Group>
              </Radio.Card>
            ))}
          </Stack>
        </Radio.Group>
      ) : (
        <Alert color="blue" c="blue.9">
          Адреса пока нет. Добавьте его — волонтёр должен знать, куда прийти.
        </Alert>
      )}
      <Button
        variant="light"
        leftSection={<IconPlus aria-hidden />}
        onClick={() => setAdding(true)}
        style={{ alignSelf: 'flex-start' }}
      >
        Добавить адрес
      </Button>
      <AddressFormModal
        opened={adding}
        onClose={() => setAdding(false)}
        recipientId={recipientId}
        onSaved={(a) => update({ addressId: a.id })}
      />
    </Stack>
  );
}

// ───────────── 5. Оплата ─────────────

const PAYMENTS: PaymentMethod[] = ['CASH_ON_DELIVERY', 'TRANSFER', 'PREPAID'];

export function PaymentStep({ draft, update }: StepProps) {
  return (
    <Stack gap="lg">
      <NumberInput
        label="Примерно сколько денег понадобится"
        description="Необязательно. Волонтёр будет знать, сколько взять с собой"
        suffix=" ₽"
        min={0}
        step={100}
        thousandSeparator=" "
        value={draft.estimatedCost ?? ''}
        onChange={(v) => update({ estimatedCost: typeof v === 'number' ? v : null })}
      />
      <Radio.Group
        label={
          <Text fw={700} size="lg">
            Как вы рассчитаетесь
          </Text>
        }
        value={draft.paymentMethod ?? ''}
        onChange={(v) => update({ paymentMethod: v as PaymentMethod })}
      >
        <Stack gap="sm" mt="xs">
          {PAYMENTS.map((m) => (
            <Radio.Card key={m} value={m} radius="md" p="md" withBorder>
              <Group wrap="nowrap" align="flex-start">
                <Radio.Indicator mt={4} />
                <Stack gap={0}>
                  <Text fw={700}>{PAYMENT_METHOD[m].label}</Text>
                  <Text c="dimmed">{PAYMENT_METHOD[m].hint}</Text>
                </Stack>
              </Group>
            </Radio.Card>
          ))}
        </Stack>
      </Radio.Group>
    </Stack>
  );
}

// ───────────── 6. Проверка ─────────────

function Section({
  step,
  title,
  goTo,
  children,
}: {
  step: StepId;
  title: string;
  goTo: (step: StepId) => void;
  children: React.ReactNode;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4} style={{ minWidth: 0 }}>
          <Text c="dimmed" fw={600}>
            {title}
          </Text>
          {children}
        </Stack>
        <Button
          variant="subtle"
          size="md"
          onClick={() => goTo(step)}
          aria-label={`Изменить: ${STEP_TITLES[step]}`}
        >
          Изменить
        </Button>
      </Group>
    </Paper>
  );
}

export function ReviewStep({
  draft,
  categories,
  recipientId,
  goTo,
}: StepProps & { goTo: (step: StepId) => void }) {
  const addresses = useAddresses(recipientId);
  const category = categories.find((c) => c.id === draft.categoryId);
  const address = addresses.data?.find((a) => a.id === draft.addressId);
  const items = draft.items.filter((i) => i.name.trim());
  const window = draft.ymd && draft.part ? slotWindow(draft.ymd, draft.part) : null;

  return (
    <Stack gap="sm">
      <Section goTo={goTo} step="category" title="Что нужно">
        <Group gap="xs">
          {category && <CategoryIcon code={category.code} />}
          <Text fw={700} size="lg">
            {draft.title}
          </Text>
        </Group>
      </Section>
      {(items.length > 0 || draft.description || draft.destination) && (
        <Section goTo={goTo} step="details" title="Подробности">
          {draft.destination && <Text>Куда: {draft.destination}</Text>}
          {items.map((i, idx) => (
            <Text key={idx}>
              • {i.name}
              {i.quantity ? ` — ${i.quantity}` : ''}
            </Text>
          ))}
          {draft.description && <Text>{draft.description}</Text>}
        </Section>
      )}
      <Section goTo={goTo} step="time" title="Когда">
        <Text fw={600}>{window ? formatWindow(window.windowStart, window.windowEnd) : '—'}</Text>
        {draft.urgent && (
          <Text c="red.8" fw={700}>
            Срочно
          </Text>
        )}
      </Section>
      <Section goTo={goTo} step="address" title="Куда">
        {address ? <AddressView address={address} /> : <Text>—</Text>}
      </Section>
      {category?.needsMoney && (
        <Section goTo={goTo} step="payment" title="Оплата">
          <Text>{draft.paymentMethod ? PAYMENT_METHOD[draft.paymentMethod].label : '—'}</Text>
          {draft.estimatedCost ? <Text>Примерно {formatMoney(draft.estimatedCost)}</Text> : null}
        </Section>
      )}
    </Stack>
  );
}
