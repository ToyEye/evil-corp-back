import { Injectable } from '@nestjs/common';
import type { Company, Vehicle, VehicleType } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import { companyScopeWhere, newId } from '../common/utils/access';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

type VehicleWithCompany = Vehicle & { company: Company };

export type VehicleView = {
  id: string;
  name: string;
  plate: string;
  type: VehicleType;
  maxUnits: number;
  companyId: string;
  companyName: string;
};

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: JwtPayload): Promise<VehicleView[]> {
    const items = await this.prisma.vehicle.findMany({
      where: companyScopeWhere(user),
      include: { company: true },
      orderBy: { name: 'asc' },
    });

    return items.map((item) => this.toView(item));
  }

  async create(user: JwtPayload, dto: CreateVehicleDto): Promise<VehicleView> {
    const created = await this.prisma.vehicle.create({
      data: {
        id: newId(),
        name: dto.name.trim(),
        plate: dto.plate.trim(),
        type: dto.type,
        maxUnits: dto.maxUnits,
        companyId: user.companyId,
      },
      include: { company: true },
    });

    return this.toView(created);
  }

  toView(item: VehicleWithCompany): VehicleView {
    return {
      id: item.id,
      name: item.name,
      plate: item.plate,
      type: item.type,
      maxUnits: item.maxUnits,
      companyId: item.companyId,
      companyName: item.company.name,
    };
  }
}
