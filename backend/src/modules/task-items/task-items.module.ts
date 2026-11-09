import { Module } from '@nestjs/common';
import { TaskItemsController } from './task-items.controller';
import { TaskItemsService } from './task-items.service';

@Module({
  controllers: [TaskItemsController],
  providers: [TaskItemsService],
})
export class TaskItemsModule {}
