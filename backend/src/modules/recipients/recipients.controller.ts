import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { CreateRecipientDto, RecipientsQueryDto, UpdateRecipientDto } from './dto/recipients.dto';
import { RecipientsService } from './recipients.service';
import { RecipientDetailDto, RecipientListItemDto } from './dto/recipients-responses.dto';
import { ApiPaginatedResponse, ApiStandardErrors } from '../../common/dto/responses.dto';

@ApiTags('recipients')
@ApiBearerAuth()
@ApiStandardErrors()
@Controller('recipients')
export class RecipientsController {
  constructor(private readonly recipients: RecipientsService) {}

  @Post()
  @Roles(Role.RELATIVE, Role.COORDINATOR)
  @ApiOperation({
    summary: 'Зарегистрировать получателя за него',
    description: 'Родственник сразу получает подтверждённую связь. Можно сразу передать адрес.',
  })
  @ApiCreatedResponse({ type: RecipientDetailDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRecipientDto) {
    return this.recipients.create(user, dto);
  }

  @Get()
  @Roles(Role.COORDINATOR)
  @ApiOperation({ summary: 'Список получателей с поиском по ФИО и телефону' })
  @ApiPaginatedResponse(RecipientListItemDto)
  list(@Query() q: RecipientsQueryDto) {
    return this.recipients.list(q);
  }

  @Get('me')
  @Roles(Role.RECIPIENT)
  @ApiOperation({ summary: 'Мой профиль получателя с адресами и родственниками' })
  @ApiOkResponse({ type: RecipientDetailDto })
  me(@CurrentUser() user: AuthUser) {
    return this.recipients.detail(user, user.id);
  }

  @Patch('me')
  @Roles(Role.RECIPIENT)
  @ApiOperation({ summary: 'Изменить особенности и способ связи' })
  @ApiOkResponse({ type: RecipientDetailDto })
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateRecipientDto) {
    return this.recipients.update(user, user.id, dto);
  }

  @Get(':id')
  @Roles(Role.RELATIVE, Role.COORDINATOR)
  @ApiOperation({ summary: 'Карточка получателя (координатор или подтверждённый родственник)' })
  @ApiOkResponse({ type: RecipientDetailDto })
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.recipients.detail(user, id);
  }

  @Patch(':id')
  @Roles(Role.RELATIVE, Role.COORDINATOR)
  @ApiOperation({ summary: 'Изменить профиль получателя' })
  @ApiOkResponse({ type: RecipientDetailDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecipientDto,
  ) {
    return this.recipients.update(user, id, dto);
  }
}
