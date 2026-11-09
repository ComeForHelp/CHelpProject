'use client';

import {
  Alert,
  Badge,
  Button,
  Divider,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconInfoCircle, IconUserPlus } from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import { AddressView } from '@/entities/address';
import { CategoryIcon } from '@/entities/category';
import {
  ShoppingListView,
  StatusHistory,
  TaskStatusTimeline,
  useTask,
  useTaskHistory,
} from '@/entities/task';
import { RecipientContact, VolunteerContact } from '@/entities/user';
import { ReviewForm, RepeatTask, StatusActions, TakeTaskButton } from '@/features/task-actions';
import {
  AssignVolunteerModal,
  Attachments,
  ShoppingChecklist,
  TaskComments,
} from '@/features/task-content';
import { PAYMENT_METHOD } from '@/shared/config/dictionaries';
import { formatWindow } from '@/shared/lib/date';
import { formatMoney, formatPhone } from '@/shared/lib/format';
import { ErrorBlock, LoadingBlock, PhoneLink, StatusBadge } from '@/shared/ui';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Title order={2} size="h3">
          {title}
        </Title>
        {children}
      </Stack>
    </Paper>
  );
}

function StaffHistory({ taskId }: { taskId: string }) {
  const history = useTaskHistory(taskId);
  if (history.isPending) return <LoadingBlock />;
  return <StatusHistory entries={history.data ?? []} />;
}

/**
 * TaskDetails — полная карточка заявки. Один компонент на все роли:
 * поля и кнопки зависят от того, кто смотрит (viewerRelation) и от статуса.
 * basePath — раздел, в котором открыта карточка (/my, /family/<id>, /volunteer, /coord).
 */
export function TaskDetails({ taskId, basePath }: { taskId: string; basePath: string }) {
  const query = useTask(taskId);
  const [assignOpened, setAssignOpened] = useState(false);

  if (query.isPending) return <LoadingBlock label="Загружаем заявку…" />;
  if (query.error || !query.data)
    return <ErrorBlock error={query.error} onRetry={() => query.refetch()} />;
  const task = query.data;

  const rel = task.viewerRelation;
  const isCatalog = rel === 'CATALOG';
  const isOwner = rel === 'OWNER';
  const isStaff = rel === 'STAFF';
  const isVolunteer = rel === 'VOLUNTEER';
  const final = ['CONFIRMED', 'CANCELLED', 'EXPIRED'].includes(task.status);
  const shopping = ['ASSIGNED', 'IN_PROGRESS'].includes(task.status) && (isVolunteer || isStaff);
  const canReview =
    (isOwner || isStaff) && task.status === 'CONFIRMED' && !!task.volunteer && !task.myReview;

  const header = (
    <Stack gap="xs">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <CategoryIcon code={task.category.code} size={40} />
        <Stack gap={4}>
          <Title order={1}>{task.title}</Title>
          <Text size="lg" fw={600}>
            {formatWindow(task.windowStart, task.windowEnd)}
          </Text>
        </Stack>
      </Group>
      <Group gap="xs">
        <StatusBadge status={task.status} size="xl" />
        {task.urgency === 'URGENT' && (
          <Badge color="red" c="red.9" size="xl">
            Срочно
          </Badge>
        )}
        <Badge color="gray" c="gray.9" size="xl">
          {task.category.name}
        </Badge>
      </Group>
    </Stack>
  );

  const actions = (
    <Stack gap="sm">
      {isCatalog && task.canTake && <TakeTaskButton task={task} />}
      {!isCatalog && <StatusActions task={task} />}
      {isStaff && !final && task.status !== 'DONE' && task.status !== 'IN_PROGRESS' && (
        <Button
          size="lg"
          variant="light"
          leftSection={<IconUserPlus aria-hidden />}
          onClick={() => setAssignOpened(true)}
        >
          {task.volunteer ? 'Назначить другого волонтёра' : 'Назначить волонтёра'}
        </Button>
      )}
      {(isOwner || isStaff) && final && <RepeatTask taskId={task.id} basePath={basePath} />}
    </Stack>
  );

  const main = (
    <Stack gap="md">
      {isCatalog && (
        <Alert color="blue" c="blue.9" icon={<IconInfoCircle aria-hidden />}>
          Полный адрес, телефон и особенности получателя откроются, когда вы возьмёте заявку.
        </Alert>
      )}

      {!isCatalog && (
        <Section title="Ход выполнения">
          <TaskStatusTimeline task={task} />
        </Section>
      )}

      {canReview && (
        <Section title="Оценка">
          <ReviewForm task={task} />
        </Section>
      )}
      {task.myReview && (
        <Alert color="green" c="green.9">
          Ваша оценка: {'★'.repeat(task.myReview.rating)}
          {task.myReview.comment ? ` — «${task.myReview.comment}»` : ''}
        </Alert>
      )}

      {(isOwner || isStaff) && (
        <Section title="Волонтёр">
          {task.volunteer ? (
            <VolunteerContact volunteer={task.volunteer} />
          ) : (
            <Text>
              {final
                ? 'Волонтёра не было'
                : 'Ищем волонтёра. Как только кто-то возьмёт заявку, вы увидите его здесь.'}
            </Text>
          )}
        </Section>
      )}

      {(isVolunteer || isStaff) && (
        <Section title="Получатель">
          <RecipientContact recipient={task.recipient} />
          {!!task.relatives?.length && (
            <>
              <Divider />
              <Text fw={600}>Родственники</Text>
              {task.relatives.map((r) => (
                <Group key={r.id} gap="sm" wrap="wrap">
                  <Text>
                    {r.firstName} {r.lastName}
                    {r.relation ? ` (${r.relation})` : ''} · {formatPhone(r.phone)}
                  </Text>
                  <PhoneLink phone={r.phone} size="md" variant="light" />
                </Group>
              ))}
            </>
          )}
        </Section>
      )}
      {isCatalog && <Text>Получатель: {task.recipient.firstName}</Text>}

      <Section title={task.destination ? 'Откуда и куда' : 'Адрес'}>
        <AddressView address={task.address} />
        {task.destination && <Text fw={600}>Куда проводить: {task.destination}</Text>}
      </Section>

      {(task.items.length > 0 || task.description) && (
        <Section
          title={task.category.code === 'medicine' ? 'Список лекарств' : 'Список и подробности'}
        >
          {task.items.length > 0 &&
            (shopping ? (
              <ShoppingChecklist task={task} />
            ) : (
              <ShoppingListView items={task.items} />
            ))}
          {task.description && <Text style={{ whiteSpace: 'pre-wrap' }}>{task.description}</Text>}
        </Section>
      )}

      {task.paymentMethod !== 'NONE' && (
        <Section title="Оплата">
          <Text fw={600}>{PAYMENT_METHOD[task.paymentMethod].label}</Text>
          {task.estimatedCost ? <Text>Примерно {formatMoney(task.estimatedCost)}</Text> : null}
        </Section>
      )}

      {!isCatalog && (
        <Section title="Чеки и фото">
          <Attachments task={task} canUpload={isVolunteer || isStaff || isOwner} />
        </Section>
      )}

      {!isCatalog && (
        <Section title="Сообщения">
          <TaskComments taskId={task.id} />
        </Section>
      )}

      {isStaff && (
        <Section title="История статусов">
          <StaffHistory taskId={task.id} />
        </Section>
      )}
    </Stack>
  );

  return (
    <Stack gap="lg">
      {header}
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 8 }} order={{ base: 2, md: 1 }}>
          {main}
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }} order={{ base: 1, md: 2 }}>
          <div style={{ position: 'sticky', top: '1rem' }}>{actions}</div>
        </Grid.Col>
      </Grid>
      {isStaff && (
        <AssignVolunteerModal
          task={task}
          opened={assignOpened}
          onClose={() => setAssignOpened(false)}
        />
      )}
    </Stack>
  );
}
