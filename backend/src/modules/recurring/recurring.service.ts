import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Frequency, Prisma, RecurringRule, Role, VerificationStatus } from '@prisma/client';
import { AccessService } from '../../common/access/access.service';
import { AuthUser, isStaff } from '../../common/types';
import {
  dateOnly,
  dateToYmd,
  localDateString,
  timeOfDay,
  timeToString,
} from '../../common/utils/time';
import { APP_CONFIG, AppConfig } from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import { AddressesService } from '../addresses/addresses.service';
import { CreateRecurringRuleDto, UpdateRecurringRuleDto } from './dto/recurring.dto';
import { RuleSchedule, nextOccurrences } from './recurrence';

const ruleInclude = {
  category: true,
  address: { include: { district: true } },
  recipient: { select: { id: true, firstName: true, lastName: true } },
  preferredVolunteer: { select: { id: true, firstName: true, lastName: true, phone: true } },
} satisfies Prisma.RecurringRuleInclude;

type RuleRow = Prisma.RecurringRuleGetPayload<{ include: typeof ruleInclude }>;

export function toSchedule(r: RecurringRule): RuleSchedule {
  return {
    frequency: r.frequency,
    daysOfWeek: r.daysOfWeek,
    dayOfMonth: r.dayOfMonth,
    startsOn: dateToYmd(r.startsOn),
    endsOn: r.endsOn ? dateToYmd(r.endsOn) : null,
  };
}

@Injectable()
export class RecurringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly addresses: AddressesService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async list(user: AuthUser, recipientId?: string) {
    let where: Prisma.RecurringRuleWhereInput;
    if (user.role === Role.RELATIVE && !recipientId) {
      where = { recipientId: { in: await this.access.confirmedWardIds(user.id) } };
    } else if (isStaff(user) && !recipientId) {
      where = {};
    } else {
      where = { recipientId: await this.access.resolveRecipientFor(user, recipientId) };
    }
    const rows = await this.prisma.recurringRule.findMany({
      where,
      include: ruleInclude,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.present(r));
  }

  async get(user: AuthUser, id: string) {
    const rule = await this.getManaged(user, id);
    return this.present(rule);
  }

  async create(user: AuthUser, dto: CreateRecurringRuleDto) {
    const recipientId = await this.access.resolveRecipientFor(user, dto.recipientId);
    await this.validate(recipientId, dto);
    const rule = await this.prisma.recurringRule.create({
      data: {
        recipientId,
        createdById: user.id,
        categoryId: dto.categoryId,
        addressId: dto.addressId,
        preferredVolunteerId: dto.preferredVolunteerId ?? null,
        title: dto.title,
        description: dto.description,
        itemsTemplate: (dto.itemsTemplate ?? []) as unknown as Prisma.InputJsonValue,
        frequency: dto.frequency,
        daysOfWeek: dto.frequency === Frequency.MONTHLY ? [] : (dto.daysOfWeek ?? []),
        dayOfMonth: dto.frequency === Frequency.MONTHLY ? dto.dayOfMonth : null,
        timeFrom: timeOfDay(dto.timeFrom),
        timeTo: timeOfDay(dto.timeTo),
        startsOn: dateOnly(dto.startsOn),
        endsOn: dto.endsOn ? dateOnly(dto.endsOn) : null,
        estimatedCost: dto.estimatedCost,
        paymentMethod: dto.paymentMethod,
      },
      include: ruleInclude,
    });
    return this.present(rule);
  }

  async update(user: AuthUser, id: string, dto: UpdateRecurringRuleDto) {
    const current = await this.getManaged(user, id);
    const merged = {
      categoryId: dto.categoryId ?? current.categoryId,
      addressId: dto.addressId ?? current.addressId,
      preferredVolunteerId:
        dto.preferredVolunteerId === undefined
          ? current.preferredVolunteerId
          : dto.preferredVolunteerId,
      frequency: dto.frequency ?? current.frequency,
      daysOfWeek: dto.daysOfWeek ?? current.daysOfWeek,
      dayOfMonth: dto.dayOfMonth ?? current.dayOfMonth ?? undefined,
      timeFrom: dto.timeFrom ?? timeToString(current.timeFrom),
      timeTo: dto.timeTo ?? timeToString(current.timeTo),
      startsOn: dto.startsOn ?? dateToYmd(current.startsOn),
      endsOn:
        dto.endsOn === undefined ? (current.endsOn ? dateToYmd(current.endsOn) : null) : dto.endsOn,
    };
    await this.validate(current.recipientId, merged);

    // Изменилось расписание — генерировать заново с сегодняшнего дня (уже созданные заявки остаются).
    const scheduleChanged = [
      'frequency',
      'daysOfWeek',
      'dayOfMonth',
      'timeFrom',
      'timeTo',
      'startsOn',
    ].some((k) => (dto as Record<string, unknown>)[k] !== undefined);

    const rule = await this.prisma.recurringRule.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        addressId: dto.addressId,
        preferredVolunteerId: dto.preferredVolunteerId,
        title: dto.title,
        description: dto.description,
        itemsTemplate: dto.itemsTemplate as unknown as Prisma.InputJsonValue | undefined,
        frequency: dto.frequency,
        daysOfWeek: merged.frequency === Frequency.MONTHLY ? [] : merged.daysOfWeek,
        dayOfMonth: merged.frequency === Frequency.MONTHLY ? merged.dayOfMonth : null,
        timeFrom: dto.timeFrom ? timeOfDay(dto.timeFrom) : undefined,
        timeTo: dto.timeTo ? timeOfDay(dto.timeTo) : undefined,
        startsOn: dto.startsOn ? dateOnly(dto.startsOn) : undefined,
        endsOn: dto.endsOn === undefined ? undefined : dto.endsOn ? dateOnly(dto.endsOn) : null,
        estimatedCost: dto.estimatedCost,
        paymentMethod: dto.paymentMethod,
        isActive: dto.isActive,
        ...(scheduleChanged ? { lastGeneratedOn: null } : {}),
      },
      include: ruleInclude,
    });
    return this.present(rule);
  }

  /** Удаление правила; созданные по нему заявки остаются (recurring_rule_id → NULL). */
  async remove(user: AuthUser, id: string): Promise<void> {
    await this.getManaged(user, id);
    await this.prisma.recurringRule.delete({ where: { id } });
  }

  private async getManaged(user: AuthUser, id: string): Promise<RuleRow> {
    const rule = await this.prisma.recurringRule.findUnique({
      where: { id },
      include: ruleInclude,
    });
    if (!rule) throw new NotFoundException('Регулярное поручение не найдено');
    await this.access.assertCanManageRecipient(user, rule.recipientId);
    return rule;
  }

  private async validate(
    recipientId: string,
    r: {
      categoryId: number;
      addressId: string;
      preferredVolunteerId?: string | null;
      frequency: Frequency;
      daysOfWeek?: number[];
      dayOfMonth?: number;
      timeFrom: string;
      timeTo: string;
      startsOn: string;
      endsOn?: string | null;
    },
  ) {
    if (r.frequency === Frequency.MONTHLY && !r.dayOfMonth) {
      throw new BadRequestException('Для ежемесячного поручения укажите число месяца (1–28)');
    }
    if (r.frequency !== Frequency.MONTHLY && !r.daysOfWeek?.length) {
      throw new BadRequestException('Выберите хотя бы один день недели');
    }
    if (r.timeTo <= r.timeFrom) throw new BadRequestException('Окончание должно быть позже начала');
    if (r.endsOn && r.endsOn < r.startsOn) {
      throw new BadRequestException('Дата окончания раньше даты начала');
    }
    if (Number.isNaN(dateOnly(r.startsOn).getTime()))
      throw new BadRequestException('Неверная дата');

    await this.addresses.assertBelongs(r.addressId, recipientId);
    if (!(await this.prisma.taskCategory.findUnique({ where: { id: r.categoryId } }))) {
      throw new BadRequestException('Неизвестная категория');
    }
    if (r.preferredVolunteerId) {
      const v = await this.prisma.volunteerProfile.findUnique({
        where: { userId: r.preferredVolunteerId },
        select: { verificationStatus: true },
      });
      if (v?.verificationStatus !== VerificationStatus.VERIFIED) {
        throw new BadRequestException('Постоянным может быть только проверенный волонтёр');
      }
    }
  }

  private present(r: RuleRow) {
    const today = localDateString(new Date(), this.config.utcOffsetHours);
    return {
      ...r,
      timeFrom: timeToString(r.timeFrom),
      timeTo: timeToString(r.timeTo),
      startsOn: dateToYmd(r.startsOn),
      endsOn: r.endsOn ? dateToYmd(r.endsOn) : null,
      lastGeneratedOn: r.lastGeneratedOn ? dateToYmd(r.lastGeneratedOn) : null,
      nextDates: r.isActive ? nextOccurrences(toSchedule(r), today, 3) : [],
    };
  }
}
