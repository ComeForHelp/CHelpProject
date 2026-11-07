import { Module } from '@nestjs/common';
import { VolunteersModule } from '../volunteers/volunteers.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [VolunteersModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
