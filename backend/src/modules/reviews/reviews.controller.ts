import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/decorators';
import {
  TaskAccess,
  TaskAccessContext,
  TaskAccessGuard,
} from '../../common/guards/task-access.guard';
import { AuthUser } from '../../common/types';
import { CreateReviewDto } from './dto/reviews.dto';
import { ReviewsService } from './reviews.service';
import { ReviewDto, ReviewWithAuthorDto } from './dto/reviews-responses.dto';
import { ApiStandardErrors } from '../../common/dto/responses.dto';

@ApiTags('reviews')
@ApiBearerAuth()
@ApiParam({ name: 'taskId', format: 'uuid' })
@UseGuards(TaskAccessGuard)
@ApiStandardErrors()
@Controller('tasks/:taskId/reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Отзывы по заявке' })
  @ApiOkResponse({ type: [ReviewWithAuthorDto] })
  list(@TaskAccess() ctx: TaskAccessContext) {
    return this.reviews.list(ctx);
  }

  @Post()
  @Roles(Role.RECIPIENT, Role.RELATIVE, Role.COORDINATOR)
  @ApiOperation({ summary: 'Оценить волонтёра (1–5) после подтверждения' })
  @ApiCreatedResponse({ type: ReviewDto })
  create(
    @CurrentUser() user: AuthUser,
    @TaskAccess() ctx: TaskAccessContext,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(user, ctx, dto);
  }
}
