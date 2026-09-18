import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppPageId, CompanyType, UserRole } from '@prisma/client';
import type { Request } from 'express';
import type { JwtPayload } from '../../auth/auth.types';
import {
  CLIENT_COMPANY_ONLY_PAGES,
  DEFAULT_PAGE_ACCESS,
} from '../constants/page-access';
import { REQUIRE_PAGE_KEY } from '../decorators/require-page.decorator';
import { PrismaService } from '../../prisma/prisma.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Injectable()
export class PageAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const pageId = this.reflector.getAllAndOverride<AppPageId>(
      REQUIRE_PAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!pageId) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (
      CLIENT_COMPANY_ONLY_PAGES.has(pageId) &&
      user.companyType === CompanyType.platform
    ) {
      throw new ForbiddenException(
        'Platform users cannot access client-company operations',
      );
    }

    const roles = await this.resolveAllowedRoles(pageId);

    if (!roles.includes(user.role)) {
      throw new ForbiddenException(`No access to page: ${pageId}`);
    }

    return true;
  }

  private async resolveAllowedRoles(pageId: AppPageId): Promise<UserRole[]> {
    try {
      const record = await this.prisma.pageAccess.findUnique({
        where: { pageId },
      });

      if (record?.roles?.length) {
        return record.roles;
      }
    } catch {
      // DB may be unavailable before migrate; fall back to defaults.
    }

    return DEFAULT_PAGE_ACCESS[pageId] ?? [];
  }
}
