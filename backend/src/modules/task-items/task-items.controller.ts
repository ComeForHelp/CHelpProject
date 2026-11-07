import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  TaskAccess,
  TaskAccessContext,
  TaskAccessGuard,
} from '../../common/guards/task-access.guard';
import { CreateTaskItemDto, UpdateTaskItemDto } from './dto/task-items.dto';
import { TaskItemsService } from './task-items.service';
import { TaskItemDto } from '../tasks/dto/tasks-responses.dto';
import { ApiStandardErrors } from '../../common/dto/responses.dto';

@ApiTags('task-items')
@ApiBearerAuth()
@ApiParam({ name: 'taskId', format: 'uuid' })
@UseGuards(TaskAccessGuard)
@ApiStandardErrors()
@Controller('tasks/:taskId/items')
export class TaskItemsController {
  constructor(private readonly items: TaskItemsService) {}

  @Get()
  @ApiOperation({ summary: 'Список покупок или лекарств' })
  @ApiOkResponse({ type: [TaskItemDto] })
  list(@TaskAccess() ctx: TaskAccessContext) {
    return this.items.list(ctx);
  }

  @Post()
  @ApiOperation({ summary: 'Добавить позицию (до начала выполнения)' })
  @ApiCreatedResponse({ type: TaskItemDto })
  create(@TaskAccess() ctx: TaskAccessContext, @Body() dto: CreateTaskItemDto) {
    return this.items.create(ctx, dto);
  }

  @Patch(':itemId')
  @ApiOperation({ summary: 'Изменить позицию; волонтёр — только отметку «куплено»' })
  @ApiOkResponse({ type: TaskItemDto })
  update(
    @TaskAccess() ctx: TaskAccessContext,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateTaskItemDto,
  ) {
    return this.items.update(ctx, itemId, dto);
  }

  @Delete(':itemId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить позицию' })
  @ApiNoContentResponse({ description: 'Готово, тела ответа нет' })
  async remove(
    @TaskAccess() ctx: TaskAccessContext,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    await this.items.remove(ctx, itemId);
  }
}
