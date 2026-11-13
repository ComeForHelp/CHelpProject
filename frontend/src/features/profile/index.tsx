'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Radio,
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
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useDistricts } from '@/entities/address';
import { relativeKeys, useMyRelatives } from '@/entities/relative';
import { type Me, userKeys } from '@/entities/user';
import { volunteerKeys } from '@/entities/volunteer';
import { api } from '@/shared/api/client';
import { getErrorMessage } from '@/shared/api/errors';
import type { ContactPreference, S, VerificationStatus } from '@/shared/api/types';
import { CONTACT_PREFERENCE } from '@/shared/config/dictionaries';
import { formatPhone, isValidPhone, phoneInputToApi } from '@/shared/lib/format';
import { EmptyState, LoadingBlock, confirmAction } from '@/shared/ui';
import { AddressForm } from '../address';

const ok = (message: string) => notifications.show({ color: 'green', message });
const fail = (e: unknown) =>
  notifications.show({ color: 'red', title: 'Не получилось', message: getErrorMessage(e) });

// ───────────── ФИО и почта ─────────────

const nameSchema = z.object({
  lastName: z.string().trim().min(1, 'Введите фамилию').max(100),
  firstName: z.string().trim().min(1, 'Введите имя').max(100),
  middleName: z.string().trim().max(100),
  email: z.union([z.literal(''), z.string().email('Неверный адрес почты')]),
});

export function ProfileForm({ me }: { me: Me }) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    defaultValues: {
      lastName: me.lastName,
      firstName: me.firstName,
      middleName: me.middleName ?? '',
      email: me.email ?? '',
    },
  });
  const e = form.formState.errors;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await api.patch('/users/me', {
        ...v,
        middleName: v.middleName || null,
        email: v.email || null,
      } satisfies S['UpdateMeDto']);
      await queryClient.invalidateQueries({ queryKey: userKeys.me });
      ok('Сохранено');
    } catch (err) {
      fail(err);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack gap="md">
        <TextInput
          label="Телефон"
          value={formatPhone(me.phone)}
          readOnly
          description="Телефон меняет координатор"
        />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <TextInput label="Фамилия" {...form.register('lastName')} error={e.lastName?.message} />
          <TextInput label="Имя" {...form.register('firstName')} error={e.firstName?.message} />
          <TextInput label="Отчество" {...form.register('middleName')} />
        </SimpleGrid>
        <TextInput
          label="Электронная почта"
          description="Необязательно"
          type="email"
          {...form.register('email')}
          error={e.email?.message}
        />
        <Button
          type="submit"
          loading={form.formState.isSubmitting}
          style={{ alignSelf: 'flex-start' }}
        >
          Сохранить
        </Button>
      </Stack>
    </form>
  );
}

// ───────────── Пароль ─────────────

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Введите текущий пароль'),
    newPassword: z.string().min(8, 'Не короче 8 символов').max(72),
    newPassword2: z.string(),
  })
  .refine((v) => v.newPassword === v.newPassword2, {
    path: ['newPassword2'],
    message: 'Пароли не совпадают',
  });

export function ChangePasswordForm() {
  const router = useRouter();
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: '', newPassword: '', newPassword2: '' },
  });
  const e = form.formState.errors;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await api.post('/users/me/password', {
        oldPassword: v.oldPassword,
        newPassword: v.newPassword,
      } satisfies S['ChangePasswordDto']);
      ok('Пароль изменён. Войдите с новым паролем');
      router.replace('/login');
    } catch (err) {
      fail(err);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack gap="md">
        <PasswordInput
          label="Текущий пароль"
          autoComplete="current-password"
          {...form.register('oldPassword')}
          error={e.oldPassword?.message}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <PasswordInput
            label="Новый пароль"
            autoComplete="new-password"
            {...form.register('newPassword')}
            error={e.newPassword?.message}
          />
          <PasswordInput
            label="Новый пароль ещё раз"
            autoComplete="new-password"
            {...form.register('newPassword2')}
            error={e.newPassword2?.message}
          />
        </SimpleGrid>
        <Button
          type="submit"
          variant="light"
          loading={form.formState.isSubmitting}
          style={{ alignSelf: 'flex-start' }}
        >
          Сменить пароль
        </Button>
      </Stack>
    </form>
  );
}

// ───────────── Особенности получателя ─────────────

export function RecipientProfileForm({
  recipientId,
  mobilityNotes,
  contactPreference,
}: {
  recipientId?: string;
  mobilityNotes: string | null;
  contactPreference: ContactPreference | null;
}) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(mobilityNotes ?? '');
  const [pref, setPref] = useState<ContactPreference>(contactPreference ?? 'CALL');
  const save = useMutation({
    mutationFn: () =>
      api.patch(recipientId ? `/recipients/${recipientId}` : '/recipients/me', {
        mobilityNotes: notes,
        contactPreference: pref,
      } satisfies S['UpdateRecipientDto']),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recipients'] });
      ok('Сохранено');
    },
    onError: fail,
  });
  return (
    <Stack gap="md">
      <Textarea
        label="Что важно знать волонтёру"
        description="Например: «хожу с тростью», «плохо слышу — звонить громко». Волонтёр увидит это после того, как возьмёт заявку"
        value={notes}
        onChange={(e) => setNotes(e.currentTarget.value)}
        maxLength={1000}
      />
      <Radio.Group
        label={<Text fw={600}>Как удобнее связаться</Text>}
        value={pref}
        onChange={(v) => setPref(v as ContactPreference)}
      >
        <Group mt="xs">
          {(Object.keys(CONTACT_PREFERENCE) as ContactPreference[]).map((c) => (
            <Radio key={c} value={c} label={CONTACT_PREFERENCE[c]} />
          ))}
        </Group>
      </Radio.Group>
      <Button
        onClick={() => save.mutate()}
        loading={save.isPending}
        style={{ alignSelf: 'flex-start' }}
      >
        Сохранить
      </Button>
    </Stack>
  );
}

// ───────────── Родственники (страница профиля получателя) ─────────────

export function MyRelatives() {
  const links = useMyRelatives();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const refresh = () => queryClient.invalidateQueries({ queryKey: relativeKeys.links });

  const confirm = useMutation({
    mutationFn: (id: string) => api.post(`/relatives/links/${id}/confirm`),
    onSuccess: () => {
      void refresh();
      ok('Родственник подтверждён');
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/relatives/links/${id}`),
    onSuccess: () => {
      void refresh();
      ok('Связь удалена');
    },
    onError: fail,
  });
  const invite = useMutation({
    mutationFn: () =>
      api.post('/relatives/links/invite', {
        relativePhone: phoneInputToApi(phone),
        relation: relation || undefined,
      } satisfies S['InviteRelativeDto']),
    onSuccess: () => {
      setPhone('');
      setRelation('');
      void refresh();
      ok('Родственник добавлен');
    },
    onError: fail,
  });

  if (links.isPending) return <LoadingBlock />;
  return (
    <Stack gap="md">
      {links.data?.length ? (
        links.data.map((l) => (
          <Paper key={l.id} withBorder p="md" radius="md">
            <Group justify="space-between" wrap="wrap" gap="sm">
              <Stack gap={2}>
                <Group gap="xs">
                  <Text fw={700}>
                    {l.relative.firstName} {l.relative.lastName}
                  </Text>
                  {l.relation && <Text c="dimmed">({l.relation})</Text>}
                </Group>
                <Text c="dimmed">{formatPhone(l.relative.phone)}</Text>
                {l.status === 'PENDING' && (
                  <Badge color="yellow" c="yellow.9">
                    Просит доступ к вашим заявкам
                  </Badge>
                )}
              </Stack>
              <Group gap="xs">
                {l.status === 'PENDING' && (
                  <Button
                    color="green"
                    size="md"
                    loading={confirm.isPending}
                    onClick={() => confirm.mutate(l.id)}
                  >
                    Подтвердить
                  </Button>
                )}
                <Button
                  variant="subtle"
                  color="red"
                  size="md"
                  onClick={() =>
                    confirmAction({
                      title: l.status === 'PENDING' ? 'Отклонить запрос?' : 'Убрать родственника?',
                      message: 'Он больше не сможет оформлять заявки за вас.',
                      confirmLabel: 'Да',
                      danger: true,
                      onConfirm: () => remove.mutate(l.id),
                    })
                  }
                >
                  {l.status === 'PENDING' ? 'Отклонить' : 'Убрать'}
                </Button>
              </Group>
            </Group>
          </Paper>
        ))
      ) : (
        <EmptyState
          title="Родственников пока нет"
          text="Родственник сможет оформлять заявки за вас и следить за ними"
        />
      )}
      <Paper withBorder p="md" radius="md">
        <Stack gap="sm">
          <Text fw={700}>Добавить родственника</Text>
          <Text c="dimmed" size="sm">
            Он должен быть зарегистрирован на сайте как «Помогаю родному».
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Телефон родственника"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.currentTarget.value)}
            />
            <TextInput
              label="Кем приходится"
              placeholder="дочь"
              value={relation}
              onChange={(e) => setRelation(e.currentTarget.value)}
            />
          </SimpleGrid>
          <Button
            disabled={!isValidPhone(phone)}
            loading={invite.isPending}
            onClick={() => invite.mutate()}
            style={{ alignSelf: 'flex-start' }}
          >
            Добавить
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

// ───────────── Привязка подопечного (LinkRecipientForm) ─────────────

export function LinkRecipientForm({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const queryClient = useQueryClient();
  const request = useMutation({
    mutationFn: () =>
      api.post('/relatives/links/request', {
        recipientPhone: phoneInputToApi(phone),
        relation: relation || undefined,
      } satisfies S['RequestLinkDto']),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: relativeKeys.links });
      notifications.show({
        color: 'green',
        title: 'Запрос отправлен',
        message: 'Когда подопечный подтвердит его в профиле, вы сможете оформлять за него заявки.',
      });
      onDone();
    },
    onError: fail,
  });
  return (
    <Stack gap="md">
      <Text>
        Если ваш родственник уже зарегистрирован, найдите его по телефону — он подтвердит запрос в
        своём профиле.
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput
          label="Телефон подопечного"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.currentTarget.value)}
        />
        <TextInput
          label="Кем он вам приходится"
          placeholder="мама"
          value={relation}
          onChange={(e) => setRelation(e.currentTarget.value)}
        />
      </SimpleGrid>
      <Button
        size="lg"
        disabled={!isValidPhone(phone)}
        loading={request.isPending}
        onClick={() => request.mutate()}
        style={{ alignSelf: 'flex-start' }}
      >
        Отправить запрос
      </Button>
    </Stack>
  );
}

// ───────────── Регистрация получателя «за него» (RecipientForm) ─────────────

const recipientSchema = z.object({
  lastName: z.string().trim().min(1, 'Введите фамилию').max(100),
  firstName: z.string().trim().min(1, 'Введите имя').max(100),
  middleName: z.string().trim().max(100),
  phone: z.string().refine(isValidPhone, 'Номер должен быть российским: +7 и 10 цифр'),
  relation: z.string().max(50),
  mobilityNotes: z.string().max(1000),
  password: z.union([z.literal(''), z.string().min(8, 'Не короче 8 символов').max(72)]),
  pdConsent: z.literal(true, {
    errorMap: () => ({ message: 'Нужно согласие человека на обработку данных' }),
  }),
});
type RecipientValues = z.infer<typeof recipientSchema>;

/**
 * Регистрация человека без интернета: родственником (связь подтверждается сразу)
 * или координатором по звонку. Адрес можно добавить сразу.
 */
export function RecipientForm({
  asRelative,
  onCreated,
}: {
  asRelative: boolean;
  onCreated: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [withAddress, setWithAddress] = useState(true);
  const [address, setAddress] = useState<S['AddressFieldsDto'] | null>(null);
  const [addressOpened, setAddressOpened] = useState(false);
  const form = useForm<RecipientValues>({
    resolver: zodResolver(recipientSchema),
    defaultValues: {
      lastName: '',
      firstName: '',
      middleName: '',
      phone: '',
      relation: '',
      mobilityNotes: '',
      password: '',
      pdConsent: false as unknown as true,
    },
  });
  const e = form.formState.errors;

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      const { data } = await api.post<S['RecipientDetailDto']>('/recipients', {
        phone: phoneInputToApi(v.phone),
        lastName: v.lastName,
        firstName: v.firstName,
        middleName: v.middleName || undefined,
        relation: asRelative ? v.relation || undefined : undefined,
        mobilityNotes: v.mobilityNotes || undefined,
        password: v.password || undefined,
        address: withAddress && address ? address : undefined,
        pdConsent: true,
      } satisfies S['CreateRecipientDto']);
      await queryClient.invalidateQueries({ queryKey: ['recipients'] });
      await queryClient.invalidateQueries({ queryKey: relativeKeys.links });
      ok(`${data.firstName} ${data.lastName} зарегистрирован(а)`);
      onCreated(data.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <TextInput label="Фамилия" {...form.register('lastName')} error={e.lastName?.message} />
          <TextInput label="Имя" {...form.register('firstName')} error={e.firstName?.message} />
          <TextInput label="Отчество" {...form.register('middleName')} />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Телефон"
            type="tel"
            inputMode="tel"
            {...form.register('phone')}
            error={e.phone?.message}
          />
          {asRelative && (
            <TextInput
              label="Кем вам приходится"
              placeholder="мама"
              {...form.register('relation')}
            />
          )}
        </SimpleGrid>
        <Textarea
          label="Особенности"
          description="«Хожу с тростью», «плохо слышу»"
          {...form.register('mobilityNotes')}
        />
        <PasswordInput
          label="Пароль для входа"
          description="Необязательно. Если не задать — человек не сможет войти сам, заявки будете оформлять вы"
          autoComplete="new-password"
          {...form.register('password')}
          error={e.password?.message}
        />
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Switch
              label="Сразу добавить адрес"
              checked={withAddress}
              onChange={(ev) => setWithAddress(ev.currentTarget.checked)}
            />
            {withAddress &&
              (address ? (
                <Group justify="space-between">
                  <Text fw={600}>
                    {address.street}, {address.house}
                    {address.apartment ? `, кв. ${address.apartment}` : ''}
                  </Text>
                  <Button variant="subtle" size="md" onClick={() => setAddressOpened(true)}>
                    Изменить
                  </Button>
                </Group>
              ) : (
                <Button
                  variant="light"
                  size="md"
                  onClick={() => setAddressOpened(true)}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Указать адрес
                </Button>
              ))}
          </Stack>
        </Paper>
        <Controller
          control={form.control}
          name="pdConsent"
          render={({ field }) => (
            <Checkbox
              checked={!!field.value}
              onChange={(ev) => field.onChange(ev.currentTarget.checked)}
              label="Человек согласен на обработку его персональных данных (ФИО, телефон, адрес) для выполнения заявок"
              error={e.pdConsent?.message}
            />
          )}
        />
        {error && (
          <Alert color="red" c="red.9" role="alert">
            {error}
          </Alert>
        )}
        <Button
          type="submit"
          size="xl"
          loading={form.formState.isSubmitting}
          style={{ alignSelf: 'flex-start' }}
        >
          Зарегистрировать
        </Button>
      </Stack>
      <AddressDraftModal
        opened={addressOpened}
        onClose={() => setAddressOpened(false)}
        onSave={setAddress}
      />
    </form>
  );
}

/** Адрес для нового получателя: собираем поля без сохранения (получателя ещё нет). */
function AddressDraftModal({
  opened,
  onClose,
  onSave,
}: {
  opened: boolean;
  onClose: () => void;
  onSave: (a: S['AddressFieldsDto']) => void;
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="lg">
          Адрес
        </Text>
      }
    >
      {opened && (
        <AddressForm
          draftOnly
          onCancel={onClose}
          onDraft={(a) => {
            onSave(a);
            onClose();
          }}
          onSaved={() => onClose()}
        />
      )}
    </Modal>
  );
}

// ───────────── Профиль волонтёра (VolunteerDistrictsForm) ─────────────

export function VolunteerProfileForm({ profile }: { profile: S['VolunteerProfileDto'] }) {
  const districts = useDistricts();
  const queryClient = useQueryClient();
  const [ids, setIds] = useState<string[]>(profile.districts.map((d) => String(d.id)));
  const [hasCar, setHasCar] = useState(profile.hasCar);
  const [about, setAbout] = useState(profile.about ?? '');
  const save = useMutation({
    mutationFn: () =>
      api.patch('/volunteers/me', {
        districtIds: ids.map(Number),
        hasCar,
        about,
      } satisfies S['UpdateVolunteerProfileDto']),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.volunteerProfile });
      void queryClient.invalidateQueries({ queryKey: userKeys.me });
      ok('Профиль сохранён');
    },
    onError: fail,
  });
  return (
    <Stack gap="md">
      <Checkbox.Group
        label={<Text fw={700}>В каких районах готовы помогать</Text>}
        description="Каталог по умолчанию покажет заявки из этих районов"
        value={ids}
        onChange={setIds}
      >
        <SimpleGrid cols={{ base: 1, xs: 2 }} mt="xs">
          {(districts.data ?? []).map((d) => (
            <Checkbox key={d.id} value={String(d.id)} label={d.name} />
          ))}
        </SimpleGrid>
      </Checkbox.Group>
      <Switch
        label="Есть машина"
        checked={hasCar}
        onChange={(e) => setHasCar(e.currentTarget.checked)}
      />
      <Textarea
        label="О себе"
        description="Чем занимаетесь, когда свободны"
        value={about}
        onChange={(e) => setAbout(e.currentTarget.value)}
        maxLength={1000}
      />
      <Button
        onClick={() => save.mutate()}
        loading={save.isPending}
        style={{ alignSelf: 'flex-start' }}
      >
        Сохранить
      </Button>
    </Stack>
  );
}

// ───────────── Решение по волонтёру (VolunteerReview) ─────────────

export function VerifyVolunteerActions({
  volunteerId,
  status,
}: {
  volunteerId: string;
  status: VerificationStatus | null | undefined;
}) {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<'REJECTED' | 'BLOCKED' | null>(null);
  const [note, setNote] = useState('');
  const verify = useMutation({
    mutationFn: (decision: S['VerifyVolunteerDto']['decision']) =>
      api.post(`/volunteers/${volunteerId}/verify`, {
        decision,
        note: note.trim() || undefined,
      } satisfies S['VerifyVolunteerDto']),
    onSuccess: (_d, decision) => {
      setModal(null);
      setNote('');
      void queryClient.invalidateQueries({ queryKey: volunteerKeys.detail(volunteerId) });
      void queryClient.invalidateQueries({ queryKey: ['volunteers'] });
      void queryClient.invalidateQueries({ queryKey: ['coordinator'] });
      ok(
        decision === 'VERIFIED'
          ? 'Волонтёр подтверждён — теперь он видит заявки'
          : decision === 'BLOCKED'
            ? 'Волонтёр заблокирован'
            : 'Заявка волонтёра отклонена',
      );
    },
    onError: fail,
  });
  return (
    <>
      <Group gap="sm" wrap="wrap">
        {status !== 'VERIFIED' && (
          <Button
            color="green"
            size="lg"
            loading={verify.isPending && verify.variables === 'VERIFIED'}
            onClick={() => verify.mutate('VERIFIED')}
          >
            Подтвердить
          </Button>
        )}
        {status === 'PENDING' && (
          <Button variant="default" size="lg" onClick={() => setModal('REJECTED')}>
            Отклонить
          </Button>
        )}
        {status !== 'BLOCKED' && (
          <Button variant="outline" color="red" size="lg" onClick={() => setModal('BLOCKED')}>
            Заблокировать
          </Button>
        )}
      </Group>
      <Modal
        opened={!!modal}
        onClose={() => setModal(null)}
        title={
          <Text fw={700} size="lg">
            {modal === 'BLOCKED' ? 'Заблокировать волонтёра?' : 'Отклонить волонтёра?'}
          </Text>
        }
      >
        <Stack gap="md">
          {modal === 'BLOCKED' && (
            <Text>Взятые, но не начатые заявки вернутся в общий список.</Text>
          )}
          <Textarea
            label="Причина"
            description="Волонтёр увидит её у себя"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModal(null)}>
              Отмена
            </Button>
            <Button
              color="red"
              loading={verify.isPending}
              onClick={() => modal && verify.mutate(modal)}
            >
              {modal === 'BLOCKED' ? 'Заблокировать' : 'Отклонить'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
