import { ConflictException, Injectable } from '@nestjs/common';
import type { Company, Supplier, SupplierType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import {
  assertCompanyAccess,
  assertFound,
  companyScopeWhere,
  newId,
  toIsoDate,
} from '../common/utils/access';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

type SupplierWithCompany = Supplier & { company: Company };

export type SupplierView = {
  id: string;
  name: string;
  type: SupplierType;
  addedAt: string;
  description: string;
  doesNotSupply: string;
  notes: string;
  companyId: string;
  companyName: string;
};

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: JwtPayload): Promise<SupplierView[]> {
    const items = await this.prisma.supplier.findMany({
      where: companyScopeWhere(user),
      include: { company: true },
      orderBy: { name: 'asc' },
    });

    return items.map((item) => this.toView(item));
  }

  async create(user: JwtPayload, dto: CreateSupplierDto): Promise<SupplierView> {
    try {
      const created = await this.prisma.supplier.create({
        data: {
          id: newId(),
          name: dto.name.trim(),
          type: dto.type,
          addedAt: new Date(),
          description: dto.description.trim(),
          doesNotSupply: dto.doesNotSupply.trim(),
          notes: dto.notes?.trim() ?? '',
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
        throw new ConflictException(
          'Supplier name must be unique within a company',
        );
      }
      throw error;
    }
  }

  async update(
    user: JwtPayload,
    id: string,
    dto: UpdateSupplierDto,
  ): Promise<SupplierView> {
    const existing = assertFound(
      await this.prisma.supplier.findUnique({ where: { id } }),
      'Supplier not found',
    );
    assertCompanyAccess(user, existing.companyId);

    try {
      const updated = await this.prisma.supplier.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.addedAt !== undefined
            ? { addedAt: new Date(dto.addedAt) }
            : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() }
            : {}),
          ...(dto.doesNotSupply !== undefined
            ? { doesNotSupply: dto.doesNotSupply.trim() }
            : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes.trim() } : {}),
        },
        include: { company: true },
      });

      return this.toView(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Supplier name must be unique within a company',
        );
      }
      throw error;
    }
  }

  toView(item: SupplierWithCompany): SupplierView {
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      addedAt: toIsoDate(item.addedAt),
      description: item.description,
      doesNotSupply: item.doesNotSupply,
      notes: item.notes,
      companyId: item.companyId,
      companyName: item.company.name,
    };
  }
}
