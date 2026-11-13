'use client';

import {
  Badge,
  Box,
  Button,
  Drawer,
  Indicator,
  Paper,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconBell } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { notificationKeys, useNotifications, useUnreadCount } from '@/entities/notification';
import { api } from '@/shared/api/client';
import type { S } from '@/shared/api/types';
import { formatDateTime } from '@/shared/lib/date';
import { LoadingBlock } from '@/shared/ui';

/**
 * Колокольчик с числом непрочитанных. Список уведомлений открывается кнопкой с подписью,
 * а не скрытым жестом. По клику на уведомление — переход к заявке.
 */
export function NotificationsButton({ taskHref }: { taskHref: (taskId: string) => string }) {
  const [opened, setOpened] = useState(false);
  const unread = useUnreadCount();
  const list = useNotifications(opened);
  const queryClient = useQueryClient();
  const router = useRouter();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.unread });
    void queryClient.invalidateQueries({ queryKey: notificationKeys.list });
  };
  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: refresh,
  });
  const readAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: refresh,
  });

  const open = (n: S['NotificationDto']) => {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.taskId) {
      setOpened(false);
      router.push(taskHref(n.taskId));
    }
  };
  const count = unread.data ?? 0;

  return (
    <>
      <Indicator
        label={count > 99 ? '99+' : count}
        size={22}
        disabled={!count}
        color="red"
        offset={6}
      >
        <Button
          variant="default"
          size="md"
          leftSection={<IconBell size={22} aria-hidden />}
          onClick={() => setOpened(true)}
          aria-label={count ? `Уведомления: ${count} новых` : 'Уведомления'}
        >
          <Box component="span" visibleFrom="sm">
            Уведомления
          </Box>
        </Button>
      </Indicator>
      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        position="right"
        size="md"
        title={
          <Text fw={700} size="lg">
            Уведомления
          </Text>
        }
      >
        <Stack gap="sm">
          {count > 0 && (
            <Button
              variant="light"
              size="md"
              onClick={() => readAll.mutate()}
              loading={readAll.isPending}
            >
              Отметить все прочитанными
            </Button>
          )}
          {list.isPending ? (
            <LoadingBlock />
          ) : list.data?.items.length ? (
            list.data.items.map((n) => (
              <UnstyledButton key={n.id} onClick={() => open(n)} style={{ display: 'block' }}>
                <Paper withBorder p="sm" radius="md" bg={n.readAt ? undefined : 'brand.0'}>
                  <Stack gap={2}>
                    {!n.readAt && (
                      <Badge color="brand" c="brand.8" size="sm">
                        Новое
                      </Badge>
                    )}
                    <Text fw={700}>{n.title}</Text>
                    {n.body && <Text>{n.body}</Text>}
                    <Text size="sm" c="dimmed">
                      {formatDateTime(n.createdAt)}
                    </Text>
                  </Stack>
                </Paper>
              </UnstyledButton>
            ))
          ) : (
            <Text c="dimmed">Уведомлений пока нет</Text>
          )}
        </Stack>
      </Drawer>
    </>
  );
}
