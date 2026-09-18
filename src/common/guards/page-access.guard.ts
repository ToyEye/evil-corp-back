import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { JwtPayload } from '../../auth/auth.types';
import { REQUIRE_PAGE_KEY } from '../decorators/require-page.decorator';

type AuthenticatedRequest = Request & { user?: JwtPayload };

/**
 * Stub: later reads PageAccess matrix from DB (defaultPageAccess).
 * Currently allows any authenticated request when a page is required.
 */
@Injectable()
export class PageAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const pageId = this.reflector.getAllAndOverride<string>(REQUIRE_PAGE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!pageId) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return Boolean(request.user);
  }
}
