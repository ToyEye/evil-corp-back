import { ConflictException, Injectable } from '@nestjs/common';
import type { Company, InventoryItem } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import {
  assertCompanyAccess,
  assertFound,
  companyScopeWhere,
  newId,
} from '../common/utils/access';
import {
  fromApiInventoryCategory,
  toApiInventoryCategory,
  type ApiInventoryCategory,
} from '../common/utils/enums';
import { ZONE_BY_CATEGORY } from '../common/utils/stock';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';

type InventoryWithCompany = InventoryItem & { company: Company };

export type InventoryItemView = {
  id: string;
  sku: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
  category: ApiInventoryCategory;
  zone: InventoryItem['zone'];
  bin: string;
  companyId: string;
  companyName: string;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: JwtPayload): Promise<InventoryItemView[]> {
    const items = await this.prisma.inventoryItem.findMany({
      where: companyScopeWhere(user),
      include: { company: true },
      orderBy: { sku: 'asc' },
    });

    return items.map((item) => this.toView(item));
  }

  async create(
    user: JwtPayload,
    dto: CreateInventoryItemDto,
  ): Promise<InventoryItemView> {
    const category = fromApiInventoryCategory(dto.category);
    const zone = ZONE_BY_CATEGORY[category];

    try {
      const created = await this.prisma.inventoryItem.create({
        data: {
          id: newId(),
          sku: dto.sku.trim(),
          name: dto.name.trim(),
          description: dto.description.trim(),
          quantity: dto.quantity,
          price: dto.price,
          category,
          zone,
          bin: dto.bin.trim(),
          companyId: user.companyId,
        },
        include: { company: true },
      });

      return this.toView(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('SKU must be unique within a company');
      }
      throw error;
    }
  }

  async update(
    user: JwtPayload,
    id: string,
    dto: UpdateInventoryItemDto,
  ): Promise<InventoryItemView> {
    const existing = assertFound(
      await this.prisma.inventoryItem.findUnique({ where: { id } }),
      'Inventory item not found',
    );
    assertCompanyAccess(user, existing.companyId);

    const category =
      dto.category !== undefined
        ? fromApiInventoryCategory(dto.category)
        : existing.category;
    const zone =
      dto.category !== undefined
        ? ZONE_BY_CATEGORY[category]
        : existing.zone;

    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.bin !== undefined ? { bin: dto.bin.trim() } : {}),
        category,
        zone,
      },
      include: { company: true },
    });

    return this.toView(updated);
  }

  async adjust(
    user: JwtPayload,
    id: string,
    dto: AdjustInventoryDto,
  ): Promise<InventoryItemView> {
    const existing = assertFound(
      await this.prisma.inventoryItem.findUnique({ where: { id } }),
      'Inventory item not found',
    );
    assertCompanyAccess(user, existing.companyId);

    const quantity = Math.max(0, existing.quantity + dto.delta);

    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: { quantity },
      include: { company: true },
    });

    return this.toView(updated);
  }

  toView(item: InventoryWithCompany): InventoryItemView {
    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      category: toApiInventoryCategory(item.category),
      zone: item.zone,
      bin: item.bin,
      companyId: item.companyId,
      companyName: item.company.name,
    };
  }
}
