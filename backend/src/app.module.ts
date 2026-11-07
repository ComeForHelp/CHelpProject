import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard, throttlerOptions } from './common/guards/throttler.guard';
import { AccessModule } from './common/access/access.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DecimalInterceptor } from './common/interceptors/decimal.interceptor';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommentsModule } from './modules/comments/comments.module';
import { CoordinatorModule } from './modules/coordinator/coordinator.module';
import { DictionariesModule } from './modules/dictionaries/dictionaries.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RecipientsModule } from './modules/recipients/recipients.module';
import { RecurringModule } from './modules/recurring/recurring.module';
import { RelativesModule } from './modules/relatives/relatives.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { TaskItemsModule } from './modules/task-items/task-items.module';
import { TaskWorkflowModule } from './modules/tasks/task-workflow.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';
import { VolunteersModule } from './modules/volunteers/volunteers.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AccessModule,
    JwtModule.register({ global: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot(throttlerOptions()),
    NotificationsModule,
    TaskWorkflowModule,
    AuthModule,
    UsersModule,
    RecipientsModule,
    VolunteersModule,
    RelativesModule,
    AddressesModule,
    DictionariesModule,
    TasksModule,
    TaskItemsModule,
    RecurringModule,
    CommentsModule,
    AttachmentsModule,
    ReviewsModule,
    CoordinatorModule,
  ],
  providers: [
    // Порядок важен: сначала лимит запросов (до любой работы с БД), потом токен, потом роль.
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: DecimalInterceptor },
  ],
})
export class AppModule {}
