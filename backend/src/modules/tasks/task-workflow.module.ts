import { Global, Module } from '@nestjs/common';
import { TaskStatusService } from './task-status.service';

/**
 * Глобальный модуль со сменой статусов: им пользуются заявки, регулярные правила (cron),
 * волонтёры (блокировка снимает заявки) и координатор — без циклических импортов.
 */
@Global()
@Module({
  providers: [TaskStatusService],
  exports: [TaskStatusService],
})
export class TaskWorkflowModule {}
