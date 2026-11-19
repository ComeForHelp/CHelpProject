import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { TaskItemInputDto } from '../../tasks/dto/tasks.dto';

export class CreateTaskItemDto extends TaskItemInputDto {
  @ApiPropertyOptional({ description: 'Порядок в списке' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateTaskItemDto extends PartialType(CreateTaskItemDto) {
  @ApiPropertyOptional({ description: 'Отметка «куплено» (волонтёр может менять только её)' })
  @IsOptional()
  @IsBoolean()
  isChecked?: boolean;

  @ApiPropertyOptional({
    description: 'Отметка «нет в наличии». true снимает «куплено», и наоборот',
  })
  @IsOptional()
  @IsBoolean()
  isUnavailable?: boolean;
}
