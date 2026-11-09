import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { trim } from '../../../common/utils/transform';

export class CreateCommentDto {
  @ApiProperty({ example: 'Хлеба бородинского не было, взял дарницкий' })
  @Transform(trim)
  @IsString()
  @Length(1, 2000)
  text: string;
}
