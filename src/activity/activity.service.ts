import { Injectable } from '@nestjs/common';
import { CompanyType, type ActivityEvent } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import {
  assert,
  assertCompanyAccess,
  companyScopeWhere,
  toIso,
} from '../common/utils/access';
import { PrismaService } from '../prisma/prisma.service';

export type ActivityEventView = {
  id: string;
  companyId: string;
  entityType: ActivityEvent['entityType'];
  entityId: string;
  entityNumber: string;
  message: string;
  actorId: string;
  actorName: string;
  createdAt: string;
};

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: JwtPayload,
    companyId?: string,
  ): Promise<ActivityEventView[]> {
    let whereCompanyId: string | undefined;

    if (user.companyType === CompanyType.platform) {
      if (companyId) {
        whereCompanyId = companyId;
      }
    } else {
      assert(
        !companyId || companyId === user.companyId,
        'Cannot filter activity for another company',
      );
      whereCompanyId = user.companyId;
    }

    if (whereCompanyId) {
      assertCompanyAccess(user, whereCompanyId);
    }

    const scope = whereCompanyId
      ? { companyId: whereCompanyId }
      : companyScopeWhere(user);

    const events = await this.prisma.activityEvent.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
    });

    return events.map((event) => this.toView(event));
  }

  toView(event: ActivityEvent): ActivityEventView {
    return {
      id: event.id,
      companyId: event.companyId,
      entityType: event.entityType,
      entityId: event.entityId,
      entityNumber: event.entityNumber,
      message: event.message,
      actorId: event.actorId,
      actorName: event.actorName,
      createdAt: toIso(event.createdAt),
    };
  }
}
