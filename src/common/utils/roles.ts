import { CompanyType, UserRole } from '@prisma/client';

export const PLATFORM_ONLY_ROLES: readonly UserRole[] = [
  UserRole.Admin,
  UserRole.Support,
];

export const FORBIDDEN_ROLES_IN_PLATFORM_COMPANY: readonly UserRole[] = [
  UserRole.Driver,
  UserRole.Storekeeper,
  UserRole.Supply,
  UserRole.Client,
];

export const canAssignCompanyRoles = (role: UserRole): boolean =>
  role === UserRole.SEO || role === UserRole.Staff || role === UserRole.Admin;

export const getAssignableMemberRoles = (
  companyType: CompanyType,
): UserRole[] => {
  const all = Object.values(UserRole).filter((role) => role !== UserRole.Admin);

  if (companyType === CompanyType.client) {
    return all.filter(
      (role) => !(PLATFORM_ONLY_ROLES as readonly UserRole[]).includes(role),
    );
  }

  const forbidden = new Set<UserRole>(FORBIDDEN_ROLES_IN_PLATFORM_COMPANY);
  return all.filter((role) => !forbidden.has(role));
};
