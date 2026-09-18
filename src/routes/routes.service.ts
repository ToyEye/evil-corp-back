import { Injectable } from '@nestjs/common';
import {
  DeliveryStatus,
  type Company,
  type DispatchRoute,
} from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import {
  assert,
  assertCompanyAccess,
  assertFound,
  companyScopeWhere,
  newId,
  toIso,
} from '../common/utils/access';
import { canEditDeliveryAssignment } from '../common/utils/enums';
import { nextRouteNumber } from '../common/utils/numbering';
import { PrismaService } from '../prisma/prisma.service';
import { AssignRouteStopsDto, CreateRouteDto } from './dto/route.dto';

type RouteWithCompany = DispatchRoute & { company: Company };

export type RouteView = {
  id: string;
  number: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleName: string;
  companyId: string;
  companyName: string;
  createdAt: string;
};

@Injectable()
export class RoutesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: JwtPayload): Promise<RouteView[]> {
    const routes = await this.prisma.dispatchRoute.findMany({
      where: companyScopeWhere(user),
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
    return routes.map((route) => this.toView(route));
  }

  async create(user: JwtPayload, dto: CreateRouteDto): Promise<RouteView> {
    const driver = assertFound(
      await this.prisma.user.findUnique({ where: { id: dto.driverId } }),
      'Driver not found',
    );
    const vehicle = assertFound(
      await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } }),
      'Vehicle not found',
    );

    assertCompanyAccess(user, driver.companyId);
    assert(
      driver.companyId === vehicle.companyId,
      'Driver and vehicle must belong to the same company',
    );

    const numbers = (
      await this.prisma.dispatchRoute.findMany({
        where: { companyId: driver.companyId },
        select: { number: true },
      })
    ).map((item) => item.number);

    const created = await this.prisma.dispatchRoute.create({
      data: {
        id: newId(),
        number: nextRouteNumber(numbers),
        driverId: driver.id,
        driverName: driver.name,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        companyId: driver.companyId,
        createdAt: new Date(),
      },
      include: { company: true },
    });

    return this.toView(created);
  }

  async assignStops(
    user: JwtPayload,
    routeId: string,
    dto: AssignRouteStopsDto,
  ): Promise<RouteView> {
    const route = assertFound(
      await this.prisma.dispatchRoute.findUnique({
        where: { id: routeId },
        include: { company: true },
      }),
      'Route not found',
    );
    assertCompanyAccess(user, route.companyId);

    const deliveries = await this.prisma.delivery.findMany({
      where: { id: { in: dto.deliveryIds }, companyId: route.companyId },
    });
    assert(
      deliveries.length === dto.deliveryIds.length,
      'One or more deliveries were not found',
    );

    const byId = new Map(deliveries.map((item) => [item.id, item]));

    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < dto.deliveryIds.length; index += 1) {
        const deliveryId = dto.deliveryIds[index];
        const delivery = byId.get(deliveryId)!;
        assert(
          canEditDeliveryAssignment(delivery.status),
          `Delivery ${delivery.number} cannot be reassigned`,
        );

        await tx.delivery.update({
          where: { id: deliveryId },
          data: {
            routeId: route.id,
            routeNumber: route.number,
            stopIndex: index,
            driverId: route.driverId,
            driverName: route.driverName,
            vehicleId: route.vehicleId,
            vehicleName: route.vehicleName,
            status:
              delivery.status === DeliveryStatus.New
                ? DeliveryStatus.Planned
                : delivery.status,
          },
        });
      }
    });

    return this.toView(route);
  }

  toView(route: RouteWithCompany): RouteView {
    return {
      id: route.id,
      number: route.number,
      driverId: route.driverId,
      driverName: route.driverName,
      vehicleId: route.vehicleId,
      vehicleName: route.vehicleName,
      companyId: route.companyId,
      companyName: route.company.name,
      createdAt: toIso(route.createdAt),
    };
  }
}
