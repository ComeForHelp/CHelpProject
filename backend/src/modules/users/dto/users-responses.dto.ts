import { ContactPreference, VerificationStatus } from '@prisma/client';
import { DistrictDto, EnumProperty, UserPublicDto } from '../../../common/dto/responses.dto';

export class MeRecipientProfileDto {
  mobilityNotes: string | null;
  @EnumProperty('ContactPreference')
  contactPreference: ContactPreference;
}

export class MeVolunteerProfileDto {
  @EnumProperty('VerificationStatus')
  verificationStatus: VerificationStatus;
  /** Причина отказа или блокировки */
  verificationNote: string | null;
  verifiedAt: Date | null;
  hasCar: boolean;
  about: string | null;
  ratingAvg: number;
  tasksDone: number;
  districts: DistrictDto[];
}

export class MeDto extends UserPublicDto {
  /** false — аккаунт создан координатором без пароля */
  hasPassword: boolean;
  recipientProfile: MeRecipientProfileDto | null;
  volunteerProfile: MeVolunteerProfileDto | null;
}
