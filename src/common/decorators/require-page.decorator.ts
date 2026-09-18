import { SetMetadata } from '@nestjs/common';
import type { AppPageId } from '@prisma/client';

export const REQUIRE_PAGE_KEY = 'requirePage';

/**
 * Require PageAccess matrix permission for this page.
 * Also enforces client-company-only ops pages for platform users.
 */
export const RequirePage = (pageId: AppPageId) =>
  SetMetadata(REQUIRE_PAGE_KEY, pageId);
