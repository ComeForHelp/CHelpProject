import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { trim } from '../../../common/utils/transform';

export class RelationFieldDto {
  @ApiPropertyOptional({ example: 'дочь' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  relation?: string;
}

/** Родственник отправляет запрос подопечному. */
export class RequestLinkDto extends RelationFieldDto {
  @ApiProperty({ description: 'Телефон подопечного', example: '+79140000001' })
  @IsString()
  @Length(10, 20)
  recipientPhone: string;
}

/** Получатель приглашает родственника — связь подтверждена сразу. */
export class InviteRelativeDto extends RelationFieldDto {
  @ApiProperty({ description: 'Телефон родственника' })
  @IsString()
  @Length(10, 20)
  relativePhone: string;
}

/** Координатор связывает двух существующих пользователей. */
export class StaffLinkDto extends RelationFieldDto {
  @ApiProperty() @IsUUID() recipientId: string;
  @ApiProperty() @IsUUID() relativeId: string;
}
