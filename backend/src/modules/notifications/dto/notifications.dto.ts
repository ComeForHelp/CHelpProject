import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { toBoolean } from '../../../common/utils/transform';

export class NotificationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Только непрочитанные' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  unreadOnly?: boolean;
}
