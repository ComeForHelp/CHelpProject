import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LinkStatus, Prisma, Role, TaskStatus, Urgency, VerificationStatus } from '@prisma/client';
import { AccessService, TaskRelation } from '../../common/access/access.service';
import { paginate, paginated } from '../../common/dto/pagination.dto';
import { TaskAccessContext } from '../../common/guards/task-access.guard';
import { AuthUser } from '../../common/types';
import { addDays, localDateString, localDateTime } from '../../common/utils/time';
import { userSearchWhere } from '../../common/utils/search';
import { APP_CONFIG, AppConfig } from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import { AddressesService } from '../addresses/addresses.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import {
  AssignVolunteerDto,
  CatalogQueryDto,
  CreateTaskDto,
  MyTasksQueryDto,
  RepeatTaskDto,
  StaffTasksQueryDto,
  UpdateTaskDto,
} from './dto/tasks.dto';
import {
  presentCatalogCard,
  presentListCard,
  presentTaskDetail,
  relationToActor,
  taskDetailInclude,
  taskListInclude,
} from './task.presenter';
import {
  ACTIVE_STATUSES,
  EDITABLE_STATUSES,
  FINAL_STATUSES,
  TaskActor,
} from './task-status.machine';
import { TaskStatusService } from './task-status.service';

type Tx = Prisma.TransactionClient;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly addresses: AddressesService,
    private readonly status: TaskStatusService,
    private readonly notifications: NotificationsService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  // ───────────── Создание и изменение ─────────────

  async create(user: AuthUser, dto: CreateTaskDto) {
    const recipientId = await this.access.resolveRecipientFor(user, dto.recipientId);
    await this.addresses.assertBelongs(dto.addressId, recipientId);
    await this.assertCategory(dto.categoryId);
    this.assertWindow(dto.windowStart, dto.windowEnd);

    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          recipientId,
          createdById: user.id,
          categoryId: dto.categoryId,
          addressId: dto.addressId,
          title: dto.title,
          description: dto.description,
          destination: dto.destination,
          urgency: dto.urgency,
          windowStart: dto.windowStart,
          windowEnd: dto.windowEnd,
          estimatedCost: dto.estimatedCost,
          paymentMethod: dto.paymentMethod,
          items: dto.items?.length
            ? { create: dto.items.map((item, position) => ({ ...item, position })) }
            : undefined,
        },
      });
      await this.status.logCreated(created.id, user.id, tx);
      return created;
    });

    // Сообщаем второй стороне: получателю — что за него создали, родственникам — что он создал сам.
    const owners = await this.access.ownerUserIds(recipientId);
    await this.notifications.notify(
      owners.filter((id) => id !== user.id),
      {
        type: NotificationType.TASK_CREATED,
        title: 'Создана новая заявка',
        body: `«${task.title}»`,
        taskId: task.id,
      },
    );
    return this.findOne(user, { task, relation: await this.relationFor(user, task) });
  }

  async update(user: AuthUser, ctx: TaskAccessContext, dto: UpdateTaskDto) {
    this.actorOf(ctx.relation, ['OWNER', 'STAFF']);
    const task = await this.prisma.task.findUniqueOrThrow({ where: { id: ctx.task.id } });
    if (!EDITABLE_STATUSES.includes(task.status)) {
      throw new ConflictException('Заявку уже выполняют — изменить её нельзя');
    }
    if (dto.addressId) await this.addresses.assertBelongs(dto.addressId, task.recipientId);
    if (dto.categoryId) await this.assertCategory(dto.categoryId);
    if (dto.windowStart || dto.windowEnd) {
      this.assertWindow(dto.windowStart ?? task.windowStart, dto.windowEnd ?? task.windowEnd);
    }

    const res = await this.prisma.task.updateMany({
      where: { id: task.id, status: task.status },
      data: dto,
    });
    if (!res.count) throw new ConflictException('Статус заявки уже изменился — обновите страницу');

    if (task.volunteerId) {
      await this.notifications.notify([task.volunteerId], {
        type: NotificationType.TASK_UPDATED,
        title: 'Заявку изменили',
        body: `«${dto.title ?? task.title}» — проверьте время и список.`,
        taskId: task.id,
      });
    }
    return this.findOne(user, ctx);
  }

  /** Повтор прошлой заявки одной кнопкой из истории — с тем же списком покупок. */
  async repeat(user: AuthUser, ctx: TaskAccessContext, dto: RepeatTaskDto) {
    this.actorOf(ctx.relation, ['OWNER', 'STAFF']);
    const src = await this.prisma.task.findUniqueOrThrow({
      where: { id: ctx.task.id },
      include: { items: { orderBy: { position: 'asc' } } },
    });
    return this.create(user, {
      recipientId: src.recipientId,
      categoryId: src.categoryId,
      addressId: src.addressId,
      title: src.title,
      description: src.description ?? undefined,
      destination: src.destination ?? undefined,
      urgency: Urgency.NORMAL,
      windowStart: dto.windowStart,
      windowEnd: dto.windowEnd,
      estimatedCost: src.estimatedCost?.toNumber(),
      paymentMethod: src.paymentMethod,
      items: src.items.map((i) => ({
        name: i.name,
        quantity: i.quantity ?? undefined,
        unit: i.unit ?? undefined,
        note: i.note ?? undefined,
      })),
    });
  }

  // ───────────── Чтение ─────────────

  async findOne(user: AuthUser, ctx: TaskAccessContext) {
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: ctx.task.id },
      include: taskDetailInclude,
    });
    let relatives;
    if (ctx.relation === 'STAFF' || ctx.relation === 'VOLUNTEER') {
      const links = await this.prisma.relativeLink.findMany({
        where: { recipientId: task.recipientId, status: LinkStatus.CONFIRMED },
        select: {
          relation: true,
          relative: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      });
      relatives = links.map((l) => ({ ...l.relative, relation: l.relation }));
    }
    return presentTaskDetail(task, ctx.relation, { relatives, viewerId: user.id });
  }

  async history(ctx: TaskAccessContext) {
    return this.prisma.taskStatusHistory.findMany({
      where: { taskId: ctx.task.id },
      orderBy: { createdAt: 'asc' },
      include: { changedBy: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
  }

  /**
   * «Мои заявки»: получатель — свои, родственник — подопечных (всех или одного),
   * волонтёр — взятые им.
   */
  async my(user: AuthUser, q: MyTasksQueryDto) {
    const where: Prisma.TaskWhereInput = {};
    if (user.role === Role.RECIPIENT) {
      where.recipientId = user.id;
    } else if (user.role === Role.RELATIVE) {
      if (q.recipientId) {
        await this.access.assertCanManageRecipient(user, q.recipientId);
        where.recipientId = q.recipientId;
      } else {
        where.recipientId = { in: await this.access.confirmedWardIds(user.id) };
      }
    } else if (user.role === Role.VOLUNTEER) {
      where.volunteerId = user.id;
    } else {
      throw new ForbiddenException('Координатору — общий список заявок');
    }

    if (q.scope === 'active') where.status = { in: ACTIVE_STATUSES };
    if (q.scope === 'history') {
      // Для волонтёра «история» — выполненные им; для получателя — завершённые и отменённые.
      where.status = {
        in: user.role === Role.VOLUNTEER ? [TaskStatus.CONFIRMED] : FINAL_STATUSES,
      };
    }

    const orderBy: Prisma.TaskOrderByWithRelationInput[] =
      q.scope === 'active' ? [{ windowStart: 'asc' }] : [{ windowStart: 'desc' }];
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({ where, include: taskListInclude, orderBy, ...paginate(q) }),
      this.prisma.task.count({ where }),
    ]);
    return paginated(rows.map(presentListCard), total, q);
  }

  /** Каталог открытых заявок: только NEW, срочные сверху, дальше по ближайшему времени. */
  async catalog(user: AuthUser, q: CatalogQueryDto) {
    const now = new Date();
    const and: Prisma.TaskWhereInput[] = [{ status: TaskStatus.NEW }, { windowEnd: { gt: now } }];

    let districtIds = q.districtIds;
    if (!districtIds?.length && !q.allDistricts && user.role === Role.VOLUNTEER) {
      const own = await this.prisma.volunteerDistrict.findMany({
        where: { volunteerId: user.id },
        select: { districtId: true },
      });
      districtIds = own.map((d) => d.districtId);
    }
    if (districtIds?.length) and.push({ address: { districtId: { in: districtIds } } });
    if (q.categoryId) and.push({ categoryId: q.categoryId });
    if (q.urgency) and.push({ urgency: q.urgency });

    if (q.date) {
      const off = this.config.utcOffsetHours;
      const today = localDateString(now, off);
      const dayStart = (ymd: string) => localDateTime(ymd, '00:00', off);
      if (q.date === 'today') and.push({ windowStart: { lt: dayStart(addDays(today, 1)) } });
      if (q.date === 'tomorrow') {
        and.push({
          windowStart: { lt: dayStart(addDays(today, 2)) },
          windowEnd: { gt: dayStart(addDays(today, 1)) },
        });
      }
      if (q.date === 'week') and.push({ windowStart: { lt: dayStart(addDays(today, 7)) } });
    }

    if (q.needsMoney !== undefined) {
      // «Нужны свои деньги»: категория с покупкой и деньги не даны заранее.
      const ownMoney: Prisma.TaskWhereInput = {
        category: { needsMoney: true },
        paymentMethod: { not: 'PREPAID' },
      };
      and.push(q.needsMoney ? ownMoney : { NOT: ownMoney });
    }

    const where: Prisma.TaskWhereInput = { AND: and };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        include: taskListInclude,
        // URGENT объявлен после NORMAL, поэтому desc ставит срочные первыми.
        orderBy: [{ urgency: 'desc' }, { windowStart: 'asc' }],
        ...paginate(q),
      }),
      this.prisma.task.count({ where }),
    ]);
    return { ...paginated(rows.map(presentCatalogCard), total, q), districtIds: districtIds ?? [] };
  }

  /** Таблица всех заявок для координатора. */
  async listAll(q: StaffTasksQueryDto) {
    const now = new Date();
    const and: Prisma.TaskWhereInput[] = [];
    if (q.status?.length) and.push({ status: { in: q.status } });
    if (q.districtId) and.push({ address: { districtId: q.districtId } });
    if (q.categoryId) and.push({ categoryId: q.categoryId });
    if (q.urgency) and.push({ urgency: q.urgency });
    if (q.recipientId) and.push({ recipientId: q.recipientId });
    if (q.volunteerId) and.push({ volunteerId: q.volunteerId });
    if (q.unassigned) and.push({ volunteerId: null, status: TaskStatus.NEW });
    if (q.overdue) {
      and.push({
        status: { in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS] },
        windowEnd: { lt: now },
      });
    }
    if (q.from) and.push({ windowStart: { gte: q.from } });
    if (q.to) and.push({ windowStart: { lt: q.to } });
    if (q.q?.trim()) {
      and.push({
        OR: [
          { title: { contains: q.q.trim(), mode: 'insensitive' } },
          { recipient: userSearchWhere(q.q) },
        ],
      });
    }

    const where: Prisma.TaskWhereInput = { AND: and };
    const orderBy: Prisma.TaskOrderByWithRelationInput[] =
      q.sort === 'createdAt'
        ? [{ createdAt: 'desc' }]
        : [{ urgency: 'desc' }, { windowStart: 'asc' }];
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({ where, include: taskListInclude, orderBy, ...paginate(q) }),
      this.prisma.task.count({ where }),
    ]);
    return paginated(rows.map(presentListCard), total, q);
  }

  // ───────────── Смена статусов ─────────────

  /** Волонтёр берёт заявку из каталога. */
  async take(user: AuthUser, ctx: TaskAccessContext) {
    if (ctx.relation !== 'CATALOG') {
      throw new ConflictException('Заявка уже не в каталоге открытых');
    }
    await this.status.transition({
      taskId: ctx.task.id,
      from: TaskStatus.NEW,
      to: TaskStatus.ASSIGNED,
      actor: 'VOLUNTEER',
      actorUserId: user.id,
      volunteerId: user.id,
    });
    return this.reload(user, ctx.task.id);
  }

  /** Волонтёр отказывается — заявка возвращается в каталог. */
  async decline(user: AuthUser, ctx: TaskAccessContext, reason?: string) {
    this.actorOf(ctx.relation, ['VOLUNTEER']);
    await this.status.transition({
      taskId: ctx.task.id,
      from: ctx.task.status,
      to: TaskStatus.NEW,
      actor: 'VOLUNTEER',
      actorUserId: user.id,
      comment: reason,
    });
    return { ok: true };
  }

  async start(user: AuthUser, ctx: TaskAccessContext) {
    return this.move(user, ctx, TaskStatus.IN_PROGRESS, ['VOLUNTEER', 'STAFF']);
  }

  async done(user: AuthUser, ctx: TaskAccessContext) {
    return this.move(user, ctx, TaskStatus.DONE, ['VOLUNTEER', 'STAFF']);
  }

  async confirm(user: AuthUser, ctx: TaskAccessContext) {
    return this.move(user, ctx, TaskStatus.CONFIRMED, ['OWNER', 'STAFF']);
  }

  async cancel(user: AuthUser, ctx: TaskAccessContext, reason: string) {
    return this.move(user, ctx, TaskStatus.CANCELLED, ['OWNER', 'STAFF'], reason);
  }

  /** Координатор назначает волонтёра (если был другой — сначала снимает его). */
  async assign(user: AuthUser, ctx: TaskAccessContext, dto: AssignVolunteerDto) {
    const volunteer = await this.prisma.user.findUnique({
      where: { id: dto.volunteerId },
      select: {
        role: true,
        isActive: true,
        volunteerProfile: { select: { verificationStatus: true } },
      },
    });
    if (
      volunteer?.role !== Role.VOLUNTEER ||
      !volunteer.isActive ||
      volunteer.volunteerProfile?.verificationStatus !== VerificationStatus.VERIFIED
    ) {
      throw new BadRequestException('Назначить можно только проверенного активного волонтёра');
    }
    if (ctx.task.volunteerId === dto.volunteerId) return this.reload(user, ctx.task.id);

    await this.prisma.$transaction(async (tx: Tx) => {
      let from = ctx.task.status;
      if (from === TaskStatus.ASSIGNED) {
        await this.status.transition(
          {
            taskId: ctx.task.id,
            from,
            to: TaskStatus.NEW,
            actor: 'STAFF',
            actorUserId: user.id,
            comment: 'Координатор переназначил заявку',
          },
          tx,
        );
        from = TaskStatus.NEW;
      }
      await this.status.transition(
        {
          taskId: ctx.task.id,
          from,
          to: TaskStatus.ASSIGNED,
          actor: 'STAFF',
          actorUserId: user.id,
          volunteerId: dto.volunteerId,
          comment: 'Назначен координатором',
        },
        tx,
      );
    });
    return this.reload(user, ctx.task.id);
  }

  async unassign(user: AuthUser, ctx: TaskAccessContext, reason?: string) {
    return this.move(user, ctx, TaskStatus.NEW, ['STAFF'], reason ?? 'Координатор снял волонтёра');
  }

  // ───────────── Вспомогательное ─────────────

  private async move(
    user: AuthUser,
    ctx: TaskAccessContext,
    to: TaskStatus,
    allowed: TaskActor[],
    comment?: string,
  ) {
    const actor = this.actorOf(ctx.relation, allowed);
    await this.status.transition({
      taskId: ctx.task.id,
      from: ctx.task.status,
      to,
      actor,
      actorUserId: user.id,
      comment,
    });
    return this.reload(user, ctx.task.id);
  }

  private async reload(user: AuthUser, taskId: string) {
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      select: { id: true, recipientId: true, volunteerId: true, status: true },
    });
    const relation = await this.relationFor(user, task);
    return this.findOne(user, { task, relation });
  }

  private async relationFor(
    user: AuthUser,
    task: { id: string; recipientId: string; volunteerId: string | null; status: TaskStatus },
  ): Promise<TaskRelation> {
    const relation = await this.access.taskRelation(user, task);
    if (!relation) throw new ForbiddenException('Нет доступа к этой заявке');
    return relation;
  }

  private actorOf(relation: TaskRelation, allowed: TaskActor[]): TaskActor {
    const actor = relationToActor(relation);
    if (!actor || !allowed.includes(actor)) {
      throw new ForbiddenException('Это действие с заявкой вам недоступно');
    }
    return actor;
  }

  private assertWindow(start: Date, end: Date) {
    if (end <= start) throw new BadRequestException('Окончание окна должно быть позже начала');
    if (end <= new Date()) throw new BadRequestException('Время выполнения уже прошло');
    if (end.getTime() - start.getTime() > 14 * 24 * 3600_000) {
      throw new BadRequestException('Окно выполнения не может быть длиннее двух недель');
    }
  }

  private async assertCategory(categoryId: number) {
    if (!(await this.prisma.taskCategory.findUnique({ where: { id: categoryId } }))) {
      throw new NotFoundException('Неизвестная категория');
    }
  }
}
