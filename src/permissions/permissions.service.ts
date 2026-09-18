import { BadRequestException, Injectable } from '@nestjs/common';
import { AppPageId, UserRole } from '@prisma/client';
import {
  DEFAULT_PAGE_ACCESS,
  isPageAccessLocked,
} from '../common/constants/page-access';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePageAccessDto } from './dto/update-page-access.dto';

export type AppPageMeta = {
  id: AppPageId;
  label: string;
  description: string;
};

export const APP_PAGES: AppPageMeta[] = [
  {
    id: AppPageId.dashboard,
    label: 'Dashboard',
    description: 'Company overview and main workspace',
  },
  {
    id: AppPageId.users,
    label: 'Users',
    description: 'User list, roles, and company membership',
  },
  {
    id: AppPageId.settings,
    label: 'Settings',
    description: 'Company settings and page access',
  },
  {
    id: AppPageId.warehouse,
    label: 'Warehouse',
    description: 'Stock, bins, pick lists, and warehouse receipts',
  },
  {
    id: AppPageId.suppliers,
    label: 'Suppliers',
    description: 'Supplier directory for the supply department',
  },
  {
    id: AppPageId.clients,
    label: 'Clients',
    description: 'Customer directory with contacts and delivery addresses',
  },
  {
    id: AppPageId.deliveries,
    label: 'Deliveries',
    description: 'Dispatch board, fleet, and assigned deliveries',
  },
  {
    id: AppPageId.orders,
    label: 'Orders',
    description: 'Client orders, payment, and warehouse reservation',
  },
  {
    id: AppPageId.invoices,
    label: 'Invoices',
    description: 'Invoices issued from paid client orders',
  },
  {
    id: AppPageId.support,
    label: 'Support',
    description: 'Chat between client companies and platform Support',
  },
];

const ROLE_ORDER = Object.values(UserRole);

const orderedRoles = (roles: Iterable<UserRole>): UserRole[] => {
  const selected = new Set(roles);
  return ROLE_ORDER.filter((role) => selected.has(role));
};

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccess(): Promise<{
    pageAccess: Record<AppPageId, UserRole[]>;
    pages: AppPageMeta[];
  }> {
    const records = await this.prisma.pageAccess.findMany();
    const pageAccess = { ...DEFAULT_PAGE_ACCESS } as Record<
      AppPageId,
      UserRole[]
    >;

    for (const record of records) {
      pageAccess[record.pageId] = orderedRoles(record.roles);
    }

    for (const pageId of Object.values(AppPageId)) {
      pageAccess[pageId] = orderedRoles(pageAccess[pageId] ?? []);
    }

    return { pageAccess, pages: APP_PAGES };
  }

  async updateAccess(
    dto: UpdatePageAccessDto,
  ): Promise<Record<AppPageId, UserRole[]>> {
    const roles = orderedRoles(dto.roles);

    if (
      isPageAccessLocked(dto.pageId, UserRole.Admin) &&
      !roles.includes(UserRole.Admin)
    ) {
      throw new BadRequestException(
        'Admin cannot be removed from settings access',
      );
    }

    await this.prisma.pageAccess.upsert({
      where: { pageId: dto.pageId },
      create: { pageId: dto.pageId, roles },
      update: { roles },
    });

    const { pageAccess } = await this.getAccess();
    return pageAccess;
  }
}
