import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AttachmentKind,
  ContactPreference,
  Frequency,
  PaymentMethod,
  Role,
  TaskStatus,
  Urgency,
} from '@prisma/client';
import {
  CategoryDto,
  DistrictDto,
  EnumProperty,
  PaginatedDto,
  PersonShortDto,
  PersonWithRoleDto,
} from '../../../common/dto/responses.dto';

export class TaskItemDto {
  id: string;
  taskId: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  note: string | null;
  /** Отметка «куплено» */
  isChecked: boolean;
  position: number;
  createdAt: Date;
}

/** CatalogTaskCard — карточка в каталоге волонтёра (без улицы и имени получателя) */
export class CatalogCardDto {
  id: string;
  title: string;
  @EnumProperty('TaskStatus')
  status: TaskStatus;
  @EnumProperty('Urgency')
  urgency: Urgency;
  windowStart: Date;
  windowEnd: Date;
  category: CategoryDto;
  district: DistrictDto;
  /** Выше 1-го этажа и без лифта — значок «без лифта» */
  noElevator: boolean;
  floor: number | null;
  /** Примерная сумма, ₽ */
  estimatedCost: number | null;
  @EnumProperty('PaymentMethod')
  paymentMethod: PaymentMethod;
  itemsCount: number;
  createdAt: Date;
}

/** TaskCard — строка списка у получателя, родственника, волонтёра и координатора */
export class TaskCardDto extends CatalogCardDto {
  street: string;
  recipient: PersonShortDto;
  volunteer: PersonShortDto | null;
  recurringRuleId: string | null;
  acceptedAt: Date | null;
  doneAt: Date | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
}

/** GET /tasks/catalog */
export class CatalogPageDto extends PaginatedDto {
  items: CatalogCardDto[];
  /** Какие районы применены (по умолчанию — из профиля волонтёра) */
  districtIds: number[];
}

/** Адрес в карточке заявки. Для CATALOG — только district, street, floor, hasElevator */
export class TaskAddressDto {
  district: DistrictDto;
  street: string;
  floor: number | null;
  hasElevator: boolean;
  @ApiPropertyOptional() id?: string;
  @ApiPropertyOptional() userId?: string;
  @ApiPropertyOptional({ nullable: true }) label?: string | null;
  @ApiPropertyOptional() districtId?: number;
  @ApiPropertyOptional() house?: string;
  @ApiPropertyOptional({ nullable: true }) apartment?: string | null;
  @ApiPropertyOptional({ nullable: true }) entrance?: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Лестницы, подъём, код домофона' })
  accessNotes?: string | null;
  @ApiPropertyOptional() isDefault?: boolean;
  @ApiPropertyOptional() createdAt?: Date;
}

/** Получатель в карточке. Для CATALOG — только firstName */
export class TaskRecipientDto {
  firstName: string;
  @ApiPropertyOptional() id?: string;
  @ApiPropertyOptional() lastName?: string;
  @ApiPropertyOptional({ nullable: true }) middleName?: string | null;
  @ApiPropertyOptional() phone?: string;
  @ApiPropertyOptional({ nullable: true, description: '«Хожу с тростью»' })
  mobilityNotes?: string | null;
  @EnumProperty('ContactPreference', { required: false, nullable: true })
  contactPreference?: ContactPreference | null;
}

export class TaskRelativeContactDto {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  relation: string | null;
}

export class TaskVolunteerDto {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  /** Для кнопки «Позвонить» */
  phone: string;
  ratingAvg: number | null;
  tasksDone: number | null;
  hasCar: boolean | null;
}

export class TaskAttachmentShortDto {
  id: string;
  @EnumProperty('AttachmentKind')
  kind: AttachmentKind;
  mimeType: string;
  sizeBytes: number;
  originalName: string | null;
  createdAt: Date;
  uploadedById: string;
}

export class TaskReviewShortDto {
  id: string;
  authorId: string;
  targetId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export class TaskRuleShortDto {
  id: string;
  title: string;
  @EnumProperty('Frequency')
  frequency: Frequency;
}

export class TaskCreatedByDto extends PersonShortDto {
  @EnumProperty('Role')
  role: Role;
}

/**
 * TaskDetails — одна карточка на все роли.
 * viewerRelation = CATALOG (проверенный волонтёр смотрит открытую заявку) — необязательные поля отсутствуют.
 * Кнопки рисовать по availableTransitions.
 */
export class TaskDetailDto {
  id: string;
  title: string;
  description: string | null;
  /** Куда сопроводить */
  destination: string | null;
  @EnumProperty('TaskStatus')
  status: TaskStatus;
  @EnumProperty('Urgency')
  urgency: Urgency;
  windowStart: Date;
  windowEnd: Date;
  estimatedCost: number | null;
  @EnumProperty('PaymentMethod')
  paymentMethod: PaymentMethod;
  category: CategoryDto;
  items: TaskItemDto[];
  createdAt: Date;

  @ApiProperty({
    enum: ['OWNER', 'VOLUNTEER', 'STAFF', 'CATALOG'],
    enumName: 'TaskRelation',
    description:
      'OWNER — получатель или родственник, VOLUNTEER — назначенный волонтёр, STAFF — координатор, ' +
      'CATALOG — волонтёр смотрит открытую заявку (урезанные данные)',
  })
  viewerRelation: 'OWNER' | 'VOLUNTEER' | 'STAFF' | 'CATALOG';

  @EnumProperty('TaskStatus', {
    isArray: true,
    description: 'В какие статусы этот пользователь может перевести заявку сейчас',
  })
  availableTransitions: TaskStatus[];

  address: TaskAddressDto;
  recipient: TaskRecipientDto;

  @ApiPropertyOptional({ description: 'Только CATALOG: можно нажать «Взять»' })
  canTake?: boolean;

  @ApiPropertyOptional({
    type: [TaskRelativeContactDto],
    description: 'Телефоны родственников — назначенному волонтёру и координатору',
  })
  relatives?: TaskRelativeContactDto[];

  @ApiPropertyOptional({ type: TaskVolunteerDto, nullable: true })
  volunteer?: TaskVolunteerDto | null;
  @ApiPropertyOptional({ type: TaskCreatedByDto }) createdBy?: TaskCreatedByDto;
  @ApiPropertyOptional({ type: TaskRuleShortDto, nullable: true })
  recurringRule?: TaskRuleShortDto | null;
  @ApiPropertyOptional({ type: [TaskAttachmentShortDto] }) attachments?: TaskAttachmentShortDto[];
  @ApiPropertyOptional({ type: [TaskReviewShortDto] }) reviews?: TaskReviewShortDto[];
  @ApiPropertyOptional({
    type: TaskReviewShortDto,
    nullable: true,
    description: 'Моя оценка, если ставил',
  })
  myReview?: TaskReviewShortDto | null;
  @ApiPropertyOptional({ nullable: true }) acceptedAt?: Date | null;
  @ApiPropertyOptional({ nullable: true }) startedAt?: Date | null;
  @ApiPropertyOptional({ nullable: true }) doneAt?: Date | null;
  @ApiPropertyOptional({ nullable: true }) confirmedAt?: Date | null;
  @ApiPropertyOptional({ nullable: true }) cancelledAt?: Date | null;
  @ApiPropertyOptional({ nullable: true }) cancelReason?: string | null;
  @ApiPropertyOptional() updatedAt?: Date;
}

/** Запись журнала статусов (StatusHistory) */
export class StatusHistoryEntryDto {
  id: string;
  taskId: string;
  @EnumProperty('TaskStatus', { nullable: true, description: 'null — заявка создана' })
  fromStatus: TaskStatus | null;
  @EnumProperty('TaskStatus')
  toStatus: TaskStatus;
  /** null — переход сделала система (cron) */
  changedById: string | null;
  comment: string | null;
  createdAt: Date;
  changedBy: PersonWithRoleDto | null;
}
