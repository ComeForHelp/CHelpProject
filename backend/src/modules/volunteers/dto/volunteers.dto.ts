import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { VerificationStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class UpdateVolunteerProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasCar?: boolean;

  @ApiPropertyOptional({ description: 'О себе' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  about?: string;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Районы, где готов помогать (заменяют прежние)',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  districtIds?: number[];
}

export const VERIFICATION_DECISIONS = [
  VerificationStatus.VERIFIED,
  VerificationStatus.REJECTED,
  VerificationStatus.BLOCKED,
] as const;

export class VerifyVolunteerDto {
  @ApiProperty({ enum: VERIFICATION_DECISIONS })
  @IsIn(VERIFICATION_DECISIONS)
  decision: (typeof VERIFICATION_DECISIONS)[number];

  @ApiPropertyOptional({ description: 'Причина отказа или блокировки — увидит волонтёр' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class VolunteersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VerificationStatus })
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;

  @ApiPropertyOptional({ description: 'Только работающие в этом районе' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  districtId?: number;

  @ApiPropertyOptional({ description: 'Поиск по ФИО или телефону' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['rating', 'name', 'createdAt'], default: 'createdAt' })
  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsIn(['rating', 'name', 'createdAt'])
  sort?: 'rating' | 'name' | 'createdAt';
}
