import { Injectable } from '@nestjs/common';
import { ActivityEntityType, UserRole, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { newId, toIso } from '../common/utils/access';

export type NotifyTarget =
  | {
      userId: string;
      title: string;
      body: string;
      href?: string;
    }
  | {
      role: UserRole;
      title: string;
      body: string;
      href?: string;
    };

export type LogOpsEventInput = {
  companyId: string;
  entityType: ActivityEntityType;
  entityId: string;
  entityNumber: string;
  message: string;
  actorId: string;
  actorName: string;
  notify?: NotifyTarget[];
  /** Optional transaction client for atomic workflows. */
  tx?: Prisma.TransactionClient;
};

@Injectable()
export class OpsService {
  constructor(private readonly prisma: PrismaService) {}

  async logEvent(input: LogOpsEventInput) {
    const db = input.tx ?? this.prisma;
    const createdAt = new Date();
    const activityId = newId();

    const activity = await db.activityEvent.create({
      data: {
        id: activityId,
        companyId: input.companyId,
        entityType: input.entityType,
        entityId: input.entityId,
        entityNumber: input.entityNumber,
        message: input.message,
        actorId: input.actorId,
        actorName: input.actorName,
        createdAt,
      },
    });

    const notifications = [];

    for (const target of input.notify ?? []) {
      const notification = await db.appNotification.create({
        data: {
          id: newId(),
          companyId: input.companyId,
          recipientUserId: 'userId' in target ? target.userId : null,
          recipientRole: 'role' in target ? target.role : null,
          title: target.title,
          body: target.body,
          href: target.href,
          read: false,
          createdAt,
        },
      });
      notifications.push(notification);
    }

    return {
      activity: {
        id: activity.id,
        companyId: activity.companyId,
        entityType: activity.entityType,
        entityId: activity.entityId,
        entityNumber: activity.entityNumber,
        message: activity.message,
        actorId: activity.actorId,
        actorName: activity.actorName,
        createdAt: toIso(activity.createdAt),
      },
      notifications,
    };
  }
}
