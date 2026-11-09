import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, TaskStatus, VerificationStatus } from '@prisma/client';
import { paginate, paginated, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { userSearchWhere } from '../../common/utils/search';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import { TaskStatusService } from '../tasks/task-status.service';
import {
  UpdateVolunteerProfileDto,
  VerifyVolunteerDto,
  VolunteersQueryDto,
} from './dto/volunteers.dto';

const volunteerListSelect = {
  id: true,
  phone: true,
  lastName: true,
  firstName: true,
  middleName: true,
  isActive: true,
  createdAt: true,
  volunteerProfile: {
    select: {
      verificationStatus: true,
      hasCar: true,
      ratingAvg: true,
      tasksDone: true,
      districts: { select: { district: true } },
    },
  },
} satisfies Prisma.UserSelect;

type VolunteerRow = Prisma.UserGetPayload<{ select: typeof volunteerListSelect }>;

function flatten(v: VolunteerRow) {
  const { volunteerProfile, ...user } = v;
  return {
    ...user,
    verificationStatus: volunteerProfile?.verificationStatus ?? null,
    hasCar: volunteerProfile?.hasCar ?? false,
    ratingAvg: volunteerProfile?.ratingAvg ?? 0,
    tasksDone: volunteerProfile?.tasksDone ?? 0,
    districts: volunteerProfile?.districts.map((d) => d.district) ?? [],
  };
}

@Injectable()
export class VolunteersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly status: TaskStatusService,
    private readonly notifications: NotificationsService,
  ) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.volunteerProfile.findUnique({
      where: { userId },
      include: { districts: { include: { district: true } } },
    });
    if (!profile) throw new NotFoundException('Профиль волонтёра не найден');
    return { ...profile, districts: profile.districts.map((d) => d.district) };
  }

  async updateProfile(userId: string, dto: UpdateVolunteerProfileDto) {
    await this.prisma.$transaction(async (tx) => {
      await tx.volunteerProfile.update({
        where: { userId },
        data: { hasCar: dto.hasCar, about: dto.about },
      });
      if (dto.districtIds) {
        const found = await tx.district.count({ where: { id: { in: dto.districtIds } } });
        if (found !== dto.districtIds.length) throw new BadRequestException('Неизвестный район');
        await tx.volunteerDistrict.deleteMany({ where: { volunteerId: userId } });
        await tx.volunteerDistrict.createMany({
          data: dto.districtIds.map((districtId) => ({ volunteerId: userId, districtId })),
        });
      }
    });
    return this.getProfile(userId);
  }

  /** История волонтёра: выполненные заявки, полученные оценки, рейтинг. */
  async history(userId: string, q: PaginationQueryDto) {
    const where: Prisma.TaskWhereInput = {
      volunteerId: userId,
      status: { in: [TaskStatus.DONE, TaskStatus.CONFIRMED] },
    };
    const [items, total, profile] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        orderBy: { doneAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          windowStart: true,
          doneAt: true,
          confirmedAt: true,
          category: true,
          address: { select: { district: true } },
          reviews: {
            where: { targetId: userId },
            select: { rating: true, comment: true, createdAt: true },
          },
        },
        ...paginate(q),
      }),
      this.prisma.task.count({ where }),
      this.prisma.volunteerProfile.findUnique({
        where: { userId },
        select: { ratingAvg: true, tasksDone: true },
      }),
    ]);
    return {
      ratingAvg: profile?.ratingAvg ?? 0,
      tasksDone: profile?.tasksDone ?? 0,
      ...paginated(items, total, q),
    };
  }

  // ───────────── Координатор ─────────────

  async list(q: VolunteersQueryDto) {
    const where: Prisma.UserWhereInput = {
      role: Role.VOLUNTEER,
      AND: [
        userSearchWhere(q.q) ?? {},
        q.status ? { volunteerProfile: { verificationStatus: q.status } } : {},
        q.districtId
          ? { volunteerProfile: { districts: { some: { districtId: q.districtId } } } }
          : {},
      ],
    };
    const orderBy: Prisma.UserOrderByWithRelationInput[] =
      q.sort === 'rating'
        ? [{ volunteerProfile: { ratingAvg: 'desc' } }, { volunteerProfile: { tasksDone: 'desc' } }]
        : q.sort === 'name'
          ? [{ lastName: 'asc' }, { firstName: 'asc' }]
          : [{ createdAt: 'desc' }];

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, select: volunteerListSelect, orderBy, ...paginate(q) }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(rows.map(flatten), total, q);
  }

  async detail(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: Role.VOLUNTEER },
      select: {
        ...volunteerListSelect,
        email: true,
        pdConsentAt: true,
        volunteerProfile: {
          select: {
            ...volunteerListSelect.volunteerProfile.select,
            about: true,
            verificationNote: true,
            verifiedAt: true,
            verifiedBy: { select: { id: true, lastName: true, firstName: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Волонтёр не найден');

    const [activeTasks, recentTasks, reviews] = await this.prisma.$transaction([
      this.prisma.task.count({
        where: { volunteerId: id, status: { in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS] } },
      }),
      this.prisma.task.findMany({
        where: { volunteerId: id },
        orderBy: { windowStart: 'desc' },
        take: 20,
        select: { id: true, title: true, status: true, windowStart: true, category: true },
      }),
      this.prisma.review.findMany({
        where: { targetId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          taskId: true,
          author: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const { volunteerProfile, ...rest } = user;
    return {
      ...rest,
      profile: volunteerProfile && {
        ...volunteerProfile,
        districts: volunteerProfile.districts.map((d) => d.district),
      },
      activeTasks,
      recentTasks,
      reviews,
    };
  }

  async verify(coordinatorId: string, volunteerId: string, dto: VerifyVolunteerDto) {
    const profile = await this.prisma.volunteerProfile.findUnique({
      where: { userId: volunteerId },
    });
    if (!profile) throw new NotFoundException('Волонтёр не найден');

    await this.prisma.volunteerProfile.update({
      where: { userId: volunteerId },
      data: {
        verificationStatus: dto.decision,
        verificationNote: dto.note ?? null,
        verifiedById: coordinatorId,
        verifiedAt: new Date(),
      },
    });

    if (dto.decision === VerificationStatus.BLOCKED) {
      await this.releaseAssignedTasks(volunteerId, coordinatorId, 'Волонтёр заблокирован');
    }

    const titles: Record<typeof dto.decision, string> = {
      VERIFIED: 'Проверка пройдена — можно брать заявки',
      REJECTED: 'Проверка не пройдена',
      BLOCKED: 'Ваш профиль волонтёра заблокирован',
    };
    await this.notifications.notify([volunteerId], {
      type: NotificationType.VOLUNTEER_VERIFICATION,
      title: titles[dto.decision],
      body: dto.note,
    });
    return this.detail(volunteerId);
  }

  /**
   * Вернуть в каталог заявки, которые волонтёр взял, но ещё не начал.
   * Начатые (IN_PROGRESS) остаются — координатор решает по ним вручную.
   */
  async releaseAssignedTasks(
    volunteerId: string,
    actorId: string,
    reason: string,
  ): Promise<number> {
    const tasks = await this.prisma.task.findMany({
      where: { volunteerId, status: TaskStatus.ASSIGNED },
      select: { id: true },
    });
    for (const t of tasks) {
      await this.status.transition({
        taskId: t.id,
        from: TaskStatus.ASSIGNED,
        to: TaskStatus.NEW,
        actor: 'STAFF',
        actorUserId: actorId,
        comment: reason,
      });
    }
    return tasks.length;
  }
}
