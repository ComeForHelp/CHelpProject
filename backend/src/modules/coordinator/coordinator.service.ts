import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Role, TaskStatus, Urgency, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportQueryDto } from './dto/coordinator.dto';

const round = (n: number | null, digits = 1) =>
  n === null || Number.isNaN(n) ? null : Math.round(n * 10 ** digits) / 10 ** digits;

@Injectable()
export class CoordinatorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Счётчики дашборда. Ключи совпадают с фильтрами GET /tasks,
   * чтобы клик по карточке вёл в отфильтрованную таблицу.
   */
  async dashboard() {
    const now = new Date();
    const [
      unassigned,
      urgent,
      overdue,
      inProgress,
      awaitingConfirmation,
      pendingVolunteers,
      todayExpired,
    ] = await this.prisma.$transaction([
      this.prisma.task.count({ where: { status: TaskStatus.NEW } }),
      this.prisma.task.count({ where: { status: TaskStatus.NEW, urgency: Urgency.URGENT } }),
      this.prisma.task.count({
        where: {
          status: { in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS] },
          windowEnd: { lt: now },
        },
      }),
      this.prisma.task.count({
        where: { status: { in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS] } },
      }),
      this.prisma.task.count({ where: { status: TaskStatus.DONE } }),
      this.prisma.volunteerProfile.count({
        where: { verificationStatus: VerificationStatus.PENDING, user: { isActive: true } },
      }),
      this.prisma.task.count({
        where: {
          status: TaskStatus.EXPIRED,
          updatedAt: { gte: new Date(now.getTime() - 24 * 3600_000) },
        },
      }),
    ]);
    return {
      unassigned, // ?status=NEW
      urgent, // ?status=NEW&urgency=URGENT
      overdue, // ?overdue=true
      inProgress, // ?status=ASSIGNED,IN_PROGRESS
      awaitingConfirmation, // ?status=DONE
      pendingVolunteers, // /volunteers?status=PENDING
      expiredLast24h: todayExpired, // ?status=EXPIRED
    };
  }

  /** Метрики пилота за период (данные для задачи 11). */
  async reports(q: ReportQueryDto) {
    const to = q.to ?? new Date();
    const from = q.from ?? new Date(to.getTime() - 30 * 24 * 3600_000);
    if (from >= to) throw new BadRequestException('Начало периода должно быть раньше конца');
    const created = { gte: from, lt: to };

    const [
      usersByRole,
      newUsersByRole,
      tasksByStatus,
      tasksByCategory,
      ratingAgg,
      volunteersVerified,
    ] = await this.prisma.$transaction([
      this.prisma.user.groupBy({
        by: ['role'],
        where: { isActive: true },
        _count: { _all: true },
        orderBy: { role: 'asc' },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        where: { createdAt: created },
        _count: { _all: true },
        orderBy: { role: 'asc' },
      }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: { createdAt: created },
        _count: { _all: true },
        orderBy: { status: 'asc' },
      }),
      this.prisma.task.groupBy({
        by: ['categoryId'],
        where: { createdAt: created },
        _count: { _all: true },
        orderBy: { categoryId: 'asc' },
      }),
      this.prisma.review.aggregate({
        where: { createdAt: created },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.volunteerProfile.count({
        where: { verificationStatus: VerificationStatus.VERIFIED },
      }),
    ]);

    // Средние времена считаем в SQL: Prisma не умеет агрегировать разность дат.
    const [timing] = await this.prisma.$queryRaw<
      Array<{
        response_min: number | null;
        completion_min: number | null;
        confirm_min: number | null;
      }>
    >(Prisma.sql`
      SELECT
        AVG(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 60)::float  AS response_min,
        AVG(EXTRACT(EPOCH FROM (done_at - accepted_at)) / 60)::float      AS completion_min,
        AVG(EXTRACT(EPOCH FROM (confirmed_at - done_at)) / 60)::float     AS confirm_min
      FROM tasks
      WHERE created_at >= ${from} AND created_at < ${to}
    `);

    const byDistrict = await this.prisma.$queryRaw<
      Array<{ district_id: number; name: string; total: bigint; completed: bigint }>
    >(Prisma.sql`
      SELECT d.id AS district_id, d.name,
             COUNT(t.id) AS total,
             COUNT(t.id) FILTER (WHERE t.status IN ('DONE', 'CONFIRMED')) AS completed
      FROM tasks t
      JOIN addresses a ON a.id = t.address_id
      JOIN districts d ON d.id = a.district_id
      WHERE t.created_at >= ${from} AND t.created_at < ${to}
      GROUP BY d.id, d.name
      ORDER BY d.name
    `);

    const activeVolunteers = await this.prisma.task.findMany({
      where: { createdAt: created, volunteerId: { not: null } },
      distinct: ['volunteerId'],
      select: { volunteerId: true },
    });

    const categories = await this.prisma.taskCategory.findMany();
    /** groupBy → { ключ: число }, отсутствующие ключи = 0. */
    const tally = <K extends string | number>(
      keys: K[],
      rows: Array<{ _count?: unknown }>,
      keyOf: (r: never) => K,
    ): Record<K, number> => {
      const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
      for (const r of rows) {
        const k = keyOf(r as never);
        out[k] = (out[k] ?? 0) + ((r._count as { _all?: number } | undefined)?._all ?? 0);
      }
      return out;
    };

    const roles = Object.values(Role);
    const byStatus = tally(
      Object.values(TaskStatus),
      tasksByStatus,
      (r: { status: TaskStatus }) => r.status,
    );
    const byCategoryId = tally(
      categories.map((c) => c.id),
      tasksByCategory,
      (r: { categoryId: number }) => r.categoryId,
    );
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const completed = byStatus.DONE + byStatus.CONFIRMED;
    // Доля выполненных среди заявок, судьба которых уже решена (без ещё открытых).
    const closed = completed + byStatus.CANCELLED + byStatus.EXPIRED;

    return {
      period: { from, to },
      users: {
        activeByRole: tally(roles, usersByRole, (r: { role: Role }) => r.role),
        newByRole: tally(roles, newUsersByRole, (r: { role: Role }) => r.role),
        volunteersVerified,
        volunteersActiveInPeriod: activeVolunteers.length,
      },
      tasks: {
        total,
        byStatus,
        completed,
        completionRate: total ? round((completed / total) * 100) : null,
        completionRateOfClosed: closed ? round((completed / closed) * 100) : null,
        byCategory: categories.map((c) => ({
          categoryId: c.id,
          name: c.name,
          total: byCategoryId[c.id],
        })),
        byDistrict: byDistrict.map((d) => ({
          districtId: d.district_id,
          name: d.name,
          total: Number(d.total),
          completed: Number(d.completed),
        })),
      },
      timing: {
        avgResponseMinutes: round(timing?.response_min ?? null),
        avgCompletionMinutes: round(timing?.completion_min ?? null),
        avgConfirmMinutes: round(timing?.confirm_min ?? null),
      },
      reviews: {
        count: ratingAgg._count._all,
        avgRating: round(ratingAgg._avg.rating ?? null, 2),
      },
    };
  }
}
