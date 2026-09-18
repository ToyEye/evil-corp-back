import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AppNotification, UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import { assertFound, toIso } from '../common/utils/access';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationView = {
  id: string;
  companyId: string;
  recipientUserId?: string;
  recipientRole?: UserRole;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(user: JwtPayload): Promise<NotificationView[]> {
    const items = await this.prisma.appNotification.findMany({
      where: {
        companyId: user.companyId,
        OR: [
          { recipientUserId: user.sub },
          { recipientRole: user.role },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => this.toView(item));
  }

  async markRead(user: JwtPayload, id: string): Promise<NotificationView> {
    const notification = assertFound(
      await this.prisma.appNotification.findUnique({ where: { id } }),
      'Notification not found',
    );

    this.assertMine(user, notification);

    const updated = await this.prisma.appNotification.update({
      where: { id },
      data: { read: true },
    });

    return this.toView(updated);
  }

  async markAllRead(user: JwtPayload): Promise<{ updated: number }> {
    const result = await this.prisma.appNotification.updateMany({
      where: {
        companyId: user.companyId,
        read: false,
        OR: [
          { recipientUserId: user.sub },
          { recipientRole: user.role },
        ],
      },
      data: { read: true },
    });

    return { updated: result.count };
  }

  private assertMine(user: JwtPayload, notification: AppNotification): void {
    const sameCompany = notification.companyId === user.companyId;
    const matchesUser = notification.recipientUserId === user.sub;
    const matchesRole = notification.recipientRole === user.role;

    if (!sameCompany || (!matchesUser && !matchesRole)) {
      throw new ForbiddenException('Notification is not for this user');
    }
  }

  toView(item: AppNotification): NotificationView {
    return {
      id: item.id,
      companyId: item.companyId,
      ...(item.recipientUserId != null
        ? { recipientUserId: item.recipientUserId }
        : {}),
      ...(item.recipientRole != null
        ? { recipientRole: item.recipientRole }
        : {}),
      title: item.title,
      body: item.body,
      ...(item.href != null ? { href: item.href } : {}),
      read: item.read,
      createdAt: toIso(item.createdAt),
    };
  }
}
