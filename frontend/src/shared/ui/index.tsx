'use client';

import {
  Alert,
  Badge,
  Box,
  Button,
  type ButtonProps,
  Center,
  Group,
  Loader,
  Paper,
  type PaperProps,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  Title,
  UnstyledButton,
  VisuallyHidden,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconAlertTriangle, IconHeartFilled, IconInbox, IconPhone } from '@tabler/icons-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getErrorMessage } from '../api/errors';
import type { TaskStatus } from '../api/types';
import { TASK_STATUS, TONE, type Tone } from '../config/dictionaries';
import { formatPhone } from '../lib/format';
import { FONT_SIZES, type FontSize, useUiPrefs } from '../model/ui-prefs';
import classes from './ui.module.css';

/** Большая кнопка на всю ширину — главные действия («Нужна помощь», «Взять»). */
export function BigButton({
  href,
  children,
  ...props
}: ButtonProps & {
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  children: ReactNode;
}) {
  if (href) {
    return (
      <Button component={Link} href={href} size="xl" fullWidth {...props}>
        {children}
      </Button>
    );
  }
  return (
    <Button size="xl" fullWidth {...props}>
      {children}
    </Button>
  );
}

/** Плитка с иконкой и подписью (выбор категории, роли). Иконка всегда с подписью. */
export function IconTile({
  icon,
  label,
  description,
  selected,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <UnstyledButton
      onClick={onClick}
      className={classes.tile}
      data-selected={selected || undefined}
      aria-pressed={selected}
    >
      <Stack gap={6} align="center">
        <Box className={classes.tileIcon} aria-hidden>
          {icon}
        </Box>
        <Text fw={700} ta="center">
          {label}
        </Text>
        {description && (
          <Text size="sm" c="dimmed" ta="center">
            {description}
          </Text>
        )}
      </Stack>
    </UnstyledButton>
  );
}

/** «Шаг 2 из 6» с полосой прогресса. */
export function StepIndicator({
  step,
  total,
  title,
}: {
  step: number;
  total: number;
  title: string;
}) {
  return (
    <Stack gap={6}>
      <Text c="dimmed" fw={600}>
        Шаг {step} из {total}
      </Text>
      <Progress value={(step / total) * 100} size="lg" radius="xl" aria-hidden />
      <Title order={2}>{title}</Title>
    </Stack>
  );
}

/** «Пилюля» с точкой по макету: светлый фон тона, тёмный текст. */
export function Pill({
  tone,
  children,
  size = 'lg',
}: {
  tone: Tone;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const t = TONE[tone];
  return (
    <Badge
      size={size}
      radius="xl"
      leftSection={<span className={classes.dot} aria-hidden />}
      styles={{ root: { background: t.bg, color: t.fg, border: 0 } }}
    >
      {children}
    </Badge>
  );
}

/** Статус заявки словами, цвет — по смыслу (ждёт / в работе / выполнена / отменена). */
export function StatusBadge({
  status,
  size = 'lg',
}: {
  status: TaskStatus;
  size?: 'md' | 'lg' | 'xl';
}) {
  const s = TASK_STATUS[status];
  return (
    <Pill tone={s.tone} size={size}>
      {s.label}
    </Pill>
  );
}

/** Диалог подтверждения для важных действий (отмена, подтверждение). */
export function confirmAction(opts: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}) {
  modals.openConfirmModal({
    title: (
      <Text fw={700} size="lg">
        {opts.title}
      </Text>
    ),
    children: typeof opts.message === 'string' ? <Text>{opts.message}</Text> : opts.message,
    labels: { confirm: opts.confirmLabel, cancel: opts.cancelLabel ?? 'Нет, вернуться' },
    confirmProps: { color: opts.danger ? 'red' : undefined, size: 'lg' },
    cancelProps: { size: 'lg', variant: 'default' },
    onConfirm: opts.onConfirm,
  });
}

/** Кнопка «Позвонить» — открывает звонилку на телефоне. */
export function PhoneLink({
  phone,
  label = 'Позвонить',
  ...props
}: { phone: string; label?: string } & ButtonProps) {
  return (
    <Button
      component="a"
      href={`tel:${phone}`}
      leftSection={<IconPhone size={22} aria-hidden />}
      color="green"
      {...props}
    >
      {label}
      <VisuallyHidden> {formatPhone(phone)}</VisuallyHidden>
    </Button>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <Paper withBorder p="xl" radius="md">
      <Stack align="center" gap="sm">
        <IconInbox size={44} aria-hidden color="var(--mantine-color-gray-6)" />
        <Text fw={700} size="lg" ta="center">
          {title}
        </Text>
        {text && (
          <Text c="dimmed" ta="center">
            {text}
          </Text>
        )}
        {action}
      </Stack>
    </Paper>
  );
}

/** Переключатель размера шрифта: 18 / 20 / 22 px. */
export function FontSizeSwitcher() {
  const { fontSize, setFontSize } = useUiPrefs();
  return (
    <SegmentedControl
      aria-label="Размер шрифта"
      value={String(fontSize)}
      onChange={(v) => setFontSize(Number(v) as FontSize)}
      data={FONT_SIZES.map((size, i) => ({
        value: String(size),
        label: (
          <span
            style={{ fontSize: `${0.9 + i * 0.2}rem`, fontWeight: 700 }}
            aria-label={`Шрифт ${size}`}
          >
            А{'+'.repeat(i)}
          </span>
        ),
      }))}
    />
  );
}

export function LoadingBlock({ label = 'Загружаем…' }: { label?: string }) {
  return (
    <Center py="xl">
      <Group gap="sm">
        <Loader size="md" />
        <Text c="dimmed">{label}</Text>
      </Group>
    </Center>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert color="red" icon={<IconAlertTriangle aria-hidden />} title="Не получилось загрузить">
      <Stack gap="sm" align="flex-start">
        <Text>{getErrorMessage(error)}</Text>
        {onRetry && (
          <Button variant="white" color="red" size="md" onClick={onRetry}>
            Попробовать снова
          </Button>
        )}
      </Stack>
    </Alert>
  );
}

/** Показывает загрузку или ошибку запроса, иначе — содержимое. */
export function QueryState<T>({
  query,
  children,
  loadingLabel,
}: {
  query: { data: T | undefined; isPending: boolean; error: unknown; refetch: () => unknown };
  children: (data: T) => ReactNode;
  loadingLabel?: string;
}) {
  if (query.isPending) return <LoadingBlock label={loadingLabel} />;
  if (query.error || query.data === undefined) {
    return <ErrorBlock error={query.error} onRetry={() => query.refetch()} />;
  }
  return <>{children(query.data)}</>;
}

/** Заголовок страницы с необязательной кнопкой справа. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-end" gap="md" mb="lg" wrap="wrap">
      <Stack gap={4}>
        <Title order={1}>{title}</Title>
        {description && <Text c="dimmed">{description}</Text>}
      </Stack>
      {action}
    </Group>
  );
}

/** Карточка-ссылка (TaskCard и т.п.): вся карточка кликабельна. */
export function LinkCard({
  href,
  children,
  ...props
}: { href: string; children: ReactNode } & Omit<PaperProps, 'children'>) {
  return (
    <Paper
      component={Link}
      href={href}
      withBorder
      p="md"
      radius="lg"
      className={classes.linkCard}
      {...props}
    >
      {children}
    </Paper>
  );
}

/** Строка «подпись: значение» для карточек. */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Group gap="xs" align="baseline" wrap="nowrap">
      <Text c="dimmed" style={{ flexShrink: 0 }}>
        {label}:
      </Text>
      <Text fw={500} style={{ minWidth: 0 }}>
        {children}
      </Text>
    </Group>
  );
}

/** Логотип макета: оранжевый квадрат с сердцем и название. */
export function Logo({ href = '/', light }: { href?: string; light?: boolean }) {
  return (
    <Link
      href={href}
      className={classes.logo}
      data-light={light || undefined}
      aria-label="Иду на помощь! — на главную"
    >
      <span className={classes.logoMark} aria-hidden>
        <IconHeartFilled size={20} />
      </span>
      {/* На узком телефоне остаётся только знак — иначе шапка шире экрана */}
      <span className={classes.logoText} aria-hidden>
        Иду на помощь!
      </span>
    </Link>
  );
}
