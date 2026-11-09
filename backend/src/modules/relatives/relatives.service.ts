import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LinkStatus, Prisma, Role, TaskStatus } from '@prisma/client';
import { AuthUser, isStaff } from '../../common/types';
import { normalizePhone } from '../../common/utils/phone';
import { fullName } from '../../common/utils/search';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import { ACTIVE_STATUSES } from '../tasks/task-status.machine';

const personSelect = {
  id: true,
  phone: true,
  lastName: true,
  firstName: true,
  middleName: true,
  isActive: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class RelativesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Для родственника — подопечные с числом активных заявок (страница /family);
   * для получателя — его родственники, включая неподтверждённые запросы.
   */
  async myLinks(user: AuthUser) {
    if (user.role === Role.RELATIVE) {
      const links = await this.prisma.relativeLink.findMany({
        where: { relativeId: user.id },
        orderBy: { createdAt: 'asc' },
        include: { recipient: { select: personSelect } },
      });
      const confirmedIds = links
        .filter((l) => l.status === LinkStatus.CONFIRMED)
        .map((l) => l.recipientId);
      const counts = await this.prisma.task.groupBy({
        by: ['recipientId', 'status'],
        where: { recipientId: { in: confirmedIds }, status: { in: ACTIVE_STATUSES } },
        _count: { _all: true },
      });
      return links.map((l) => {
        const own = counts.filter((c) => c.recipientId === l.recipientId);
        const sum = (pred: (s: TaskStatus) => boolean) =>
          own.filter((c) => pred(c.status)).reduce((n, c) => n + c._count._all, 0);
        return {
          id: l.id,
          relation: l.relation,
          status: l.status,
          createdAt: l.createdAt,
          // До подтверждения телефон подопечного не раскрываем.
          recipient:
            l.status === LinkStatus.CONFIRMED
              ? l.recipient
              : {
                  id: l.recipient.id,
                  firstName: l.recipient.firstName,
                  lastName: l.recipient.lastName,
                },
          activeTasks: sum(() => true),
          awaitingConfirmation: sum((s) => s === TaskStatus.DONE),
        };
      });
    }
    if (user.role === Role.RECIPIENT) {
      return this.prisma.relativeLink.findMany({
        where: { recipientId: user.id },
        orderBy: { createdAt: 'asc' },
        include: { relative: { select: personSelect } },
      });
    }
    throw new ForbiddenException('Связи есть только у получателей и родственников');
  }

  async request(relativeId: string, recipientPhone: string, relation?: string) {
    const recipient = await this.findByPhone(recipientPhone, Role.RECIPIENT);
    const relative = await this.prisma.user.findUniqueOrThrow({ where: { id: relativeId } });
    const link = await this.createLink(recipient.id, relativeId, LinkStatus.PENDING, relation);
    await this.notifications.notify([recipient.id], {
      type: NotificationType.LINK_REQUEST,
      title: 'Запрос от родственника',
      body: `${fullName(relative)} хочет помогать вам с заявками. Подтвердите в профиле.`,
    });
    return link;
  }

  async invite(recipientId: string, relativePhone: string, relation?: string) {
    const relative = await this.findByPhone(relativePhone, Role.RELATIVE);
    const recipient = await this.prisma.user.findUniqueOrThrow({ where: { id: recipientId } });
    const link = await this.createLink(recipientId, relative.id, LinkStatus.CONFIRMED, relation);
    await this.notifications.notify([relative.id], {
      type: NotificationType.LINK_CONFIRMED,
      title: 'Вас добавили родственником',
      body: `${fullName(recipient)} разрешил(а) вам оформлять заявки за него/неё.`,
    });
    return link;
  }

  async staffLink(dto: { recipientId: string; relativeId: string; relation?: string }) {
    const [recipient, relative] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.recipientId } }),
      this.prisma.user.findUnique({ where: { id: dto.relativeId } }),
    ]);
    if (recipient?.role !== Role.RECIPIENT) throw new NotFoundException('Получатель не найден');
    if (relative?.role !== Role.RELATIVE) throw new NotFoundException('Родственник не найден');
    const existing = await this.prisma.relativeLink.findUnique({
      where: { recipientId_relativeId: { recipientId: recipient.id, relativeId: relative.id } },
    });
    if (existing) {
      return this.prisma.relativeLink.update({
        where: { id: existing.id },
        data: { status: LinkStatus.CONFIRMED, relation: dto.relation ?? existing.relation },
      });
    }
    return this.createLink(recipient.id, relative.id, LinkStatus.CONFIRMED, dto.relation);
  }

  /** Подтверждает получатель (или координатор). */
  async confirm(user: AuthUser, linkId: string) {
    const link = await this.getLink(linkId);
    if (!isStaff(user) && user.id !== link.recipientId) {
      throw new ForbiddenException('Подтвердить запрос может только сам получатель');
    }
    if (link.status === LinkStatus.CONFIRMED) return link;
    const updated = await this.prisma.relativeLink.update({
      where: { id: linkId },
      data: { status: LinkStatus.CONFIRMED },
    });
    await this.notifications.notify([link.relativeId], {
      type: NotificationType.LINK_CONFIRMED,
      title: 'Запрос подтверждён',
      body: 'Теперь вы можете оформлять заявки за подопечного.',
    });
    return updated;
  }

  /** Отклонить запрос или разорвать связь может любая из сторон и координатор. */
  async remove(user: AuthUser, linkId: string): Promise<void> {
    const link = await this.getLink(linkId);
    if (!isStaff(user) && user.id !== link.recipientId && user.id !== link.relativeId) {
      throw new ForbiddenException('Нет доступа к этой связи');
    }
    await this.prisma.relativeLink.delete({ where: { id: linkId } });
  }

  private async createLink(
    recipientId: string,
    relativeId: string,
    status: LinkStatus,
    relation?: string,
  ) {
    const existing = await this.prisma.relativeLink.findUnique({
      where: { recipientId_relativeId: { recipientId, relativeId } },
    });
    if (existing) {
      throw new ConflictException(
        existing.status === LinkStatus.CONFIRMED
          ? 'Связь уже подтверждена'
          : 'Запрос уже отправлен',
      );
    }
    return this.prisma.relativeLink.create({
      data: { recipientId, relativeId, status, relation: relation || null },
    });
  }

  private async findByPhone(phone: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { phone: normalizePhone(phone) } });
    if (!user || user.role !== role) {
      throw new NotFoundException(
        role === Role.RECIPIENT
          ? 'Получатель с таким телефоном не найден — его можно зарегистрировать'
          : 'Родственник с таким телефоном не зарегистрирован',
      );
    }
    if (!user.isActive) throw new BadRequestException('Аккаунт заблокирован');
    return user;
  }

  private async getLink(id: string) {
    const link = await this.prisma.relativeLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('Связь не найдена');
    return link;
  }
}
