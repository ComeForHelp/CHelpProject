import { Injectable } from '@nestjs/common';
import { AccessService } from '../../common/access/access.service';
import { TaskAccessContext } from '../../common/guards/task-access.guard';
import { AuthUser } from '../../common/types';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly notifications: NotificationsService,
  ) {}

  list(ctx: TaskAccessContext) {
    return this.prisma.taskComment.findMany({
      where: { taskId: ctx.task.id },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
  }

  async create(user: AuthUser, ctx: TaskAccessContext, text: string) {
    const comment = await this.prisma.taskComment.create({
      data: { taskId: ctx.task.id, authorId: user.id, text },
      include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: ctx.task.id },
      select: { title: true },
    });
    const owners = await this.access.ownerUserIds(ctx.task.recipientId);
    await this.notifications.notify(
      [...owners, ctx.task.volunteerId].filter((id) => id !== user.id),
      {
        type: NotificationType.TASK_COMMENT,
        title: `Новое сообщение по заявке «${task.title}»`,
        body: text.length > 140 ? `${text.slice(0, 140)}…` : text,
        taskId: ctx.task.id,
      },
    );
    return comment;
  }
}
