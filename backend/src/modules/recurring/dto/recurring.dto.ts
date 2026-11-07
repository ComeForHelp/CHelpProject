import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Frequency, PaymentMethod } from '@prisma/client';
import { trim } from '../../../common/utils/transform';
import { TaskItemInputDto } from '../../tasks/dto/tasks.dto';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateRecurringRuleDto {
  @ApiPropertyOptional({ description: 'За кого (родственнику и координатору — обязательно)' })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiProperty() @IsInt() categoryId: number;
  @ApiProperty() @IsUUID() addressId: string;

  @ApiPropertyOptional({ description: 'Постоянный волонтёр — заявки сразу назначаются ему' })
  @IsOptional()
  @IsUUID()
  preferredVolunteerId?: string | null;

  @ApiProperty({ example: 'Лекарства из аптеки' })
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;

  @ApiPropertyOptional({ type: [TaskItemInputDto], description: 'Шаблон списка покупок' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TaskItemInputDto)
  itemsTemplate?: TaskItemInputDto[];

  @ApiProperty({ enum: Frequency }) @IsEnum(Frequency) frequency: Frequency;

  @ApiPropertyOptional({
    type: [Number],
    example: [2],
    description: 'Дни недели для WEEKLY/BIWEEKLY: 1 = пн … 7 = вс',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({ minimum: 1, maximum: 28, description: 'Число месяца для MONTHLY' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth?: number;

  @ApiProperty({ example: '10:00', description: 'Местное время Владивостока' })
  @Matches(TIME, { message: 'Время в формате ЧЧ:ММ' })
  timeFrom: string;

  @ApiProperty({ example: '13:00' })
  @Matches(TIME, { message: 'Время в формате ЧЧ:ММ' })
  timeTo: string;

  @ApiProperty({ example: '2026-11-10' })
  @Matches(DATE, { message: 'Дата в формате ГГГГ-ММ-ДД' })
  startsOn: string;

  @ApiPropertyOptional({ example: '2027-03-01', nullable: true })
  @IsOptional()
  @Matches(DATE, { message: 'Дата в формате ГГГГ-ММ-ДД' })
  endsOn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedCost?: number;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

export class UpdateRecurringRuleDto extends PartialType(
  OmitType(CreateRecurringRuleDto, ['recipientId'] as const),
) {
  @ApiPropertyOptional({ description: 'false — «на паузе»' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RecurringQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() recipientId?: string;
}
