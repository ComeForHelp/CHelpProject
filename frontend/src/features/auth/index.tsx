'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Anchor,
  Button,
  Checkbox,
  PasswordInput,
  Group,
  Radio,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
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
import classes from './auth.module.css';

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
        <Button type="submit" size="xl" fullWidth loading={form.formState.isSubmitting}>
          Войти
        </Button>
        <Text c="dimmed">Забыли пароль? Позвоните координатору — он поможет войти.</Text>
        <Text>
          Нет аккаунта?{' '}
          <Anchor component={Link} href="/choose" fw={600}>
            Зарегистрироваться
          </Anchor>
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
    description: 'Оставлять заявки на бытовые поручения',
  },
  {
    value: 'RELATIVE',
    label: 'Помогаю близкому',
    description: 'Оформлять помощь для родственника',
  },
  { value: 'VOLUNTEER', label: 'Хочу помогать', description: 'Выполнять поручения после проверки' },
] as const;
type RegisterRole = (typeof REGISTER_ROLES)[number]['value'];

/**
 * «Иванова Мария Петровна» → фамилия, имя, отчество (как в макете — одно поле «ФИО»).
 * Всё после второго слова — отчество (бывает из нескольких слов: «Ахмед оглы»).
 */
export function splitFullName(
  value: string,
): { lastName: string; firstName: string; middleName?: string } | null {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const [lastName, firstName, ...rest] = parts;
  return { lastName, firstName, middleName: rest.join(' ') || undefined };
}

const registerSchema = z
  .object({
    role: z.enum(['RECIPIENT', 'RELATIVE', 'VOLUNTEER'], {
      errorMap: () => ({ message: 'Выберите, кто вы' }),
    }),
    fullName: z
      .string()
      .trim()
      .min(1, 'Введите фамилию и имя')
      .max(300)
      .refine(
        (v) => !!splitFullName(v),
        'Введите фамилию и имя через пробел, например «Иванова Мария Петровна»',
      ),
    phone: phoneSchema,
    email: z.union([z.literal(''), z.string().trim().email('Неверный адрес почты')]),
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
      fullName: '',
      phone: '',
      email: '',
      password: '',
      password2: '',
      pdConsent: false as unknown as true,
    },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    const name = splitFullName(v.fullName)!;
    try {
      const { data } = await api.post<S['AuthResponseDto']>('/auth/register', {
        role: v.role,
        phone: phoneInputToApi(v.phone),
        password: v.password,
        ...name,
        email: v.email || undefined,
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
            <Radio.Group
              label="Кто вы?"
              value={field.value ?? ''}
              onChange={(v) => field.onChange(v as RegisterRole)}
              error={errors.role?.message}
            >
              <Stack gap="sm" mt={4}>
                {REGISTER_ROLES.map((r) => (
                  <Radio.Card
                    key={r.value}
                    value={r.value}
                    radius="md"
                    p="md"
                    className={classes.option}
                  >
                    <Group wrap="nowrap" align="flex-start" gap="md">
                      <Radio.Indicator mt={3} />
                      <Stack gap={0}>
                        <Text fw={700}>{r.label}</Text>
                        <Text c="dimmed" size="sm">
                          {r.description}
                        </Text>
                      </Stack>
                    </Group>
                  </Radio.Card>
                ))}
              </Stack>
            </Radio.Group>
          )}
        />
        <TextInput
          label="ФИО"
          placeholder="Иванова Мария Петровна"
          autoComplete="name"
          {...form.register('fullName')}
          error={errors.fullName?.message}
        />
        <TextInput
          label="Номер телефона"
          description="По нему вы будете входить"
          placeholder="+7 (914) 123-45-67"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          {...form.register('phone')}
          error={errors.phone?.message}
        />
        <TextInput
          label="Электронная почта"
          description="Необязательно"
          placeholder="name@example.ru"
          type="email"
          autoComplete="email"
          {...form.register('email')}
          error={errors.email?.message}
        />
        <PasswordInput
          label="Пароль"
          description="Не менее 8 символов"
          autoComplete="new-password"
          {...form.register('password')}
          error={errors.password?.message}
        />
        <PasswordInput
          label="Повторите пароль"
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
              label={
                <>
                  Я согласен(на) на обработку персональных данных.{' '}
                  <Anchor component={Link} href="/privacy" target="_blank">
                    Читать политику
                  </Anchor>
                </>
              }
              error={errors.pdConsent?.message}
            />
          )}
        />
        {error && (
          <Alert color="red" c="red.9" role="alert">
            {error}
          </Alert>
        )}
        <Button type="submit" size="xl" fullWidth loading={form.formState.isSubmitting}>
          Зарегистрироваться
        </Button>
        <Text>
          Уже есть аккаунт?{' '}
          <Anchor component={Link} href="/login" fw={600}>
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
