import { Global, Module } from '@nestjs/common';
import { AccessService } from './access.service';
import { TaskAccessGuard } from '../guards/task-access.guard';

@Global()
@Module({
  providers: [AccessService, TaskAccessGuard],
  exports: [AccessService, TaskAccessGuard],
})
export class AccessModule {}
