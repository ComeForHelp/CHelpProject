import {
  Body,
  Controller,
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
  BlockUserDto,
  ChangePasswordDto,
  CreateStaffDto,
  SetPasswordDto,
  UpdateMeDto,
  UsersQueryDto,
} from './dto/users.dto';
import { UsersService } from './users.service';
import { MeDto } from './dto/users-responses.dto';
import {
  ApiPaginatedResponse,
  ApiStandardErrors,
  UserPublicDto,
} from '../../common/dto/responses.dto';

@ApiTags('users')
@ApiBearerAuth()
@ApiStandardErrors()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Мой профиль (с профилем получателя или волонтёра)' })
  @ApiOkResponse({ type: MeDto })
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Изменить ФИО и e-mail' })
  @ApiOkResponse({ type: MeDto })
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.id, dto);
  }

  @Post('me/password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Сменить пароль (все сессии завершаются)' })
  @ApiNoContentResponse({ description: 'Готово, тела ответа нет' })
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    await this.users.changePassword(user.id, dto);
  }

  @Get()
  @Roles(Role.COORDINATOR)
  @ApiOperation({ summary: 'Все пользователи с поиском (координатор)' })
  @ApiPaginatedResponse(UserPublicDto)
  list(@Query() q: UsersQueryDto) {
    return this.users.list(q);
  }

  @Post('staff')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Создать координатора или администратора (только ADMIN)' })
  @ApiCreatedResponse({ type: UserPublicDto })
  createStaff(@Body() dto: CreateStaffDto) {
    return this.users.createStaff(dto);
  }

  @Post(':id/password')
  @HttpCode(204)
  @Roles(Role.COORDINATOR)
  @ApiOperation({ summary: 'Задать пароль пользователю (например, получателю без интернета)' })
  @ApiNoContentResponse({ description: 'Готово, тела ответа нет' })
  async setPassword(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPasswordDto,
  ) {
    await this.users.setPassword(actor, id, dto.password);
  }

  @Post(':id/block')
  @HttpCode(200)
  @Roles(Role.COORDINATOR)
  @ApiOperation({ summary: 'Заблокировать пользователя (сессии отзываются сразу)' })
  @ApiOkResponse({ type: UserPublicDto })
  block(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _dto: BlockUserDto,
  ) {
    return this.users.setActive(actor, id, false);
  }

  @Post(':id/unblock')
  @HttpCode(200)
  @Roles(Role.COORDINATOR)
  @ApiOperation({ summary: 'Разблокировать пользователя' })
  @ApiOkResponse({ type: UserPublicDto })
  unblock(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.setActive(actor, id, true);
  }
}
