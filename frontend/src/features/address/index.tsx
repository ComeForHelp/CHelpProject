'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  type Address,
  AddressView,
  addressKeys,
  useAddresses,
  useDistricts,
} from '@/entities/address';
import { api } from '@/shared/api/client';
import { getErrorMessage } from '@/shared/api/errors';
import type { S } from '@/shared/api/types';
import { EmptyState, QueryState, confirmAction } from '@/shared/ui';

const schema = z.object({
  label: z.string().trim().max(50).optional(),
  districtId: z.string().min(1, 'Выберите район'),
  street: z.string().trim().min(1, 'Укажите улицу').max(200),
  house: z.string().trim().min(1, 'Укажите дом').max(20),
  entrance: z.string().trim().max(10).optional(),
  apartment: z.string().trim().max(20).optional(),
  floor: z.union([z.number().int().min(-5).max(100), z.literal('')]).optional(),
  hasElevator: z.boolean(),
  accessNotes: z.string().trim().max(1000).optional(),
});
type Values = z.infer<typeof schema>;

function toValues(a?: Address): Values {
  return {
    label: a?.label ?? '',
    districtId: a ? String(a.districtId) : '',
    street: a?.street ?? '',
    house: a?.house ?? '',
    entrance: a?.entrance ?? '',
    apartment: a?.apartment ?? '',
    floor: a?.floor ?? '',
    hasElevator: a?.hasElevator ?? false,
    accessNotes: a?.accessNotes ?? '',
  };
}

function toPayload(v: Values) {
  return {
    label: v.label || undefined,
    districtId: Number(v.districtId),
    street: v.street,
    house: v.house,
    entrance: v.entrance || undefined,
    apartment: v.apartment || undefined,
    floor: v.floor === '' || v.floor === undefined ? undefined : v.floor,
    hasElevator: v.hasElevator,
    accessNotes: v.accessNotes || undefined,
  };
}

/** AddressForm: улица, дом, квартира, подъезд, этаж, лифт, подсказки про лестницы. */
export function AddressForm({
  recipientId,
  address,
  onSaved,
  onCancel,
  draftOnly,
  onDraft,
}: {
  recipientId?: string;
  address?: Address;
  onSaved: (a: Address) => void;
  onCancel?: () => void;
  /** Не сохранять, а вернуть поля (адрес для ещё не созданного получателя). */
  draftOnly?: boolean;
  onDraft?: (fields: S['AddressFieldsDto']) => void;
}) {
  const districts = useDistricts();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(address) });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    if (draftOnly) {
      onDraft?.(toPayload(v));
      return;
    }
    try {
      const payload = toPayload(v);
      const { data } = address
        ? await api.patch<Address>(`/addresses/${address.id}`, payload)
        : await api.post<Address>('/addresses', {
            ...payload,
            recipientId,
          } satisfies S['CreateAddressDto']);
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      onSaved(data);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack gap="md">
        <Controller
          control={form.control}
          name="districtId"
          render={({ field }) => (
            <Select
              label="Район"
              placeholder="Выберите район"
              data={(districts.data ?? []).map((d) => ({ value: String(d.id), label: d.name }))}
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? '')}
              error={errors.districtId?.message}
              allowDeselect={false}
            />
          )}
        />
        <TextInput
          label="Улица"
          placeholder="ул. Светланская"
          {...form.register('street')}
          error={errors.street?.message}
        />
        <SimpleGrid cols={{ base: 2, sm: 4 }}>
          <TextInput label="Дом" {...form.register('house')} error={errors.house?.message} />
          <TextInput label="Подъезд" {...form.register('entrance')} />
          <TextInput label="Квартира" {...form.register('apartment')} />
          <Controller
            control={form.control}
            name="floor"
            render={({ field }) => (
              <NumberInput
                label="Этаж"
                min={-5}
                max={100}
                allowDecimal={false}
                value={field.value ?? ''}
                onChange={(v) => field.onChange(typeof v === 'number' ? v : '')}
              />
            )}
          />
        </SimpleGrid>
        <Controller
          control={form.control}
          name="hasElevator"
          render={({ field }) => (
            <Checkbox
              label="В доме есть лифт"
              checked={field.value}
              onChange={(e) => field.onChange(e.currentTarget.checked)}
            />
          )}
        />
        <Textarea
          label="Как добраться"
          description="Лестницы, крутой подъём, код домофона. Волонтёр увидит это только после того, как возьмёт заявку"
          placeholder="80 ступеней от остановки, домофон 12К"
          {...form.register('accessNotes')}
        />
        <TextInput
          label="Название"
          description="Например, «Дом» или «Дача»"
          {...form.register('label')}
        />
        {error && (
          <Alert color="red" c="red.9" role="alert">
            {error}
          </Alert>
        )}
        <Group justify="flex-end">
          {onCancel && (
            <Button variant="default" onClick={onCancel}>
              Отмена
            </Button>
          )}
          <Button type="submit" loading={form.formState.isSubmitting}>
            Сохранить адрес
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Модальное окно с формой адреса. */
export function AddressFormModal({
  opened,
  onClose,
  recipientId,
  address,
  onSaved,
}: {
  opened: boolean;
  onClose: () => void;
  recipientId?: string;
  address?: Address;
  onSaved?: (a: Address) => void;
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="lg">
          {address ? 'Изменить адрес' : 'Новый адрес'}
        </Text>
      }
    >
      {opened && (
        <AddressForm
          recipientId={recipientId}
          address={address}
          onCancel={onClose}
          onSaved={(a) => {
            notifications.show({ color: 'green', message: 'Адрес сохранён' });
            onSaved?.(a);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

/** Список адресов с добавлением, изменением и удалением (профиль, карточка получателя). */
export function AddressManager({ recipientId }: { recipientId?: string }) {
  const query = useAddresses(recipientId);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Address | 'new' | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/addresses/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: addressKeys.list(recipientId) });
      notifications.show({ color: 'green', message: 'Адрес удалён' });
    },
    onError: (e) => notifications.show({ color: 'red', message: getErrorMessage(e) }),
  });

  return (
    <Stack gap="sm">
      <QueryState query={query}>
        {(addresses) =>
          addresses.length ? (
            <Stack gap="sm">
              {addresses.map((a) => (
                <Paper key={a.id} withBorder p="md" radius="md">
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={4}>
                      <Group gap="xs">
                        {a.label && <Text fw={700}>{a.label}</Text>}
                        {a.isDefault && (
                          <Badge color="blue" c="blue.9">
                            Основной
                          </Badge>
                        )}
                      </Group>
                      <AddressView address={a} />
                    </Stack>
                    <Group gap="xs" wrap="nowrap">
                      <ActionIcon
                        size="xl"
                        variant="light"
                        aria-label="Изменить адрес"
                        onClick={() => setEditing(a)}
                      >
                        <IconPencil aria-hidden />
                      </ActionIcon>
                      <ActionIcon
                        size="xl"
                        variant="light"
                        color="red"
                        aria-label="Удалить адрес"
                        onClick={() =>
                          confirmAction({
                            title: 'Удалить адрес?',
                            message:
                              'Адрес пропадёт из списка. Если по нему были заявки, удалить не получится.',
                            confirmLabel: 'Да, удалить',
                            danger: true,
                            onConfirm: () => remove.mutate(a.id),
                          })
                        }
                      >
                        <IconTrash aria-hidden />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          ) : (
            <EmptyState
              title="Адресов пока нет"
              text="Добавьте адрес, чтобы волонтёр знал, куда прийти"
            />
          )
        }
      </QueryState>
      <Button
        variant="light"
        leftSection={<IconPlus aria-hidden />}
        onClick={() => setEditing('new')}
        style={{ alignSelf: 'flex-start' }}
      >
        Добавить адрес
      </Button>
      <AddressFormModal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        recipientId={recipientId}
        address={editing && editing !== 'new' ? editing : undefined}
      />
    </Stack>
  );
}
