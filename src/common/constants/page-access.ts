import { AppPageId, UserRole } from '@prisma/client';

/** Mirrors frontend `defaultPageAccess` / seed matrix. */
export const DEFAULT_PAGE_ACCESS: Record<AppPageId, UserRole[]> = {
  [AppPageId.dashboard]: [...Object.values(UserRole)],
  [AppPageId.users]: [UserRole.Admin, UserRole.SEO, UserRole.Staff],
  [AppPageId.settings]: [UserRole.Admin, UserRole.SEO],
  [AppPageId.warehouse]: [UserRole.SEO, UserRole.Storekeeper],
  [AppPageId.suppliers]: [UserRole.SEO, UserRole.Supply],
  [AppPageId.clients]: [UserRole.SEO, UserRole.Staff],
  [AppPageId.deliveries]: [UserRole.SEO, UserRole.Staff, UserRole.Driver],
  [AppPageId.orders]: [UserRole.Staff, UserRole.Accountant],
  [AppPageId.invoices]: [UserRole.SEO, UserRole.Accountant],
  [AppPageId.support]: [...Object.values(UserRole)],
};

/**
 * Ops pages available only to client companies (frontend `ClientCompanyRoute`).
 * Platform users are blocked even if their role appears in the matrix.
 */
export const CLIENT_COMPANY_ONLY_PAGES: ReadonlySet<AppPageId> = new Set([
  AppPageId.warehouse,
  AppPageId.suppliers,
  AppPageId.clients,
  AppPageId.deliveries,
  AppPageId.orders,
  AppPageId.invoices,
]);

/** Admin cannot be removed from `settings` access (frontend `isPageAccessLocked`). */
export const isPageAccessLocked = (pageId: AppPageId, role: UserRole): boolean =>
  pageId === AppPageId.settings && role === UserRole.Admin;
