import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { TaskAccessContext } from '../../common/guards/task-access.guard';
import { AuthUser } from '../../common/types';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import { CreateReviewDto } from './dto/reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  list(ctx: TaskAccessContext) {
    return this.prisma.review.findMany({
      where: { taskId: ctx.task.id },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
  }

  /**
   * Оценку волонтёру ставит получатель, его родственник или координатор —
   * после подтверждения выполнения. Одна оценка от автора на заявку.
   */
  async create(user: AuthUser, ctx: TaskAccessContext, dto: CreateReviewDto) {
    if (ctx.relation !== 'OWNER' && ctx.relation !== 'STAFF') {
      throw new ForbiddenException('Оценку ставит получатель, родственник или координатор');
    }
    if (ctx.task.status !== TaskStatus.CONFIRMED) {
      throw new ConflictException('Оценить можно после подтверждения выполнения');
    }
    const volunteerId = ctx.task.volunteerId;
    if (!volunteerId) throw new ConflictException('У заявки нет волонтёра');

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          taskId: ctx.task.id,
          authorId: user.id,
          targetId: volunteerId,
          rating: dto.rating,
          comment: dto.comment,
        },
      });
      await this.recalcRating(volunteerId, tx);
      return created;
    });

    await this.notifications.notify([volunteerId], {
      type: NotificationType.REVIEW_RECEIVED,
      title: `Новая оценка: ${'★'.repeat(dto.rating)}`,
      body: dto.comment,
      taskId: ctx.task.id,
    });
    return review;
  }

  /** rating_avg — средняя по всем полученным оценкам, 2 знака. */
  private async recalcRating(volunteerId: string, tx: Prisma.TransactionClient) {
    const agg = await tx.review.aggregate({
      where: { targetId: volunteerId },
      _avg: { rating: true },
    });
    await tx.volunteerProfile.updateMany({
      where: { userId: volunteerId },
      data: { ratingAvg: new Prisma.Decimal((agg._avg.rating ?? 0).toFixed(2)) },
    });
  }
}
