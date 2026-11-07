import { ConflictException, ForbiddenException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';

/**
 * Жизненный цикл заявки (раздел 3 документа):
 *
 *   NEW ──взял──▶ ASSIGNED ──начал──▶ IN_PROGRESS ──выполнил──▶ DONE ──принял──▶ CONFIRMED
 *    ▲  │            │ │
 *    │  │            │ └──отмена──▶ CANCELLED ◀──отмена── NEW
 *    └──┼──отказался─┘
 *       └──окно истекло (cron)──▶ EXPIRED
 *
 * Отменить можно только до начала выполнения. Заявка закрывается только после подтверждения
 * получателем (или координатором).
 */

/** Кто совершает переход. OWNER — получатель или его подтверждённый родственник. */
export type TaskActor = 'OWNER' | 'VOLUNTEER' | 'STAFF' | 'SYSTEM';

export interface TaskTransition {
  from: TaskStatus;
  to: TaskStatus;
  actors: readonly TaskActor[];
  /** Короткое описание для журнала и документации. */
  label: string;
}

const { NEW, ASSIGNED, IN_PROGRESS, DONE, CONFIRMED, CANCELLED, EXPIRED } = TaskStatus;

export const TASK_TRANSITIONS: readonly TaskTransition[] = [
  // SYSTEM — назначение предпочтительного волонтёра регулярного правила.
  { from: NEW, to: ASSIGNED, actors: ['VOLUNTEER', 'STAFF', 'SYSTEM'], label: 'Волонтёр взял' },
  {
    from: ASSIGNED,
    to: NEW,
    actors: ['VOLUNTEER', 'STAFF', 'SYSTEM'],
    label: 'Волонтёр отказался',
  },
  { from: ASSIGNED, to: IN_PROGRESS, actors: ['VOLUNTEER', 'STAFF'], label: 'Начал выполнение' },
  { from: IN_PROGRESS, to: DONE, actors: ['VOLUNTEER', 'STAFF'], label: 'Выполнено' },
  { from: DONE, to: CONFIRMED, actors: ['OWNER', 'STAFF'], label: 'Получатель принял' },
  { from: NEW, to: CANCELLED, actors: ['OWNER', 'STAFF'], label: 'Отмена' },
  { from: ASSIGNED, to: CANCELLED, actors: ['OWNER', 'STAFF'], label: 'Отмена' },
  { from: NEW, to: EXPIRED, actors: ['SYSTEM'], label: 'Окно истекло' },
];

/** Понятные слова вместо терминов — для ошибок и уведомлений. */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  NEW: 'Ждёт волонтёра',
  ASSIGNED: 'Волонтёр взял',
  IN_PROGRESS: 'Выполняется',
  DONE: 'Волонтёр выполнил',
  CONFIRMED: 'Получатель принял',
  CANCELLED: 'Отменена',
  EXPIRED: 'Не взята в срок',
};

/** Заявка ещё «живая» — показывается в активных. */
export const ACTIVE_STATUSES: TaskStatus[] = [NEW, ASSIGNED, IN_PROGRESS, DONE];
/** Финальные статусы — история. */
export const FINAL_STATUSES: TaskStatus[] = [CONFIRMED, CANCELLED, EXPIRED];
/** Пока заявку можно редактировать (список покупок, описание, время). */
export const EDITABLE_STATUSES: TaskStatus[] = [NEW, ASSIGNED];

export function findTransition(from: TaskStatus, to: TaskStatus): TaskTransition | undefined {
  return TASK_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

export function canTransition(from: TaskStatus, to: TaskStatus, actor: TaskActor): boolean {
  return !!findTransition(from, to)?.actors.includes(actor);
}

/** Куда можно перевести заявку из текущего статуса этому участнику — для кнопок на фронтенде. */
export function availableTransitions(from: TaskStatus, actor: TaskActor): TaskStatus[] {
  return TASK_TRANSITIONS.filter((t) => t.from === from && t.actors.includes(actor)).map(
    (t) => t.to,
  );
}

/**
 * 409 — переход вообще невозможен из текущего статуса (например, отменить выполняемую заявку);
 * 403 — переход есть, но этому участнику он не разрешён.
 */
export function assertTransition(from: TaskStatus, to: TaskStatus, actor: TaskActor): void {
  const transition = findTransition(from, to);
  if (!transition) {
    throw new ConflictException(
      `Нельзя перевести заявку из «${TASK_STATUS_LABELS[from]}» в «${TASK_STATUS_LABELS[to]}»`,
    );
  }
  if (!transition.actors.includes(actor)) {
    throw new ForbiddenException('Это действие с заявкой вам недоступно');
  }
}
