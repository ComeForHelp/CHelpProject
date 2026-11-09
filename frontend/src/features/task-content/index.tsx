'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  FileButton,
  Group,
  Image,
  Loader,
  Modal,
  Paper,
  Rating,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCamera, IconFileTypePdf, IconSearch, IconSend, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useVolunteers } from '@/entities/volunteer';
import { type TaskDetail, taskKeys, useTaskComments } from '@/entities/task';
import { api } from '@/shared/api/client';
import { getErrorMessage } from '@/shared/api/errors';
import type { AttachmentKind, S } from '@/shared/api/types';
import { ATTACHMENT_KIND, ROLE_LABEL } from '@/shared/config/dictionaries';
import { formatDateTime } from '@/shared/lib/date';
import { formatPhone, shortName } from '@/shared/lib/format';
import { useSession } from '@/shared/model/session';
import { EmptyState, LoadingBlock, confirmAction } from '@/shared/ui';

// ───────────── Список покупок с отметками (ShoppingChecklist) ─────────────

/** Волонтёр отмечает купленное. Отметка сразу видна и получателю. */
export function ShoppingChecklist({ task }: { task: TaskDetail }) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: ({ id, isChecked }: { id: string; isChecked: boolean }) =>
      api.patch(`/tasks/${task.id}/items/${id}`, { isChecked } satisfies S['UpdateTaskItemDto']),
    // Отметка появляется сразу, не дожидаясь сервера
    onMutate: async ({ id, isChecked }) => {
      const key = taskKeys.detail(task.id);
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<TaskDetail>(key);
      if (prev) {
        queryClient.setQueryData<TaskDetail>(key, {
          ...prev,
          items: prev.items.map((i) => (i.id === id ? { ...i, isChecked } : i)),
        });
      }
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(taskKeys.detail(task.id), ctx.prev);
      notifications.show({ color: 'red', message: getErrorMessage(e) });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.id) }),
  });

  const done = task.items.filter((i) => i.isChecked).length;
  return (
    <Stack gap="sm">
      <Text c="dimmed">
        Куплено {done} из {task.items.length}
      </Text>
      {task.items.map((item) => (
        <Paper
          key={item.id}
          withBorder
          p="sm"
          radius="md"
          bg={item.isChecked ? 'green.0' : undefined}
        >
          <Checkbox
            size="lg"
            checked={item.isChecked}
            onChange={(e) => toggle.mutate({ id: item.id, isChecked: e.currentTarget.checked })}
            label={
              <Text size="lg" td={item.isChecked ? 'line-through' : undefined}>
                {item.name}
                {item.quantity ? ` — ${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : ''}
                {item.note ? ` (${item.note})` : ''}
              </Text>
            }
          />
        </Paper>
      ))}
    </Stack>
  );
}

// ───────────── Вложения: чек, рецепт ─────────────

/**
 * Файл отдаётся только с токеном, поэтому <img src> не сработает:
 * скачиваем как blob и показываем через object URL.
 */
function useAttachmentBlob(taskId: string, id: string) {
  const query = useQuery({
    queryKey: ['attachment-blob', id],
    queryFn: async () =>
      (await api.get<Blob>(`/tasks/${taskId}/attachments/${id}/file`, { responseType: 'blob' }))
        .data,
    staleTime: Infinity,
  });
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!query.data) return;
    const u = URL.createObjectURL(query.data);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [query.data]);
  return { url, isPending: query.isPending };
}

function AttachmentThumb({
  taskId,
  attachment,
  canDelete,
}: {
  taskId: string;
  attachment: S['TaskAttachmentShortDto'];
  canDelete: boolean;
}) {
  const { url, isPending } = useAttachmentBlob(taskId, attachment.id);
  const [opened, setOpened] = useState(false);
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => api.delete(`/tasks/${taskId}/attachments/${attachment.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) }),
    onError: (e) => notifications.show({ color: 'red', message: getErrorMessage(e) }),
  });
  const isPdf = attachment.mimeType === 'application/pdf';
  const label = `${ATTACHMENT_KIND[attachment.kind]} от ${formatDateTime(attachment.createdAt)}`;

  return (
    <Paper withBorder radius="md" p="xs">
      <Stack gap={6}>
        {isPending || !url ? (
          <Group h={120} justify="center">
            <Loader size="sm" />
          </Group>
        ) : isPdf ? (
          <Button
            component="a"
            href={url}
            target="_blank"
            variant="light"
            h={120}
            leftSection={<IconFileTypePdf aria-hidden />}
          >
            Открыть PDF
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => setOpened(true)}
            style={{ padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }}
            aria-label={`Открыть: ${label}`}
          >
            <Image src={url} alt={label} h={120} fit="cover" radius="sm" />
          </button>
        )}
        <Group justify="space-between" wrap="nowrap" gap={4}>
          <Badge color="gray" c="gray.9" size="md">
            {ATTACHMENT_KIND[attachment.kind]}
          </Badge>
          {canDelete && (
            <ActionIcon
              variant="subtle"
              color="red"
              size="lg"
              aria-label="Удалить файл"
              onClick={() =>
                confirmAction({
                  title: 'Удалить файл?',
                  message: label,
                  confirmLabel: 'Удалить',
                  danger: true,
                  onConfirm: () => remove.mutate(),
                })
              }
            >
              <IconTrash size={20} aria-hidden />
            </ActionIcon>
          )}
        </Group>
      </Stack>
      <Modal opened={opened} onClose={() => setOpened(false)} size="xl" title={label}>
        {url && <Image src={url} alt={label} />}
      </Modal>
    </Paper>
  );
}

/** Фото чека или рецепта. Вложения закрытой заявки удалить нельзя. */
export function Attachments({ task, canUpload }: { task: TaskDetail; canUpload: boolean }) {
  const userId = useSession((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<AttachmentKind>('RECEIPT');
  const closed = ['CONFIRMED', 'CANCELLED', 'EXPIRED'].includes(task.status);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('kind', kind);
      form.append('file', file);
      await api.post(`/tasks/${task.id}/attachments`, form);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.id) });
      notifications.show({ color: 'green', message: 'Фото загружено' });
    },
    onError: (e) =>
      notifications.show({ color: 'red', title: 'Не загрузилось', message: getErrorMessage(e) }),
  });
  const list = task.attachments ?? [];

  return (
    <Stack gap="sm">
      {list.length ? (
        <SimpleGrid cols={{ base: 2, sm: 3 }}>
          {list.map((a) => (
            <AttachmentThumb
              key={a.id}
              taskId={task.id}
              attachment={a}
              canDelete={!closed && (a.uploadedById === userId || task.viewerRelation === 'STAFF')}
            />
          ))}
        </SimpleGrid>
      ) : (
        <Text c="dimmed">Фото чека пока нет</Text>
      )}
      {canUpload && !closed && (
        <Stack gap="xs">
          <SegmentedControl
            value={kind}
            onChange={(v) => setKind(v as AttachmentKind)}
            data={(Object.keys(ATTACHMENT_KIND) as AttachmentKind[]).map((k) => ({
              value: k,
              label: ATTACHMENT_KIND[k],
            }))}
            aria-label="Что загружаете"
          />
          <FileButton
            onChange={(f) => f && upload.mutate(f)}
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            capture="environment"
          >
            {(props) => (
              <Button
                {...props}
                size="lg"
                variant="light"
                leftSection={<IconCamera aria-hidden />}
                loading={upload.isPending}
              >
                Сфотографировать или выбрать файл
              </Button>
            )}
          </FileButton>
        </Stack>
      )}
    </Stack>
  );
}

// ───────────── Переписка внутри заявки ─────────────

export function TaskComments({ taskId }: { taskId: string }) {
  const comments = useTaskComments(taskId);
  const userId = useSession((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const send = useMutation({
    mutationFn: () =>
      api.post(`/tasks/${taskId}/comments`, { text: text.trim() } satisfies S['CreateCommentDto']),
    onSuccess: () => {
      setText('');
      void queryClient.invalidateQueries({ queryKey: taskKeys.comments(taskId) });
    },
    onError: (e) => notifications.show({ color: 'red', message: getErrorMessage(e) }),
  });

  return (
    <Stack gap="sm">
      {comments.isPending ? (
        <LoadingBlock />
      ) : comments.data?.length ? (
        comments.data.map((c) => {
          const mine = c.authorId === userId;
          return (
            <Paper
              key={c.id}
              p="sm"
              radius="md"
              bg={mine ? 'blue.0' : 'gray.1'}
              ml={mine ? 'xl' : 0}
              mr={mine ? 0 : 'xl'}
            >
              <Text size="sm" c="dimmed">
                {mine
                  ? 'Вы'
                  : `${shortName(c.author)} · ${ROLE_LABEL[c.author.role].toLowerCase()}`}{' '}
                · {formatDateTime(c.createdAt)}
              </Text>
              <Text style={{ whiteSpace: 'pre-wrap' }}>{c.text}</Text>
            </Paper>
          );
        })
      ) : (
        <Text c="dimmed">Сообщений пока нет</Text>
      )}
      <Group align="flex-end" wrap="nowrap" gap="sm">
        <Textarea
          style={{ flex: 1 }}
          label="Сообщение"
          placeholder="Например: «Буду через 20 минут»"
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          maxLength={2000}
        />
        <Button
          size="lg"
          leftSection={<IconSend aria-hidden />}
          disabled={!text.trim()}
          loading={send.isPending}
          onClick={() => send.mutate()}
        >
          Отправить
        </Button>
      </Group>
    </Stack>
  );
}

// ───────────── Назначить волонтёра (AssignVolunteerModal) ─────────────

/** Поиск волонтёра по району заявки и рейтингу. */
export function AssignVolunteerModal({
  task,
  opened,
  onClose,
}: {
  task: TaskDetail;
  opened: boolean;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [onlyDistrict, setOnlyDistrict] = useState(true);
  const districtId = task.address.district.id;
  const volunteers = useVolunteers({
    status: 'VERIFIED',
    districtId: onlyDistrict ? districtId : undefined,
    q: q || undefined,
    sort: 'rating',
    limit: 20,
  });
  const queryClient = useQueryClient();
  const assign = useMutation({
    mutationFn: (volunteerId: string) =>
      api.post(`/tasks/${task.id}/assign`, { volunteerId } satisfies S['AssignVolunteerDto']),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.all });
      notifications.show({ color: 'green', message: 'Волонтёр назначен и получил уведомление' });
      onClose();
    },
    onError: (e) => notifications.show({ color: 'red', message: getErrorMessage(e) }),
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={
        <Text fw={700} size="lg">
          Назначить волонтёра
        </Text>
      }
    >
      <Stack gap="md">
        <Group gap="sm" align="flex-end">
          <TextInput
            style={{ flex: 1 }}
            label="Поиск по ФИО или телефону"
            leftSection={<IconSearch size={18} aria-hidden />}
            value={q}
            onChange={(e) => setQ(e.currentTarget.value)}
          />
          <Checkbox
            label={`Только ${task.address.district.name} район`}
            checked={onlyDistrict}
            onChange={(e) => setOnlyDistrict(e.currentTarget.checked)}
          />
        </Group>
        {volunteers.isPending ? (
          <LoadingBlock />
        ) : volunteers.data?.items.length ? (
          <Stack gap="xs">
            {volunteers.data.items.map((v) => (
              <Paper key={v.id} withBorder p="sm" radius="md">
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={2}>
                    <Text fw={700}>
                      {v.lastName} {v.firstName}
                      {v.id === task.volunteer?.id ? ' (назначен сейчас)' : ''}
                    </Text>
                    <Group gap="xs">
                      <Rating
                        value={v.ratingAvg}
                        fractions={2}
                        readOnly
                        size="sm"
                        aria-label={`Рейтинг ${v.ratingAvg}`}
                      />
                      <Text size="sm" c="dimmed">
                        {v.ratingAvg.toFixed(1)} · выполнено {v.tasksDone} ·{' '}
                        {v.hasCar ? 'есть машина · ' : ''}
                        {formatPhone(v.phone)}
                      </Text>
                    </Group>
                    <Text size="sm" c="dimmed">
                      Районы: {v.districts.map((d) => d.name).join(', ') || 'не указаны'}
                    </Text>
                  </Stack>
                  <Button
                    size="md"
                    disabled={v.id === task.volunteer?.id}
                    loading={assign.isPending && assign.variables === v.id}
                    onClick={() => assign.mutate(v.id)}
                  >
                    Назначить
                  </Button>
                </Group>
              </Paper>
            ))}
          </Stack>
        ) : (
          <EmptyState
            title="Никого не нашли"
            text={
              onlyDistrict
                ? 'Снимите галочку района, чтобы искать по всему городу'
                : 'Попробуйте изменить поиск'
            }
          />
        )}
      </Stack>
    </Modal>
  );
}
