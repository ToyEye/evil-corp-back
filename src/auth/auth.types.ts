import type { CompanyType, UserRole } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  companyId: string;
  companyType: CompanyType;
};

export type AuthUserView = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  companyName: string;
  avatarUrl?: string | null;
};
