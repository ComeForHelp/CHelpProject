import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
/** Ограничить маршрут ролями. ADMIN проходит везде, где разрешён COORDINATOR. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
