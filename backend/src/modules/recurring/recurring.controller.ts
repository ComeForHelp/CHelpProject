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
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import {
  CreateRecurringRuleDto,
  RecurringQueryDto,
  UpdateRecurringRuleDto,
} from './dto/recurring.dto';
import { RecurringScheduler } from './recurring.scheduler';
import { RecurringService } from './recurring.service';
import { GenerationRunDto, RecurringRuleDto } from './dto/recurring-responses.dto';
import { ApiStandardErrors } from '../../common/dto/responses.dto';

@ApiTags('recurring')
@ApiBearerAuth()
@Roles(Role.RECIPIENT, Role.RELATIVE, Role.COORDINATOR)
@ApiStandardErrors()
@Controller('recurring-rules')
export class RecurringController {
  constructor(
    private readonly recurring: RecurringService,
    private readonly scheduler: RecurringScheduler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Регулярные поручения (с ближайшими датами)' })
  @ApiOkResponse({ type: [RecurringRuleDto] })
  list(@CurrentUser() user: AuthUser, @Query() q: RecurringQueryDto) {
    return this.recurring.list(user, q.recipientId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать правило: «каждый вторник лекарства»' })
  @ApiCreatedResponse({ type: RecurringRuleDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRecurringRuleDto) {
    return this.recurring.create(user, dto);
  }

  @Post('run')
  @HttpCode(200)
  @Roles(Role.COORDINATOR)
  @ApiOperation({
    summary: 'Запустить генерацию и закрытие просроченных сейчас (координатор, для проверки)',
  })
  @ApiOkResponse({ type: GenerationRunDto })
  async run() {
    const generated = await this.scheduler.generate();
    const expired = await this.scheduler.expireOverdue();
    return { ...generated, expired };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Правило' })
  @ApiOkResponse({ type: RecurringRuleDto })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.recurring.get(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Изменить правило; isActive=false — пауза' })
  @ApiOkResponse({ type: RecurringRuleDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecurringRuleDto,
  ) {
    return this.recurring.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить правило (созданные заявки остаются)' })
  @ApiNoContentResponse({ description: 'Готово, тела ответа нет' })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.recurring.remove(user, id);
  }
}
