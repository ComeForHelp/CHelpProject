import { SetMetadata } from '@nestjs/common';

export const VERIFIED_VOLUNTEER_KEY = 'verifiedVolunteer';
/**
 * Для волонтёра маршрут доступен только после верификации координатором.
 * Другие роли этот флаг не затрагивает.
 */
export const RequireVerifiedVolunteer = () => SetMetadata(VERIFIED_VOLUNTEER_KEY, true);
