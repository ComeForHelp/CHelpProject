import { ContactPreference, Frequency, LinkStatus, TaskStatus, Urgency } from '@prisma/client';
import {
  AddressDto,
  CategoryDto,
  DistrictDto,
  EnumProperty,
} from '../../../common/dto/responses.dto';

export class RecipientDto {
  id: string;
  phone: string;
  email: string | null;
  lastName: string;
  firstName: string;
  middleName: string | null;
  isActive: boolean;
  pdConsentAt: Date | null;
  createdAt: Date;
  /** false — зарегистрирован «за него», сам войти не может */
  canLogin: boolean;
  mobilityNotes: string | null;
  @EnumProperty('ContactPreference', { nullable: true })
  contactPreference: ContactPreference | null;
}

export class RecipientShortAddressDto {
  street: string;
  house: string;
  district: DistrictDto;
}

export class RecipientListItemDto extends RecipientDto {
  defaultAddress: RecipientShortAddressDto | null;
  /** Заявки в статусах NEW, ASSIGNED, IN_PROGRESS, DONE */
  activeTasks: number;
}

export class RecipientRelativeDto {
  linkId: string;
  relation: string | null;
  @EnumProperty('LinkStatus')
  status: LinkStatus;
  id: string;
  phone: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
}

export class RecipientTaskShortDto {
  id: string;
  title: string;
  @EnumProperty('TaskStatus')
  status: TaskStatus;
  @EnumProperty('Urgency')
  urgency: Urgency;
  windowStart: Date;
  windowEnd: Date;
  category: CategoryDto;
}

export class RecipientRuleShortDto {
  id: string;
  title: string;
  @EnumProperty('Frequency')
  frequency: Frequency;
  isActive: boolean;
  category: CategoryDto;
}

/** Карточка получателя: профиль, адреса, родственники, последние 20 заявок, регулярные правила */
export class RecipientDetailDto extends RecipientDto {
  addresses: AddressDto[];
  relatives: RecipientRelativeDto[];
  tasks: RecipientTaskShortDto[];
  recurringRules: RecipientRuleShortDto[];
}
