import { Body, Controller, Get, HttpCode, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, RequireVerifiedVolunteer, Roles } from '../../common/decorators';
import {
  AllowCatalogView,
  TaskAccess,
  TaskAccessContext,
  TaskAccessGuard,
} from '../../common/guards/task-access.guard';
import { AuthUser } from '../../common/types';
import {
  AssignVolunteerDto,
  CancelTaskDto,
  CatalogQueryDto,
  CreateTaskDto,
  MyTasksQueryDto,
  ReasonDto,
  RepeatTaskDto,
  StaffTasksQueryDto,
  UpdateTaskDto,
} from './dto/tasks.dto';
import { TasksService } from './tasks.service';
import {
  CatalogPageDto,
  StatusHistoryEntryDto,
  TaskCardDto,
  TaskDetailDto,
} from './dto/tasks-responses.dto';
import { ApiPaginatedResponse, ApiStandardErrors, OkDto } from '../../common/dto/responses.dto';

/**
 * Доступ проверяется в два шага: RolesGuard (глобальный) — по роли,
 * TaskAccessGuard — что заявка именно твоя. Все смены статуса идут через TaskStatusService.
 */
@ApiTags('tasks')
@ApiBearerAuth()
@ApiStandardErrors()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @Roles(Role.RECIPIENT, Role.RELATIVE, Role.COORDINATOR)
  @ApiOperation({ summary: 'Создать заявку (для себя, за подопечного или по звонку)' })
  @ApiCreatedResponse({ type: TaskDetailDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasks.create(user, dto);
  }

  @Get()
  @Roles(Role.COORDINATOR)
  @ApiOperation({ summary: 'Все заявки с фильтрами (таблица координатора)' })
  @ApiPaginatedResponse(TaskCardDto)
  listAll(@Query() q: StaffTasksQueryDto) {
    return this.tasks.listAll(q);
  }

  @Get('my')
  @Roles(Role.RECIPIENT, Role.RELATIVE, Role.VOLUNTEER)
  @ApiOperation({
    summary: 'Мои заявки: scope=active | history | all',
    description: 'Родственнику — заявки подопечных (recipientId — одного подопечного)',
  })
  @ApiPaginatedResponse(TaskCardDto)
  my(@CurrentUser() user: AuthUser, @Query() q: MyTasksQueryDto) {
    return this.tasks.my(user, q);
  }

  @Get('catalog')
  @Roles(Role.VOLUNTEER, Role.COORDINATOR)
  @RequireVerifiedVolunteer()
  @ApiOperation({ summary: 'Каталог открытых заявок (только NEW, срочные сверху)' })
  @ApiOkResponse({ type: CatalogPageDto })
  catalog(@CurrentUser() user: AuthUser, @Query() q: CatalogQueryDto) {
    return this.tasks.catalog(user, q);
  }

  @Get(':id')
  @UseGuards(TaskAccessGuard)
  @AllowCatalogView()
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Карточка заявки — поля зависят от роли и от того, взята ли заявка' })
  @ApiOkResponse({ type: TaskDetailDto })
  findOne(@CurrentUser() user: AuthUser, @TaskAccess() ctx: TaskAccessContext) {
    return this.tasks.findOne(user, ctx);
  }

  @Patch(':id')
  @UseGuards(TaskAccessGuard)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Изменить заявку, пока её не начали выполнять' })
  @ApiOkResponse({ type: TaskDetailDto })
  update(
    @CurrentUser() user: AuthUser,
    @TaskAccess() ctx: TaskAccessContext,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(user, ctx, dto);
  }

  @Get(':id/history')
  @UseGuards(TaskAccessGuard)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Журнал статусов: кто, когда, из какого в какой' })
  @ApiOkResponse({ type: [StatusHistoryEntryDto] })
  history(@TaskAccess() ctx: TaskAccessContext) {
    return this.tasks.history(ctx);
  }

  @Post(':id/repeat')
  @UseGuards(TaskAccessGuard)
  @Roles(Role.RECIPIENT, Role.RELATIVE, Role.COORDINATOR)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Повторить заявку с новым временем (кнопка «Повторить» в истории)' })
  @ApiCreatedResponse({ type: TaskDetailDto })
  repeat(
    @CurrentUser() user: AuthUser,
    @TaskAccess() ctx: TaskAccessContext,
    @Body() dto: RepeatTaskDto,
  ) {
    return this.tasks.repeat(user, ctx, dto);
  }

  // ───────────── Волонтёр ─────────────

  @Post(':id/take')
  @HttpCode(200)
  @Roles(Role.VOLUNTEER)
  @RequireVerifiedVolunteer()
  @UseGuards(TaskAccessGuard)
  @AllowCatalogView()
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Взять заявку из каталога' })
  @ApiOkResponse({ type: TaskDetailDto })
  take(@CurrentUser() user: AuthUser, @TaskAccess() ctx: TaskAccessContext) {
    return this.tasks.take(user, ctx);
  }

  @Post(':id/decline')
  @HttpCode(200)
  @Roles(Role.VOLUNTEER)
  @UseGuards(TaskAccessGuard)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Отказаться от взятой заявки (вернётся в каталог)' })
  @ApiOkResponse({ type: OkDto })
  decline(
    @CurrentUser() user: AuthUser,
    @TaskAccess() ctx: TaskAccessContext,
    @Body() dto: ReasonDto,
  ) {
    return this.tasks.decline(user, ctx, dto.reason);
  }

  @Post(':id/start')
  @HttpCode(200)
  @Roles(Role.VOLUNTEER, Role.COORDINATOR)
  @UseGuards(TaskAccessGuard)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: '«Начал выполнение»' })
  @ApiOkResponse({ type: TaskDetailDto })
  start(@CurrentUser() user: AuthUser, @TaskAccess() ctx: TaskAccessContext) {
    return this.tasks.start(user, ctx);
  }

  @Post(':id/done')
  @HttpCode(200)
  @Roles(Role.VOLUNTEER, Role.COORDINATOR)
  @UseGuards(TaskAccessGuard)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: '«Выполнено» — ждёт подтверждения получателя' })
  @ApiOkResponse({ type: TaskDetailDto })
  done(@CurrentUser() user: AuthUser, @TaskAccess() ctx: TaskAccessContext) {
    return this.tasks.done(user, ctx);
  }

  // ───────────── Получатель / родственник ─────────────

  @Post(':id/confirm')
  @HttpCode(200)
  @Roles(Role.RECIPIENT, Role.RELATIVE, Role.COORDINATOR)
  @UseGuards(TaskAccessGuard)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Подтвердить выполнение (после этого можно оценить)' })
  @ApiOkResponse({ type: TaskDetailDto })
  confirm(@CurrentUser() user: AuthUser, @TaskAccess() ctx: TaskAccessContext) {
    return this.tasks.confirm(user, ctx);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Roles(Role.RECIPIENT, Role.RELATIVE, Role.COORDINATOR)
  @UseGuards(TaskAccessGuard)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Отменить с причиной (только до начала выполнения)' })
  @ApiOkResponse({ type: TaskDetailDto })
  cancel(
    @CurrentUser() user: AuthUser,
    @TaskAccess() ctx: TaskAccessContext,
    @Body() dto: CancelTaskDto,
  ) {
    return this.tasks.cancel(user, ctx, dto.reason);
  }

  // ───────────── Координатор ─────────────

  @Post(':id/assign')
  @HttpCode(200)
  @Roles(Role.COORDINATOR)
  @UseGuards(TaskAccessGuard)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Назначить (или переназначить) волонтёра' })
  @ApiOkResponse({ type: TaskDetailDto })
  assign(
    @CurrentUser() user: AuthUser,
    @TaskAccess() ctx: TaskAccessContext,
    @Body() dto: AssignVolunteerDto,
  ) {
    return this.tasks.assign(user, ctx, dto);
  }

  @Post(':id/unassign')
  @HttpCode(200)
  @Roles(Role.COORDINATOR)
  @UseGuards(TaskAccessGuard)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Снять волонтёра — заявка вернётся в каталог' })
  @ApiOkResponse({ type: TaskDetailDto })
  unassign(
    @CurrentUser() user: AuthUser,
    @TaskAccess() ctx: TaskAccessContext,
    @Body() dto: ReasonDto,
  ) {
    return this.tasks.unassign(user, ctx, dto.reason);
  }
}
