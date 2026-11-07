import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  SetMetadata,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessService, TaskAccessInfo, TaskRelation } from '../access/access.service';
import { AuthUser } from '../types';

export const TASK_CATALOG_KEY = 'taskAllowCatalog';
/** Разрешить доступ волонтёру, который смотрит открытую заявку из каталога. */
export const AllowCatalogView = () => SetMetadata(TASK_CATALOG_KEY, true);

export interface TaskAccessContext {
  task: TaskAccessInfo;
  relation: TaskRelation;
}

/**
 * Второй шаг проверки доступа: заявка из параметра :id или :taskId должна быть «твоей» —
 * ты получатель, его подтверждённый родственник, назначенный волонтёр или координатор.
 * Результат кладётся в request.taskAccess и доступен через @TaskAccess().
 */
@Injectable()
export class TaskAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;
    const taskId: string | undefined = request.params?.taskId ?? request.params?.id;
    if (!taskId) throw new NotFoundException('Заявка не найдена');

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, recipientId: true, volunteerId: true, status: true },
    });
    if (!task) throw new NotFoundException('Заявка не найдена');

    const relation = await this.access.taskRelation(user, task);
    const allowCatalog = this.reflector.getAllAndOverride<boolean>(TASK_CATALOG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!relation || (relation === 'CATALOG' && !allowCatalog)) {
      throw new ForbiddenException('Нет доступа к этой заявке');
    }

    request.taskAccess = { task, relation } satisfies TaskAccessContext;
    return true;
  }
}

export const TaskAccess = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TaskAccessContext =>
    ctx.switchToHttp().getRequest().taskAccess,
);
