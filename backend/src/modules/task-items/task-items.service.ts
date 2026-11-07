import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { TaskAccessContext } from '../../common/guards/task-access.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { EDITABLE_STATUSES } from '../tasks/task-status.machine';
import { CreateTaskItemDto, UpdateTaskItemDto } from './dto/task-items.dto';

/** Пока волонтёр может ставить отметки «куплено». */
const CHECKABLE_STATUSES: TaskStatus[] = [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS];

@Injectable()
export class TaskItemsService {
  constructor(private readonly prisma: PrismaService) {}

  list(ctx: TaskAccessContext) {
    return this.prisma.taskItem.findMany({
      where: { taskId: ctx.task.id },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(ctx: TaskAccessContext, dto: CreateTaskItemDto) {
    this.assertOwnerCanEdit(ctx);
    const position =
      dto.position ??
      ((
        await this.prisma.taskItem.aggregate({
          where: { taskId: ctx.task.id },
          _max: { position: true },
        })
      )._max.position ?? -1) + 1;
    return this.prisma.taskItem.create({ data: { ...dto, position, taskId: ctx.task.id } });
  }

  async update(ctx: TaskAccessContext, itemId: string, dto: UpdateTaskItemDto) {
    await this.getItem(ctx, itemId);
    if (ctx.relation === 'VOLUNTEER') {
      const { isChecked, ...rest } = dto;
      if (Object.values(rest).some((v) => v !== undefined)) {
        throw new ForbiddenException('Волонтёр может только отмечать купленное');
      }
      if (!CHECKABLE_STATUSES.includes(ctx.task.status)) {
        throw new ConflictException('Отмечать покупки можно только во время выполнения');
      }
      return this.prisma.taskItem.update({ where: { id: itemId }, data: { isChecked } });
    }
    // Получатель, родственник и координатор правят список до начала выполнения;
    // отметки «куплено» координатор может поправить и позже.
    const onlyCheck = Object.entries(dto).every(([k, v]) => k === 'isChecked' || v === undefined);
    if (!(onlyCheck && ctx.relation === 'STAFF')) this.assertOwnerCanEdit(ctx);
    return this.prisma.taskItem.update({ where: { id: itemId }, data: dto });
  }

  async remove(ctx: TaskAccessContext, itemId: string): Promise<void> {
    this.assertOwnerCanEdit(ctx);
    await this.getItem(ctx, itemId);
    await this.prisma.taskItem.delete({ where: { id: itemId } });
  }

  private assertOwnerCanEdit(ctx: TaskAccessContext) {
    if (ctx.relation !== 'OWNER' && ctx.relation !== 'STAFF') {
      throw new ForbiddenException('Список меняет получатель, родственник или координатор');
    }
    if (!EDITABLE_STATUSES.includes(ctx.task.status)) {
      throw new ConflictException('Заявку уже выполняют — список изменить нельзя');
    }
  }

  private async getItem(ctx: TaskAccessContext, itemId: string) {
    const item = await this.prisma.taskItem.findUnique({ where: { id: itemId } });
    if (!item || item.taskId !== ctx.task.id) throw new NotFoundException('Позиция не найдена');
    return item;
  }
}
