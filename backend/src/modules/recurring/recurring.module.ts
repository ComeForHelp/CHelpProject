import { Module } from '@nestjs/common';
import { AddressesModule } from '../addresses/addresses.module';
import { RecurringController } from './recurring.controller';
import { RecurringScheduler } from './recurring.scheduler';
import { RecurringService } from './recurring.service';

@Module({
  imports: [AddressesModule],
  controllers: [RecurringController],
  providers: [RecurringService, RecurringScheduler],
  exports: [RecurringScheduler],
})
export class RecurringModule {}
