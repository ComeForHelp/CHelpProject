import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5, description: '5 крупных звёзд' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Всё купил, позвонил заранее. Спасибо!' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
