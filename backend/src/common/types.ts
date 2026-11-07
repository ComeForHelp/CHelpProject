import { Role } from '@prisma/client';

/** Пользователь из access-токена, проверенный JwtAuthGuard. */
export interface AuthUser {
  id: string;
  role: Role;
}

export const STAFF_ROLES: Role[] = [Role.COORDINATOR, Role.ADMIN];

export function isStaff(user: AuthUser): boolean {
  return STAFF_ROLES.includes(user.role);
}
