import { Role, VerificationStatus } from '@prisma/client';
import { EnumProperty } from '../../../common/dto/responses.dto';

export class AuthUserDto {
  id: string;
  @EnumProperty('Role')
  role: Role;
  firstName: string;
  lastName: string;
  /** Только у волонтёра; до VERIFIED пускать лишь на /volunteer/pending и /volunteer/profile */
  @EnumProperty('VerificationStatus', { nullable: true })
  verificationStatus: VerificationStatus | null;
}

export class AuthResponseDto {
  /** Живёт 15 минут. Заголовок Authorization: Bearer <accessToken>. В payload — sub и role */
  accessToken: string;
  /** Одноразовый: после /auth/refresh старый недействителен */
  refreshToken: string;
  user: AuthUserDto;
}
