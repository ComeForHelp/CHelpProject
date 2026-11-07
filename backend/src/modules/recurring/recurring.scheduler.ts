import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TaskStatus, VerificationStatus } from '@prisma/client';
import {
  addDays,
  dateOnly,
  dateToYmd,
  localDateString,
  localDateTime,
  timeToString,
} from '../../common/utils/time';
import { APP_CONFIG, AppConfig } from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatusService } from '../tasks/task-status.service';
import { occurrencesBetween } from './recurrence';
import { toSchedule } from './recurring.service';

interface TemplateItem {
  name: string;
  quantity?: string;
  unit?: string;
  note?: string;
}

export interface GenerationResult {
  rules: number;
  created: number;
  assigned: number;
}

/**
 * Фоновые задачи (@nestjs/schedule):
 *  - раз в сутки создаёт заявки из регулярных правил на RECURRING_HORIZON_DAYS дней вперёд;
 *  - каждые 10 минут переводит в EXPIRED невзятые заявки с прошедшим окном.
 * Генерация идемпотентна: повторный запуск не создаёт дублей (проверка по правилу и времени).
 */
@Injectable()
export class RecurringScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(RecurringScheduler.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly status: TaskStatusService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Если сервер был выключен в полночь — догоняем при старте. */
  onApplicationBootstrap(): void {
    if (!this.config.cronEnabled) return;
    setTimeout(() => void this.dailyJob(), 5_000).unref();
  }

  @Cron('0 10 0 * * *', { name: 'recurring-generate', timeZone: 'Asia/Vladivostok' })
  async dailyJob(): Promise<void> {
    if (!this.config.cronEnabled || this.running) return;
    this.running = true;
    try {
      const res = await this.generate();
      this.logger.log(`Регулярные правила: ${res.rules}, создано заявок: ${res.created}`);
    } catch (e) {
      this.logger.error('Ошибка генерации регулярных заявок', e instanceof Error ? e.stack : e);
    } finally {
      this.running = false;
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'tasks-expire' })
  async expireJob(): Promise<void> {
    if (!this.config.cronEnabled) return;
    try {
      const n = await this.expireOverdue();
      if (n) this.logger.log(`Просрочено невзятых заявок: ${n}`);
    } catch (e) {
      this.logger.error(
        'Ошибка при закрытии просроченных заявок',
        e instanceof Error ? e.stack : e,
      );
    }
  }

  async generate(now = new Date()): Promise<GenerationResult> {
    const off = this.config.utcOffsetHours;
    const today = localDateString(now, off);
    const horizonEnd = addDays(today, this.config.recurringHorizonDays);

    const rules = await this.prisma.recurringRule.findMany({
      where: {
        isActive: true,
        startsOn: { lte: dateOnly(horizonEnd) },
        OR: [{ endsOn: null }, { endsOn: { gte: dateOnly(today) } }],
        recipient: { isActive: true },
      },
      include: {
        preferredVolunteer: {
          select: { isActive: true, volunteerProfile: { select: { verificationStatus: true } } },
        },
      },
    });

    const result: GenerationResult = { rules: rules.length, created: 0, assigned: 0 };
    for (const rule of rules) {
      const last = rule.lastGeneratedOn ? dateToYmd(rule.lastGeneratedOn) : null;
      const from = [today, last ? addDays(last, 1) : today].sort().at(-1)!;
      const dates = occurrencesBetween(toSchedule(rule), from, horizonEnd);
      const timeFrom = timeToString(rule.timeFrom);
      const timeTo = timeToString(rule.timeTo);

      const pv = rule.preferredVolunteer;
      const preferredOk =
        !!pv?.isActive && pv.volunteerProfile?.verificationStatus === VerificationStatus.VERIFIED;

      for (const date of dates) {
        const windowStart = localDateTime(date, timeFrom, off);
        const windowEnd = localDateTime(date, timeTo, off);
        if (windowEnd <= now) continue;

        const created = await this.prisma.$transaction(async (tx) => {
          const exists = await tx.task.findFirst({
            where: { recurringRuleId: rule.id, windowStart },
            select: { id: true },
          });
          if (exists) return null;

          const items = Array.isArray(rule.itemsTemplate)
            ? (rule.itemsTemplate as unknown as TemplateItem[])
            : [];
          const task = await tx.task.create({
            data: {
              recipientId: rule.recipientId,
              createdById: rule.createdById,
              categoryId: rule.categoryId,
              addressId: rule.addressId,
              recurringRuleId: rule.id,
              title: rule.title,
              description: rule.description,
              windowStart,
              windowEnd,
              estimatedCost: rule.estimatedCost,
              paymentMethod: rule.paymentMethod,
              items: items.length
                ? {
                    create: items.map((i, position) => ({
                      name: String(i.name).slice(0, 200),
                      quantity: i.quantity ?? null,
                      unit: i.unit ?? null,
                      note: i.note ?? null,
                      position,
                    })),
                  }
                : undefined,
            },
          });
          await this.status.logCreated(task.id, null, tx, 'Создана по регулярному поручению');
          return task;
        });
        if (!created) continue;
        result.created++;

        if (preferredOk && rule.preferredVolunteerId) {
          await this.status.transition({
            taskId: created.id,
            from: TaskStatus.NEW,
            to: TaskStatus.ASSIGNED,
            actor: 'SYSTEM',
            actorUserId: null,
            volunteerId: rule.preferredVolunteerId,
            comment: 'Постоянный волонтёр регулярного поручения',
          });
          result.assigned++;
        }
      }

      await this.prisma.recurringRule.update({
        where: { id: rule.id },
        data: { lastGeneratedOn: dateOnly(horizonEnd) },
      });
    }
    return result;
  }

  /** Невзятые заявки после окончания окна → EXPIRED (раздел «Жизненный цикл заявки»). */
  async expireOverdue(now = new Date()): Promise<number> {
    const overdue = await this.prisma.task.findMany({
      where: { status: TaskStatus.NEW, windowEnd: { lt: now } },
      select: { id: true },
      take: 500,
    });
    let n = 0;
    for (const t of overdue) {
      try {
        await this.status.transition({
          taskId: t.id,
          from: TaskStatus.NEW,
          to: TaskStatus.EXPIRED,
          actor: 'SYSTEM',
          actorUserId: null,
          comment: 'Окно времени истекло, волонтёр не нашёлся',
        });
        n++;
      } catch (e) {
        // Чаще всего заявку взяли в последний момент (409) — это нормально.
        this.logger.debug(`Заявка ${t.id} не просрочена: ${String(e)}`);
      }
    }
    return n;
  }
}
