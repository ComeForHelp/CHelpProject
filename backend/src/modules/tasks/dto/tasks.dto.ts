import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod, TaskStatus, Urgency } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { toArray, toBoolean, toIntArray, trim } from '../../../common/utils/transform';

export class TaskItemInputDto {
  @ApiProperty({ example: 'Хлеб бородинский' })
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiPropertyOptional({ example: '2' }) @IsOptional() @IsString() @MaxLength(50) quantity?: string;
  @ApiPropertyOptional({ example: 'шт' }) @IsOptional() @IsString() @MaxLength(20) unit?: string;
  @ApiPropertyOptional({ example: 'нарезанный' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class CreateTaskDto {
  @ApiPropertyOptional({
    description: 'За кого заявка (родственнику и координатору — обязательно)',
  })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiProperty() @IsInt() categoryId: number;
  @ApiProperty() @IsUUID() addressId: string;

  @ApiProperty({ example: 'Купить продукты' })
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;

  @ApiPropertyOptional({
    description: 'Куда сопроводить',
    example: 'Поликлиника №3, ул. Острякова 5',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  destination?: string;

  @ApiPropertyOptional({ enum: Urgency, default: Urgency.NORMAL })
  @IsOptional()
  @IsEnum(Urgency)
  urgency?: Urgency;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  windowStart: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  windowEnd: Date;

  @ApiPropertyOptional({ description: 'Примерная сумма покупки, ₽' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedCost?: number;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.NONE })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ type: [TaskItemInputDto], description: 'Список покупок или лекарств' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TaskItemInputDto)
  items?: TaskItemInputDto[];
}

/** Править можно, пока заявку не начали выполнять. Список покупок — через /items. */
export class UpdateTaskDto extends PartialType(
  OmitType(CreateTaskDto, ['recipientId', 'items'] as const),
) {}

export class ReasonDto {
  @ApiPropertyOptional({ example: 'Заболел, не смогу прийти' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CancelTaskDto {
  @ApiProperty({ example: 'Соседка уже купила' })
  @Transform(trim)
  @IsString()
  @Length(1, 500)
  reason: string;
}

export class AssignVolunteerDto {
  @ApiProperty() @IsUUID() volunteerId: string;
}

export class RepeatTaskDto {
  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  windowStart: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  windowEnd: Date;
}

export const TASK_SCOPES = ['active', 'history', 'all'] as const;

export class MyTasksQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TASK_SCOPES, default: 'active' })
  @IsOptional()
  @IsIn(TASK_SCOPES)
  scope: (typeof TASK_SCOPES)[number] = 'active';

  @ApiPropertyOptional({ description: 'Родственнику: заявки одного подопечного' })
  @IsOptional()
  @IsUUID()
  recipientId?: string;
}

export const CATALOG_DATES = ['today', 'tomorrow', 'week'] as const;

export class CatalogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    type: [Number],
    description: 'Районы (через запятую). По умолчанию — районы из профиля волонтёра',
  })
  @IsOptional()
  @Transform(toIntArray)
  @IsInt({ each: true })
  districtIds?: number[];

  @ApiPropertyOptional({ description: 'Игнорировать районы из профиля' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  allDistricts?: boolean;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() categoryId?: number;

  @ApiPropertyOptional({ enum: CATALOG_DATES })
  @IsOptional()
  @IsIn(CATALOG_DATES)
  date?: (typeof CATALOG_DATES)[number];

  @ApiPropertyOptional({ enum: Urgency }) @IsOptional() @IsEnum(Urgency) urgency?: Urgency;

  @ApiPropertyOptional({ description: 'Нужны свои деньги на покупку' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  needsMoney?: boolean;
}

export class StaffTasksQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TaskStatus, isArray: true, description: 'Через запятую' })
  @IsOptional()
  @Transform(toArray)
  @IsEnum(TaskStatus, { each: true })
  status?: TaskStatus[];

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() districtId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() categoryId?: number;
  @ApiPropertyOptional({ enum: Urgency }) @IsOptional() @IsEnum(Urgency) urgency?: Urgency;
  @ApiPropertyOptional() @IsOptional() @IsUUID() recipientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() volunteerId?: string;

  @ApiPropertyOptional({ description: 'Без волонтёра' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  unassigned?: boolean;

  @ApiPropertyOptional({ description: 'Окно времени уже закончилось, а заявка не выполнена' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  overdue?: boolean;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Окно начинается не раньше',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Окно начинается раньше' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiPropertyOptional({ description: 'Поиск по заголовку, ФИО или телефону получателя' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['windowStart', 'createdAt'], default: 'windowStart' })
  @IsOptional()
  @IsIn(['windowStart', 'createdAt'])
  sort?: 'windowStart' | 'createdAt';
}
