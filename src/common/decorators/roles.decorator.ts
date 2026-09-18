import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Require one of the listed roles (empty / omitted = any authenticated role). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
