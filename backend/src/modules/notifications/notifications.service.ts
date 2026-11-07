import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate, paginated } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsQueryDto } from './dto/notifications.dto';

/** Типы уведомлений — фронтенд по ним выбирает иконку и ссылку. */
export const NotificationType = {
  TASK_CREATED: 'TASK_CREATED',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_UNASSIGNED: 'TASK_UNASSIGNED',
  TASK_STARTED: 'TASK_STARTED',
  TASK_DONE: 'TASK_DONE',
  TASK_CONFIRMED: 'TASK_CONFIRMED',
  TASK_CANCELLED: 'TASK_CANCELLED',
  TASK_EXPIRED: 'TASK_EXPIRED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_COMMENT: 'TASK_COMMENT',
  TASK_ATTACHMENT: 'TASK_ATTACHMENT',
  REVIEW_RECEIVED: 'REVIEW_RECEIVED',
  LINK_REQUEST: 'LINK_REQUEST',
  LINK_CONFIRMED: 'LINK_CONFIRMED',
  VOLUNTEER_VERIFICATION: 'VOLUNTEER_VERIFICATION',
} as const;
export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType];

export interface NotificationInput {
  type: NotificationTypeValue;
  title: string;
  body?: string;
  taskId?: string;
}

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Создать уведомление нескольким пользователям (пустые и повторяющиеся id отбрасываются). */
  async notify(
    userIds: Array<string | null | undefined>,
    input: NotificationInput,
    db: Db = this.prisma,
  ): Promise<void> {
    const ids = [...new Set(userIds.filter((id): id is string => !!id))];
    if (!ids.length) return;
    await db.notification.createMany({
      data: ids.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        taskId: input.taskId,
      })),
    });
  }

  async list(userId: string, q: NotificationsQueryDto) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(q.unreadOnly ? { readAt: null } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, ...paginate(q) }),
      this.prisma.notification.count({ where }),
    ]);
    return paginated(items, total, q);
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    return { count: await this.prisma.notification.count({ where: { userId, readAt: null } }) };
  }

  async markRead(userId: string, id: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!n) throw new NotFoundException('Уведомление не найдено');
    if (n.readAt) return n;
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const res = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: res.count };
  }
}
