'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Anchor,
  Button,
  Checkbox,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconHeartHandshake, IconUserHeart, IconUsers } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/shared/api/client';
import { getErrorMessage } from '@/shared/api/errors';
import type { S } from '@/shared/api/types';
import { ROLE_HOME } from '@/shared/config/routes';
import { isValidPhone, phoneInputToApi } from '@/shared/lib/format';
import { useSession } from '@/shared/model/session';
import { IconTile } from '@/shared/ui';

const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Введите номер телефона')
  .refine(isValidPhone, 'Номер должен быть российским: +7 и 10 цифр');

/** После входа: в раздел, откуда выкинуло по истечении сессии, или в свой кабинет. */
function useAfterAuth() {
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useSession((s) => s.setSession);
  const queryClient = useQueryClient();
  return (res: S['AuthResponseDto']) => {
    queryClient.clear();
    setSession(res);
    const next = params.get('next');
    const home = ROLE_HOME[res.user.role];
    router.replace(next && next.startsWith(home) ? next : home);
  };
}

// ───────────── Вход ─────────────

const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Введите пароль'),
});
type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const params = useSearchParams();
  const afterAuth = useAfterAuth();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const { data } = await api.post<S['AuthResponseDto']>('/auth/login', {
        phone: phoneInputToApi(values.phone),
        password: values.password,
      });
      afterAuth(data);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack gap="md">
        {params.get('expired') && (
          <Alert color="yellow" c="yellow.9">
            Сессия закончилась. Войдите снова.
          </Alert>
        )}
        <TextInput
          label="Телефон"
          placeholder="+7 914 123-45-67"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          {...form.register('phone')}
          error={form.formState.errors.phone?.message}
        />
        <PasswordInput
          label="Пароль"
          autoComplete="current-password"
          {...form.register('password')}
          error={form.formState.errors.password?.message}
        />
        {error && (
          <Alert color="red" c="red.9" role="alert">
            {error}
          </Alert>
        )}
        <Button type="submit" size="xl" loading={form.formState.isSubmitting}>
          Войти
        </Button>
        <Text ta="center">
          Нет аккаунта?{' '}
          <Anchor component={Link} href="/register" fw={700}>
            Зарегистрироваться
          </Anchor>
        </Text>
        <Text ta="center" c="dimmed" size="sm">
          Забыли пароль? Позвоните координатору — он поможет войти.
        </Text>
      </Stack>
    </form>
  );
}

// ───────────── Регистрация ─────────────

export const REGISTER_ROLES = [
  {
    value: 'RECIPIENT',
    label: 'Мне нужна помощь',
    description: 'Купить продукты, лекарства, проводить к врачу',
    icon: <IconUserHeart size={40} />,
  },
  {
    value: 'RELATIVE',
    label: 'Помогаю родному',
    description: 'Оформляю заявки за маму, папу, бабушку',
    icon: <IconUsers size={40} />,
  },
  {
    value: 'VOLUNTEER',
    label: 'Хочу помогать',
    description: 'Стать волонтёром после проверки',
    icon: <IconHeartHandshake size={40} />,
  },
] as const;
type RegisterRole = (typeof REGISTER_ROLES)[number]['value'];

const registerSchema = z
  .object({
    role: z.enum(['RECIPIENT', 'RELATIVE', 'VOLUNTEER'], {
      errorMap: () => ({ message: 'Выберите, кто вы' }),
    }),
    lastName: z.string().trim().min(1, 'Введите фамилию').max(100),
    firstName: z.string().trim().min(1, 'Введите имя').max(100),
    middleName: z.string().trim().max(100).optional(),
    phone: phoneSchema,
    password: z.string().min(8, 'Пароль — не короче 8 символов').max(72),
    password2: z.string(),
    pdConsent: z.literal(true, {
      errorMap: () => ({ message: 'Без согласия зарегистрироваться нельзя' }),
    }),
  })
  .refine((v) => v.password === v.password2, {
    path: ['password2'],
    message: 'Пароли не совпадают',
  });
type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const params = useSearchParams();
  const afterAuth = useAfterAuth();
  const [error, setError] = useState<string | null>(null);
  const initialRole = REGISTER_ROLES.find((r) => r.value === params.get('role'))?.value;

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: initialRole,
      lastName: '',
      firstName: '',
      middleName: '',
      phone: '',
      password: '',
      password2: '',
      pdConsent: false as unknown as true,
    },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      const { data } = await api.post<S['AuthResponseDto']>('/auth/register', {
        role: v.role,
        phone: phoneInputToApi(v.phone),
        password: v.password,
        lastName: v.lastName,
        firstName: v.firstName,
        middleName: v.middleName || undefined,
        pdConsent: true,
      } satisfies S['RegisterDto']);
      afterAuth(data);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack gap="lg">
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => (
            <Stack gap="xs">
              <Text fw={700} size="lg" id="role-label">
                Кто вы?
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 3 }} role="group" aria-labelledby="role-label">
                {REGISTER_ROLES.map((r) => (
                  <IconTile
                    key={r.value}
                    icon={r.icon}
                    label={r.label}
                    description={r.description}
                    selected={field.value === r.value}
                    onClick={() => field.onChange(r.value as RegisterRole)}
                  />
                ))}
              </SimpleGrid>
              {errors.role && (
                <Text c="red.8" role="alert">
                  {errors.role.message}
                </Text>
              )}
            </Stack>
          )}
        />
        <TextInput
          label="Фамилия"
          autoComplete="family-name"
          {...form.register('lastName')}
          error={errors.lastName?.message}
        />
        <TextInput
          label="Имя"
          autoComplete="given-name"
          {...form.register('firstName')}
          error={errors.firstName?.message}
        />
        <TextInput
          label="Отчество"
          description="Если есть"
          autoComplete="additional-name"
          {...form.register('middleName')}
          error={errors.middleName?.message}
        />
        <TextInput
          label="Телефон"
          description="По нему вы будете входить"
          placeholder="+7 914 123-45-67"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          {...form.register('phone')}
          error={errors.phone?.message}
        />
        <PasswordInput
          label="Пароль"
          description="Не короче 8 символов"
          autoComplete="new-password"
          {...form.register('password')}
          error={errors.password?.message}
        />
        <PasswordInput
          label="Пароль ещё раз"
          autoComplete="new-password"
          {...form.register('password2')}
          error={errors.password2?.message}
        />
        <Controller
          control={form.control}
          name="pdConsent"
          render={({ field }) => (
            <Checkbox
              checked={!!field.value}
              onChange={(e) => field.onChange(e.currentTarget.checked)}
              label="Согласен(на) на обработку персональных данных: ФИО, телефона и адреса — только для выполнения заявок"
              error={errors.pdConsent?.message}
            />
          )}
        />
        {error && (
          <Alert color="red" c="red.9" role="alert">
            {error}
          </Alert>
        )}
        <Button type="submit" size="xl" loading={form.formState.isSubmitting}>
          Зарегистрироваться
        </Button>
        <Text ta="center">
          Уже есть аккаунт?{' '}
          <Anchor component={Link} href="/login" fw={700}>
            Войти
          </Anchor>
        </Text>
      </Stack>
    </form>
  );
}

// ───────────── Выход ─────────────

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return async () => {
    const { refreshToken, clear } = useSession.getState();
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    }
    clear();
    queryClient.clear();
    router.replace('/login');
  };
}
