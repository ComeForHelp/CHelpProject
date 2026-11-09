'use client';

import { Alert, Button, Group, Modal, Rating, Stack, Text, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconHandStop,
  IconPlayerPlay,
  IconRepeat,
  IconX,
  IconUserMinus,
  IconCircleCheck,
} from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type TaskDetail, taskKeys } from '@/entities/task';
import { api } from '@/shared/api/client';
import { getErrorMessage } from '@/shared/api/errors';
import type { S } from '@/shared/api/types';
import {
  type DayPart,
  DAY_PARTS,
  addDaysYmd,
  isSlotAvailable,
  slotWindow,
  todayYmd,
} from '@/shared/lib/date';
import { confirmAction } from '@/shared/ui';

/** Мутация над заявкой: после успеха обновляем все списки и уведомления. */
function useTaskAction<T = void>(
  taskId: string,
  run: (vars: T) => Promise<unknown>,
  successMessage?: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['coordinator'] });
      if (successMessage) notifications.show({ color: 'green', message: successMessage });
    },
    onError: async (e) => {
      notifications.show({
        color: 'red',
        title: 'Не получилось',
        message: getErrorMessage(e),
        autoClose: 8000,
      });
      // 409 — состояние изменилось: показываем актуальное
      await queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
}

// ───────────── Взять (TakeTaskButton) ─────────────

export function TakeTaskButton({ task }: { task: TaskDetail }) {
  const take = useTaskAction(
    task.id,
    () => api.post(`/tasks/${task.id}/take`),
    'Заявка ваша! Позвоните получателю перед выходом.',
  );
  return (
    <Button
      size="xl"
      fullWidth
      color="green"
      leftSection={<IconHandStop aria-hidden />}
      loading={take.isPending}
      onClick={() => take.mutate()}
    >
      Взять заявку
    </Button>
  );
}

// ───────────── Модалка с причиной ─────────────

function ReasonModal({
  opened,
  onClose,
  title,
  text,
  label,
  required,
  confirmLabel,
  danger,
  loading,
  onSubmit,
}: {
  opened: boolean;
  onClose: () => void;
  title: string;
  text?: string;
  label: string;
  required?: boolean;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="lg">
          {title}
        </Text>
      }
    >
      <Stack gap="md">
        {text && <Text>{text}</Text>}
        <Textarea
          label={label}
          value={reason}
          onChange={(e) => {
            setReason(e.currentTarget.value);
            setError(null);
          }}
          error={error}
          maxLength={500}
          data-autofocus
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Нет, вернуться
          </Button>
          <Button
            color={danger ? 'red' : undefined}
            loading={loading}
            onClick={() => {
              if (required && !reason.trim()) return setError('Напишите причину');
              onSubmit(reason.trim());
            }}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ───────────── Кнопки статусов (StatusActions) ─────────────

/**
 * Кнопки по availableTransitions — правила переходов живут на backend,
 * здесь только показываем то, что этому пользователю разрешено сейчас.
 */
export function StatusActions({ task }: { task: TaskDetail }) {
  const can = (s: S['TaskStatus']) => task.availableTransitions.includes(s);
  const rel = task.viewerRelation;
  const [modal, setModal] = useState<'cancel' | 'decline' | 'unassign' | null>(null);

  const start = useTaskAction(
    task.id,
    () => api.post(`/tasks/${task.id}/start`),
    'Отмечено: вы начали выполнение',
  );
  const done = useTaskAction(
    task.id,
    () => api.post(`/tasks/${task.id}/done`),
    'Отмечено как выполненное. Ждём подтверждения получателя',
  );
  const confirm = useTaskAction(
    task.id,
    () => api.post(`/tasks/${task.id}/confirm`),
    'Спасибо! Заявка закрыта',
  );
  const cancel = useTaskAction<string>(
    task.id,
    (reason) => api.post(`/tasks/${task.id}/cancel`, { reason }),
    'Заявка отменена',
  );
  const decline = useTaskAction<string>(
    task.id,
    (reason) => api.post(`/tasks/${task.id}/decline`, { reason: reason || undefined }),
    'Вы отказались от заявки. Она снова в общем списке',
  );
  const unassign = useTaskAction<string>(
    task.id,
    (reason) => api.post(`/tasks/${task.id}/unassign`, { reason: reason || undefined }),
    'Волонтёр снят с заявки',
  );

  const buttons: React.ReactNode[] = [];

  if (can('IN_PROGRESS')) {
    buttons.push(
      <Button
        key="start"
        size="xl"
        leftSection={<IconPlayerPlay aria-hidden />}
        loading={start.isPending}
        onClick={() => start.mutate()}
      >
        Начал выполнение
      </Button>,
    );
  }
  if (can('DONE')) {
    buttons.push(
      <Button
        key="done"
        size="xl"
        color="green"
        leftSection={<IconCheck aria-hidden />}
        loading={done.isPending}
        onClick={() =>
          confirmAction({
            title: 'Всё выполнено?',
            message:
              task.paymentMethod !== 'NONE'
                ? 'Не забудьте загрузить фото чека — получатель проверит сумму.'
                : 'Получатель увидит, что заявка выполнена, и подтвердит её.',
            confirmLabel: 'Да, выполнено',
            onConfirm: () => done.mutate(),
          })
        }
      >
        Выполнено
      </Button>,
    );
  }
  if (can('CONFIRMED')) {
    buttons.push(
      <Button
        key="confirm"
        size="xl"
        color="green"
        leftSection={<IconCircleCheck aria-hidden />}
        loading={confirm.isPending}
        onClick={() =>
          confirmAction({
            title: 'Подтвердить выполнение?',
            message: 'Проверьте покупки и чек. После подтверждения заявка закроется.',
            confirmLabel: 'Да, всё хорошо',
            onConfirm: () => confirm.mutate(),
          })
        }
      >
        Подтвердить выполнение
      </Button>,
    );
  }
  if (can('NEW') && rel === 'VOLUNTEER') {
    buttons.push(
      <Button
        key="decline"
        size="lg"
        variant="default"
        leftSection={<IconX aria-hidden />}
        onClick={() => setModal('decline')}
      >
        Отказаться
      </Button>,
    );
  }
  if (can('NEW') && rel === 'STAFF') {
    buttons.push(
      <Button
        key="unassign"
        size="lg"
        variant="default"
        leftSection={<IconUserMinus aria-hidden />}
        onClick={() => setModal('unassign')}
      >
        Снять волонтёра
      </Button>,
    );
  }
  if (can('CANCELLED')) {
    buttons.push(
      <Button
        key="cancel"
        size="lg"
        variant="outline"
        color="red"
        leftSection={<IconX aria-hidden />}
        onClick={() => setModal('cancel')}
      >
        Отменить заявку
      </Button>,
    );
  }

  if (!buttons.length) return null;
  return (
    <>
      <Stack gap="sm">{buttons}</Stack>
      <ReasonModal
        opened={modal === 'cancel'}
        onClose={() => setModal(null)}
        title="Отменить заявку?"
        text={task.volunteer ? 'Волонтёр получит уведомление об отмене.' : undefined}
        label="Почему отменяете"
        required
        confirmLabel="Да, отменить"
        danger
        loading={cancel.isPending}
        onSubmit={(r) => cancel.mutate(r, { onSuccess: () => setModal(null) })}
      />
      <ReasonModal
        opened={modal === 'decline'}
        onClose={() => setModal(null)}
        title="Отказаться от заявки?"
        text="Заявка вернётся в общий список, получатель узнает, что ищем другого волонтёра."
        label="Причина (необязательно)"
        confirmLabel="Да, отказаться"
        danger
        loading={decline.isPending}
        onSubmit={(r) => decline.mutate(r, { onSuccess: () => setModal(null) })}
      />
      <ReasonModal
        opened={modal === 'unassign'}
        onClose={() => setModal(null)}
        title="Снять волонтёра?"
        label="Причина (необязательно)"
        confirmLabel="Снять"
        loading={unassign.isPending}
        onSubmit={(r) => unassign.mutate(r, { onSuccess: () => setModal(null) })}
      />
    </>
  );
}

// ───────────── Оценка (ReviewForm) ─────────────

/** Оценка — 5 крупных звёзд. */
export function ReviewForm({ task }: { task: TaskDetail }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const review = useTaskAction(
    task.id,
    () =>
      api.post(`/tasks/${task.id}/reviews`, {
        rating,
        comment: comment.trim() || undefined,
      } satisfies S['CreateReviewDto']),
    'Спасибо за оценку!',
  );
  return (
    <Stack gap="md">
      <Text fw={700} size="lg" id="rating-label">
        Как помог волонтёр?
      </Text>
      <Rating value={rating} onChange={setRating} size="xl" aria-labelledby="rating-label" />
      <Textarea
        label="Отзыв"
        description="Необязательно"
        value={comment}
        onChange={(e) => setComment(e.currentTarget.value)}
        maxLength={1000}
      />
      <Button
        size="lg"
        disabled={!rating}
        loading={review.isPending}
        onClick={() => review.mutate()}
        style={{ alignSelf: 'flex-start' }}
      >
        Отправить оценку
      </Button>
    </Stack>
  );
}

// ───────────── Повторить (RepeatTask) ─────────────

/** Повтор прошлой заявки одной кнопкой: тот же список, новое время. */
export function RepeatTask({
  taskId,
  basePath,
  size = 'lg',
}: {
  taskId: string;
  basePath: string;
  size?: 'md' | 'lg';
}) {
  const [opened, setOpened] = useState(false);
  const router = useRouter();
  const today = todayYmd();
  const [ymd, setYmd] = useState(addDaysYmd(today, 1));
  const [part, setPart] = useState<DayPart>('morning');
  const repeat = useTaskAction(
    taskId,
    async () => {
      const { data } = await api.post<S['TaskDetailDto']>(
        `/tasks/${taskId}/repeat`,
        slotWindow(ymd, part),
      );
      router.push(`${basePath}/tasks/${data.id}`);
    },
    'Новая заявка создана',
  );

  const days = [today, addDaysYmd(today, 1), addDaysYmd(today, 2)];
  const dayNames = ['Сегодня', 'Завтра', 'Послезавтра'];

  return (
    <>
      <Button
        size={size}
        variant="light"
        leftSection={<IconRepeat aria-hidden />}
        onClick={() => setOpened(true)}
      >
        Повторить заявку
      </Button>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          <Text fw={700} size="lg">
            Когда повторить?
          </Text>
        }
      >
        <Stack gap="md">
          <Group gap="sm" grow>
            {days.map((d, i) => (
              <Button
                key={d}
                variant={ymd === d ? 'filled' : 'default'}
                onClick={() => setYmd(d)}
                aria-pressed={ymd === d}
              >
                {dayNames[i]}
              </Button>
            ))}
          </Group>
          <Group gap="sm" grow>
            {(Object.keys(DAY_PARTS) as DayPart[]).map((p) => (
              <Button
                key={p}
                variant={part === p ? 'filled' : 'default'}
                disabled={!isSlotAvailable(ymd, p)}
                onClick={() => setPart(p)}
                aria-pressed={part === p}
              >
                {DAY_PARTS[p].label}
              </Button>
            ))}
          </Group>
          {!isSlotAvailable(ymd, part) && (
            <Alert color="yellow" c="yellow.9">
              Это время уже прошло — выберите другое.
            </Alert>
          )}
          <Button
            size="lg"
            disabled={!isSlotAvailable(ymd, part)}
            loading={repeat.isPending}
            onClick={() => repeat.mutate()}
          >
            Создать такую же заявку
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
