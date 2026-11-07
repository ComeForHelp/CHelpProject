import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { LinkStatus, Prisma, Role } from '@prisma/client';
import { AccessService } from '../../common/access/access.service';
import { paginate, paginated } from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/types';
import { normalizePhone } from '../../common/utils/phone';
import { userSearchWhere } from '../../common/utils/search';
import { PrismaService } from '../../prisma/prisma.service';
import { AddressesService } from '../addresses/addresses.service';
import { hashPassword } from '../auth/auth.service';
import { ACTIVE_STATUSES } from '../tasks/task-status.machine';
import { CreateRecipientDto, RecipientsQueryDto, UpdateRecipientDto } from './dto/recipients.dto';

const recipientSelect = {
  id: true,
  phone: true,
  email: true,
  lastName: true,
  firstName: true,
  middleName: true,
  isActive: true,
  pdConsentAt: true,
  createdAt: true,
  passwordHash: true,
  recipientProfile: { select: { mobilityNotes: true, contactPreference: true } },
} satisfies Prisma.UserSelect;

type RecipientRow = Prisma.UserGetPayload<{ select: typeof recipientSelect }>;

function present({ passwordHash, recipientProfile, ...u }: RecipientRow) {
  return {
    ...u,
    canLogin: !!passwordHash,
    mobilityNotes: recipientProfile?.mobilityNotes ?? null,
    contactPreference: recipientProfile?.contactPreference ?? null,
  };
}

@Injectable()
export class RecipientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly addresses: AddressesService,
  ) {}

  /** Регистрация «за человека»: родственником (связь подтверждена сразу) или координатором. */
  async create(actor: AuthUser, dto: CreateRecipientDto) {
    const phone = normalizePhone(dto.phone);
    const existing = await this.prisma.user.findUnique({
      where: { phone },
      select: { role: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.role === Role.RECIPIENT
          ? 'Этот человек уже зарегистрирован — отправьте ему запрос на привязку'
          : 'Телефон уже занят другим пользователем',
      );
    }

    const id = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: Role.RECIPIENT,
          phone,
          lastName: dto.lastName,
          firstName: dto.firstName,
          middleName: dto.middleName || null,
          passwordHash: dto.password ? await hashPassword(dto.password) : null,
          pdConsentAt: new Date(),
          recipientProfile: {
            create: {
              mobilityNotes: dto.mobilityNotes,
              contactPreference: dto.contactPreference,
            },
          },
        },
      });
      if (actor.role === Role.RELATIVE) {
        await tx.relativeLink.create({
          data: {
            recipientId: user.id,
            relativeId: actor.id,
            relation: dto.relation || null,
            status: LinkStatus.CONFIRMED,
          },
        });
      }
      if (dto.address) await this.addresses.createFor(user.id, dto.address, tx);
      return user.id;
    });
    return this.detail(actor, id);
  }

  async list(q: RecipientsQueryDto) {
    const where: Prisma.UserWhereInput = { role: Role.RECIPIENT, ...(userSearchWhere(q.q) ?? {}) };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          ...recipientSelect,
          addresses: {
            where: { isDefault: true },
            select: { street: true, house: true, district: true },
          },
          _count: { select: { tasksAsRecipient: { where: { status: { in: ACTIVE_STATUSES } } } } },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        ...paginate(q),
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(
      rows.map(({ addresses, _count, ...r }) => ({
        ...present(r),
        defaultAddress: addresses[0] ?? null,
        activeTasks: _count.tasksAsRecipient,
      })),
      total,
      q,
    );
  }

  /** Карточка получателя: профиль, адреса, родственники, заявки, регулярные правила. */
  async detail(actor: AuthUser, id: string) {
    await this.access.assertCanManageRecipient(actor, id);
    const user = await this.prisma.user.findFirst({
      where: { id, role: Role.RECIPIENT },
      select: {
        ...recipientSelect,
        addresses: {
          include: { district: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
        wardLinks: {
          include: {
            relative: {
              select: { id: true, phone: true, lastName: true, firstName: true, middleName: true },
            },
          },
        },
        tasksAsRecipient: {
          orderBy: { windowStart: 'desc' },
          take: 20,
          select: {
            id: true,
            title: true,
            status: true,
            urgency: true,
            windowStart: true,
            windowEnd: true,
            category: true,
          },
        },
        rulesAsRecipient: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, frequency: true, isActive: true, category: true },
        },
      },
    });
    if (!user) throw new NotFoundException('Получатель не найден');
    const { addresses, wardLinks, tasksAsRecipient, rulesAsRecipient, ...rest } = user;
    return {
      ...present(rest),
      addresses,
      relatives: wardLinks.map((l) => ({
        linkId: l.id,
        relation: l.relation,
        status: l.status,
        ...l.relative,
      })),
      tasks: tasksAsRecipient,
      recurringRules: rulesAsRecipient,
    };
  }

  async update(actor: AuthUser, id: string, dto: UpdateRecipientDto) {
    await this.access.assertCanManageRecipient(actor, id);
    await this.prisma.recipientProfile.upsert({
      where: { userId: id },
      create: { userId: id, ...dto },
      update: dto,
    });
    return this.detail(actor, id);
  }
}
