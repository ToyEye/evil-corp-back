import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CompanyType } from '@prisma/client';
import type { JwtPayload } from '../../auth/auth.types';

/** Platform users see all companies; client users are scoped to their own. */
export const companyScopeWhere = (
  user: JwtPayload,
): { companyId?: string } => {
  if (user.companyType === CompanyType.platform) {
    return {};
  }

  return { companyId: user.companyId };
};

export const assertCompanyAccess = (
  user: JwtPayload,
  companyId: string,
): void => {
  if (
    user.companyType !== CompanyType.platform &&
    user.companyId !== companyId
  ) {
    throw new ForbiddenException('Access denied for this company');
  }
};

export const assertFound = <T>(
  value: T | null | undefined,
  message = 'Resource not found',
): T => {
  if (value == null) {
    throw new NotFoundException(message);
  }

  return value;
};

export const assert: (
  condition: unknown,
  message: string,
) => asserts condition = (condition, message) => {
  if (!condition) {
    throw new BadRequestException(message);
  }
};

export const toIso = (value: Date): string => value.toISOString();

export const toIsoDate = (value: Date): string =>
  value.toISOString().slice(0, 10);

export const newId = (): string => crypto.randomUUID();
