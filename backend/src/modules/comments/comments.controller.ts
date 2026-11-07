import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import {
  TaskAccess,
  TaskAccessContext,
  TaskAccessGuard,
} from '../../common/guards/task-access.guard';
import { AuthUser } from '../../common/types';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/comments.dto';
import { CommentDto } from './dto/comments-responses.dto';
import { ApiStandardErrors } from '../../common/dto/responses.dto';

@ApiTags('comments')
@ApiBearerAuth()
@ApiParam({ name: 'taskId', format: 'uuid' })
@UseGuards(TaskAccessGuard)
@ApiStandardErrors()
@Controller('tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'Переписка внутри заявки' })
  @ApiOkResponse({ type: [CommentDto] })
  list(@TaskAccess() ctx: TaskAccessContext) {
    return this.comments.list(ctx);
  }

  @Post()
  @ApiOperation({ summary: 'Написать сообщение (участники заявки получат уведомление)' })
  @ApiCreatedResponse({ type: CommentDto })
  create(
    @CurrentUser() user: AuthUser,
    @TaskAccess() ctx: TaskAccessContext,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.create(user, ctx, dto.text);
  }
}
