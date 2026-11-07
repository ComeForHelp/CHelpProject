import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class ReportQueryDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'По умолчанию — 30 дней назад',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'По умолчанию — сейчас' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
