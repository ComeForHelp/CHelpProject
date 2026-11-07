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
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/decorators';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/types';
import {
  UpdateVolunteerProfileDto,
  VerifyVolunteerDto,
  VolunteersQueryDto,
} from './dto/volunteers.dto';
import { VolunteersService } from './volunteers.service';
import {
  VolunteerDetailDto,
  VolunteerHistoryDto,
  VolunteerListItemDto,
  VolunteerProfileDto,
} from './dto/volunteers-responses.dto';
import { ApiPaginatedResponse, ApiStandardErrors } from '../../common/dto/responses.dto';

@ApiTags('volunteers')
@ApiBearerAuth()
@ApiStandardErrors()
@Controller('volunteers')
export class VolunteersController {
  constructor(private readonly volunteers: VolunteersService) {}

  @Get('me')
  @Roles(Role.VOLUNTEER)
  @ApiOperation({ summary: 'Мой профиль волонтёра: статус проверки, районы, рейтинг' })
  @ApiOkResponse({ type: VolunteerProfileDto })
  me(@CurrentUser() user: AuthUser) {
    return this.volunteers.getProfile(user.id);
  }

  @Patch('me')
  @Roles(Role.VOLUNTEER)
  @ApiOperation({ summary: 'Изменить «о себе», машину и районы (доступно и до проверки)' })
  @ApiOkResponse({ type: VolunteerProfileDto })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateVolunteerProfileDto) {
    return this.volunteers.updateProfile(user.id, dto);
  }

  @Get('me/history')
  @Roles(Role.VOLUNTEER)
  @ApiOperation({ summary: 'Выполненные заявки, полученные оценки и рейтинг' })
  @ApiOkResponse({ type: VolunteerHistoryDto })
  history(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    return this.volunteers.history(user.id, q);
  }

  @Get()
  @Roles(Role.COORDINATOR)
  @ApiOperation({
    summary: 'Список волонтёров (вкладки «На проверке / Активные / Заблокированные»)',
    description: 'Для подбора на заявку: status=VERIFIED&districtId=…&sort=rating',
  })
  @ApiPaginatedResponse(VolunteerListItemDto)
  list(@Query() q: VolunteersQueryDto) {
    return this.volunteers.list(q);
  }

  @Get(':id')
  @Roles(Role.COORDINATOR)
  @ApiOperation({ summary: 'Карточка волонтёра: профиль, история, отзывы' })
  @ApiOkResponse({ type: VolunteerDetailDto })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.volunteers.detail(id);
  }

  @Post(':id/verify')
  @HttpCode(200)
  @Roles(Role.COORDINATOR)
  @ApiOperation({ summary: 'Подтвердить / отклонить / заблокировать волонтёра' })
  @ApiOkResponse({ type: VolunteerDetailDto })
  verify(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyVolunteerDto,
  ) {
    return this.volunteers.verify(user.id, id, dto);
  }
}
