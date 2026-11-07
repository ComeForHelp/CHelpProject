import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { VERIFIED_VOLUNTEER_KEY } from '../decorators/verified-volunteer.decorator';
import { AuthUser } from '../types';

/**
 * Первый шаг проверки доступа — по роли (@Roles) и по статусу верификации волонтёра.
 * Второй шаг — принадлежность конкретной заявки — делает TaskAccessGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const user: AuthUser | undefined = context.switchToHttp().getRequest().user;
    if (!user) return false;

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (roles?.length) {
      const allowed =
        roles.includes(user.role) || (user.role === Role.ADMIN && roles.includes(Role.COORDINATOR));
      if (!allowed) throw new ForbiddenException('Недостаточно прав для этого действия');
    }

    const needVerified = this.reflector.getAllAndOverride<boolean>(VERIFIED_VOLUNTEER_KEY, targets);
    if (needVerified && user.role === Role.VOLUNTEER) {
      const profile = await this.prisma.volunteerProfile.findUnique({
        where: { userId: user.id },
        select: { verificationStatus: true },
      });
      if (profile?.verificationStatus !== VerificationStatus.VERIFIED) {
        throw new ForbiddenException('Доступно после проверки координатором');
      }
    }
    return true;
  }
}
