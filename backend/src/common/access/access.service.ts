import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LinkStatus, Role, TaskStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser, isStaff } from '../types';

/**
 * Как пользователь связан с заявкой:
 * - OWNER — получатель или его подтверждённый родственник;
 * - VOLUNTEER — назначенный на заявку волонтёр;
 * - STAFF — координатор или администратор;
 * - CATALOG — проверенный волонтёр смотрит открытую заявку из каталога (урезанные данные).
 */
export type TaskRelation = 'OWNER' | 'VOLUNTEER' | 'STAFF' | 'CATALOG';

export interface TaskAccessInfo {
  id: string;
  recipientId: string;
  volunteerId: string | null;
  status: TaskStatus;
}

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async isConfirmedRelative(relativeId: string, recipientId: string): Promise<boolean> {
    const link = await this.prisma.relativeLink.findUnique({
      where: { recipientId_relativeId: { recipientId, relativeId } },
      select: { status: true },
    });
    return link?.status === LinkStatus.CONFIRMED;
  }

  async confirmedWardIds(relativeId: string): Promise<string[]> {
    const links = await this.prisma.relativeLink.findMany({
      where: { relativeId, status: LinkStatus.CONFIRMED },
      select: { recipientId: true },
    });
    return links.map((l) => l.recipientId);
  }

  async confirmedRelativeIds(recipientId: string): Promise<string[]> {
    const links = await this.prisma.relativeLink.findMany({
      where: { recipientId, status: LinkStatus.CONFIRMED },
      select: { relativeId: true },
    });
    return links.map((l) => l.relativeId);
  }

  /** Может ли пользователь действовать от имени получателя (заявки, адреса, правила). */
  async canManageRecipient(user: AuthUser, recipientId: string): Promise<boolean> {
    if (isStaff(user)) return true;
    if (user.role === Role.RECIPIENT) return user.id === recipientId;
    if (user.role === Role.RELATIVE) return this.isConfirmedRelative(user.id, recipientId);
    return false;
  }

  async assertCanManageRecipient(user: AuthUser, recipientId: string): Promise<void> {
    if (!(await this.canManageRecipient(user, recipientId))) {
      throw new ForbiddenException('Нет доступа к данным этого получателя');
    }
  }

  /**
   * Чью заявку/адрес/правило создаём: получатель — всегда себе, родственник и координатор
   * обязаны указать recipientId. Проверяет, что это действительно получатель и к нему есть доступ.
   */
  async resolveRecipientFor(user: AuthUser, recipientId?: string): Promise<string> {
    const id = user.role === Role.RECIPIENT ? (recipientId ?? user.id) : recipientId;
    if (!id) throw new BadRequestException('Укажите получателя (recipientId)');
    await this.assertCanManageRecipient(user, id);
    const recipient = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true, isActive: true },
    });
    if (!recipient || recipient.role !== Role.RECIPIENT) {
      throw new NotFoundException('Получатель не найден');
    }
    if (!recipient.isActive) throw new BadRequestException('Аккаунт получателя заблокирован');
    return id;
  }

  /** Кому сообщать о заявке получателя: он сам и подтверждённые родственники. */
  async ownerUserIds(recipientId: string): Promise<string[]> {
    return [recipientId, ...(await this.confirmedRelativeIds(recipientId))];
  }

  async isVerifiedVolunteer(userId: string): Promise<boolean> {
    const p = await this.prisma.volunteerProfile.findUnique({
      where: { userId },
      select: { verificationStatus: true },
    });
    return p?.verificationStatus === VerificationStatus.VERIFIED;
  }

  /** null — доступа нет. */
  async taskRelation(user: AuthUser, task: TaskAccessInfo): Promise<TaskRelation | null> {
    if (isStaff(user)) return 'STAFF';
    if (user.role === Role.VOLUNTEER) {
      if (task.volunteerId === user.id) return 'VOLUNTEER';
      if (task.status === TaskStatus.NEW && (await this.isVerifiedVolunteer(user.id))) {
        return 'CATALOG';
      }
      return null;
    }
    if (await this.canManageRecipient(user, task.recipientId)) return 'OWNER';
    return null;
  }
}
