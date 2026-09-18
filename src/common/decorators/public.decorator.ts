import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Skip global JWT auth for this route (e.g. login, join-requests create). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
