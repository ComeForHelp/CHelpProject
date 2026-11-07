import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { AccessService } from '../../common/access/access.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationInput,
  NotificationsService,
  NotificationType,
} from '../notifications/notifications.service';
import { TaskActor, assertTransition } from './task-status.machine';

export interface TransitionParams {
  taskId: string;
  /** Статус, который видел вызывающий; если он уже изменился — 409 (защита от гонок). */
  from: TaskStatus;
  to: TaskStatus;
  actor: TaskActor;
  /** null — система (cron). */
  actorUserId: string | null;
  comment?: string;
  /** Для перехода в ASSIGNED — кого назначаем. */
  volunteerId?: string;
  /** Не рассылать уведомления (например, при массовой генерации). */
  silent?: boolean;
}

type Tx = Prisma.TransactionClient;

/**
 * Единственное место, где меняется tasks.status.
 * Проверяет переход по машине состояний, проставляет отметки времени,
 * пишет task_status_history и рассылает уведомления.
 */
@Injectable()
export class TaskStatusService {
  private readonly logger = new Logger(TaskStatusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly notifications: NotificationsService,
  ) {}

  async transition(params: TransitionParams, tx?: Tx): Promise<void> {
    assertTransition(params.from, params.to, params.actor);

    const run = async (db: Tx) => {
      const before = await db.task.findUniqueOrThrow({
        where: { id: params.taskId },
        select: { volunteerId: true, recipientId: true, title: true },
      });

      const now = new Date();
      const data: Prisma.TaskUncheckedUpdateManyInput = { status: params.to };
      switch (params.to) {
        case TaskStatus.ASSIGNED:
          if (!params.volunteerId) throw new ConflictException('Не указан волонтёр');
          data.volunteerId = params.volunteerId;
          data.acceptedAt = now;
          break;
        case TaskStatus.NEW: // волонтёр отказался — заявка возвращается в каталог
          data.volunteerId = null;
          data.acceptedAt = null;
          data.startedAt = null;
          break;
        case TaskStatus.IN_PROGRESS:
          data.startedAt = now;
          break;
        case TaskStatus.DONE:
          data.doneAt = now;
          break;
        case TaskStatus.CONFIRMED:
          data.confirmedAt = now;
          break;
        case TaskStatus.CANCELLED:
          data.cancelledAt = now;
          data.cancelReason = params.comment ?? null;
          break;
      }

      // Условие по старому статусу — двое волонтёров не смогут взять одну заявку.
      const res = await db.task.updateMany({
        where: { id: params.taskId, status: params.from },
        data,
      });
      if (res.count === 0) {
        throw new ConflictException('Статус заявки уже изменился — обновите страницу');
      }

      await db.taskStatusHistory.create({
        data: {
          taskId: params.taskId,
          fromStatus: params.from,
          toStatus: params.to,
          changedById: params.actorUserId,
          comment: params.comment,
        },
      });

      if (params.to === TaskStatus.CONFIRMED && before.volunteerId) {
        await db.volunteerProfile.updateMany({
          where: { userId: before.volunteerId },
          data: { tasksDone: { increment: 1 } },
        });
      }
      return before;
    };

    const before = tx ? await run(tx) : await this.prisma.$transaction(run);

    if (!params.silent) {
      // Уведомления не должны ломать смену статуса.
      await this.notifyAboutTransition(params, before, tx).catch((e: unknown) =>
        this.logger.error(`Не удалось отправить уведомление: ${String(e)}`),
      );
    }
  }

  /** Запись «заявка создана» в журнале. */
  async logCreated(taskId: string, actorUserId: string | null, db: Tx, comment?: string) {
    await db.taskStatusHistory.create({
      data: {
        taskId,
        fromStatus: null,
        toStatus: TaskStatus.NEW,
        changedById: actorUserId,
        comment,
      },
    });
  }

  private async notifyAboutTransition(
    p: TransitionParams,
    before: { volunteerId: string | null; recipientId: string; title: string },
    tx?: Tx,
  ): Promise<void> {
    const owners = await this.access.ownerUserIds(before.recipientId);
    const others = (ids: Array<string | null | undefined>) =>
      ids.filter((id) => id && id !== p.actorUserId);
    const send = (ids: Array<string | null | undefined>, n: Omit<NotificationInput, 'taskId'>) =>
      this.notifications.notify(others(ids), { ...n, taskId: p.taskId }, tx);
    const t = `«${before.title}»`;

    switch (p.to) {
      case TaskStatus.ASSIGNED:
        await send(owners, {
          type: NotificationType.TASK_ASSIGNED,
          title: 'Вашу заявку взяли',
          body: `Волонтёр взял заявку ${t}. Он позвонит перед выходом.`,
        });
        await send([p.volunteerId], {
          type: NotificationType.TASK_ASSIGNED,
          title: 'Вам назначена заявка',
          body: `Заявка ${t} закреплена за вами.`,
        });
        break;
      case TaskStatus.NEW:
        await send(owners, {
          type: NotificationType.TASK_UNASSIGNED,
          title: 'Ищем другого волонтёра',
          body: `Волонтёр не сможет выполнить заявку ${t}. Она снова в списке открытых.`,
        });
        await send([before.volunteerId], {
          type: NotificationType.TASK_UNASSIGNED,
          title: 'Заявка снята с вас',
          body: p.comment ? `${t}: ${p.comment}` : t,
        });
        break;
      case TaskStatus.IN_PROGRESS:
        await send(owners, {
          type: NotificationType.TASK_STARTED,
          title: 'Волонтёр начал выполнение',
          body: t,
        });
        break;
      case TaskStatus.DONE:
        await send(owners, {
          type: NotificationType.TASK_DONE,
          title: 'Заявка выполнена — подтвердите',
          body: `Проверьте чек и подтвердите выполнение заявки ${t}.`,
        });
        break;
      case TaskStatus.CONFIRMED:
        await send([before.volunteerId], {
          type: NotificationType.TASK_CONFIRMED,
          title: 'Спасибо! Выполнение подтверждено',
          body: t,
        });
        break;
      case TaskStatus.CANCELLED:
        await send([before.volunteerId, ...owners], {
          type: NotificationType.TASK_CANCELLED,
          title: 'Заявка отменена',
          body: p.comment ? `${t}: ${p.comment}` : t,
        });
        break;
      case TaskStatus.EXPIRED:
        await send(owners, {
          type: NotificationType.TASK_EXPIRED,
          title: 'Заявку не успели взять',
          body: `Время для заявки ${t} прошло. Создайте её заново или позвоните координатору.`,
        });
        break;
    }
  }
}
