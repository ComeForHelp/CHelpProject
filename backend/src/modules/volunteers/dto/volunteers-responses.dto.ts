import { TaskStatus, VerificationStatus } from '@prisma/client';
import {
  CategoryDto,
  DistrictDto,
  EnumProperty,
  PaginatedDto,
  PersonShortDto,
} from '../../../common/dto/responses.dto';

/** GET/PATCH /volunteers/me */
export class VolunteerProfileDto {
  userId: string;
  @EnumProperty('VerificationStatus')
  verificationStatus: VerificationStatus;
  verifiedById: string | null;
  verifiedAt: Date | null;
  /** Причина отказа или блокировки — показать на /volunteer/pending */
  verificationNote: string | null;
  hasCar: boolean;
  about: string | null;
  ratingAvg: number;
  tasksDone: number;
  createdAt: Date;
  districts: DistrictDto[];
}

/** Строка списка волонтёров у координатора */
export class VolunteerListItemDto {
  id: string;
  phone: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  isActive: boolean;
  createdAt: Date;
  @EnumProperty('VerificationStatus', { nullable: true })
  verificationStatus: VerificationStatus | null;
  hasCar: boolean;
  ratingAvg: number;
  tasksDone: number;
  districts: DistrictDto[];
}

export class VolunteerDetailProfileDto {
  @EnumProperty('VerificationStatus')
  verificationStatus: VerificationStatus;
  hasCar: boolean;
  ratingAvg: number;
  tasksDone: number;
  districts: DistrictDto[];
  about: string | null;
  verificationNote: string | null;
  verifiedAt: Date | null;
  verifiedBy: PersonShortDto | null;
}

export class VolunteerRecentTaskDto {
  id: string;
  title: string;
  @EnumProperty('TaskStatus')
  status: TaskStatus;
  windowStart: Date;
  category: CategoryDto;
}

export class ReviewAuthorNameDto {
  firstName: string;
  lastName: string;
}

export class VolunteerReviewDto {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  taskId: string;
  author: ReviewAuthorNameDto;
}

/** Карточка волонтёра у координатора */
export class VolunteerDetailDto {
  id: string;
  phone: string;
  email: string | null;
  lastName: string;
  firstName: string;
  middleName: string | null;
  isActive: boolean;
  pdConsentAt: Date | null;
  createdAt: Date;
  profile: VolunteerDetailProfileDto | null;
  /** Взятые и выполняемые сейчас */
  activeTasks: number;
  recentTasks: VolunteerRecentTaskDto[];
  reviews: VolunteerReviewDto[];
}

export class HistoryReviewDto {
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export class HistoryAddressDto {
  district: DistrictDto;
}

export class VolunteerHistoryItemDto {
  id: string;
  title: string;
  @EnumProperty('TaskStatus')
  status: TaskStatus;
  windowStart: Date;
  doneAt: Date | null;
  confirmedAt: Date | null;
  category: CategoryDto;
  address: HistoryAddressDto;
  reviews: HistoryReviewDto[];
}

/** GET /volunteers/me/history */
export class VolunteerHistoryDto extends PaginatedDto {
  ratingAvg: number;
  tasksDone: number;
  items: VolunteerHistoryItemDto[];
}
