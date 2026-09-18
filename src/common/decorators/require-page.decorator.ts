import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PAGE_KEY = 'requirePage';
export const RequirePage = (pageId: string) =>
  SetMetadata(REQUIRE_PAGE_KEY, pageId);
