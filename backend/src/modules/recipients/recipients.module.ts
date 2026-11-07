import { Module } from '@nestjs/common';
import { AddressesModule } from '../addresses/addresses.module';
import { RecipientsController } from './recipients.controller';
import { RecipientsService } from './recipients.service';

@Module({
  imports: [AddressesModule],
  controllers: [RecipientsController],
  providers: [RecipientsService],
})
export class RecipientsModule {}
