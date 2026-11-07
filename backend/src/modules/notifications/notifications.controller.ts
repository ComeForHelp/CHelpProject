import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { NotificationsQueryDto } from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';
import { NotificationDto } from './dto/notifications-responses.dto';
import {
  ApiPaginatedResponse,
  ApiStandardErrors,
  CountDto,
  UpdatedCountDto,
} from '../../common/dto/responses.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@ApiStandardErrors()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Мои уведомления (новые сверху)' })
  @ApiPaginatedResponse(NotificationDto)
  list(@CurrentUser() user: AuthUser, @Query() q: NotificationsQueryDto) {
    return this.notifications.list(user.id, q);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Число непрочитанных — для значка в шапке' })
  @ApiOkResponse({ type: CountDto })
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.id);
  }

  @Post('read-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Отметить все прочитанными' })
  @ApiOkResponse({ type: UpdatedCountDto })
  readAll(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Post(':id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Отметить уведомление прочитанным' })
  @ApiOkResponse({ type: NotificationDto })
  read(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(user.id, id);
  }
}
