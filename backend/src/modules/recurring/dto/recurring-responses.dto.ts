import { Frequency, PaymentMethod } from '@prisma/client';
import {
  AddressDto,
  CategoryDto,
  EnumProperty,
  PersonShortDto,
} from '../../../common/dto/responses.dto';
import { TaskItemInputDto } from '../../tasks/dto/tasks.dto';

export class PreferredVolunteerDto extends PersonShortDto {
  phone: string;
}

export class RecurringRuleDto {
  id: string;
  recipientId: string;
  createdById: string;
  categoryId: number;
  addressId: string;
  preferredVolunteerId: string | null;
  title: string;
  description: string | null;
  itemsTemplate: TaskItemInputDto[];
  @EnumProperty('Frequency')
  frequency: Frequency;
  /** 1 = пн … 7 = вс */
  daysOfWeek: number[];
  dayOfMonth: number | null;
  /** "10:00", местное время Владивостока */
  timeFrom: string;
  timeTo: string;
  /** "2026-11-10" */
  startsOn: string;
  endsOn: string | null;
  estimatedCost: number | null;
  @EnumProperty('PaymentMethod')
  paymentMethod: PaymentMethod;
  /** false — на паузе */
  isActive: boolean;
  lastGeneratedOn: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: CategoryDto;
  address: AddressDto;
  recipient: PersonShortDto;
  preferredVolunteer: PreferredVolunteerDto | null;
  /** Ближайшие 3 даты ("2026-11-10"), пусто на паузе */
  nextDates: string[];
}

export class GenerationRunDto {
  /** Сколько активных правил обработано */
  rules: number;
  created: number;
  /** Сколько сразу назначено постоянному волонтёру */
  assigned: number;
  /** Сколько невзятых заявок переведено в EXPIRED */
  expired: number;
}
