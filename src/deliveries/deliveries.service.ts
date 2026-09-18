import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  DeliveryStatus,
  FulfillmentStatus,
  UserRole,
  type Company,
  type Delivery,
  type DeliveryItem,
  type DeliveryProof,
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
import {
  canEditDeliveryAssignment,
  fromApiDeliveryStatus,
  fromApiFailureReason,
  getDeliveryStatusFromSchedule,
  isDeliveryTerminal,
  toApiDeliveryStatus,
  toApiFailureReason,
  type ApiDeliveryStatus,
  type ApiFailureReason,
} from '../common/utils/enums';
import { nextDeliveryNumber } from '../common/utils/numbering';
import { isOrderFullyReserved } from '../common/utils/orders';
import { getStockLevel } from '../common/utils/stock';
import { OpsService } from '../ops/ops.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignDeliveryDto,
  CreateDeliveryDto,
  ProgressDeliveryDto,
} from './dto/delivery.dto';

type DeliveryWithRelations = Delivery & {
  company: Company;
  items: DeliveryItem[];
  proof: DeliveryProof | null;
};

export type DeliveryView = {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  driverId?: string;
  driverName?: string;
  addressId?: string;
  destination?: string;
  dispatchAt?: string;
  deliverBy?: string;
  notes: string;
  status: ApiDeliveryStatus;
  items: {
    productId: string;
    sku: string;
    name: string;
    quantity: number;
  }[];
  reservesStock: boolean;
  stockWrittenOff: boolean;
  vehicleId?: string;
  vehicleName?: string;
  routeId?: string;
  routeNumber?: string;
  stopIndex?: number;
  lat?: number;
  lng?: number;
  orderId?: string;
  orderNumber?: string;
  shippedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  failureReason?: ApiFailureReason;
  proof?: {
    photoUrl?: string;
    signatureUrl?: string;
    lat?: number;
    lng?: number;
    capturedAt?: string;
  };
  companyId: string;
  companyName: string;
  createdAt: string;
};

const statusMessage = (
  status: DeliveryStatus,
  failureReason?: ApiFailureReason,
): string => {
  if (status === DeliveryStatus.InTransit) {
    return 'Departed, stock written off';
  }
  if (status === DeliveryStatus.Arrived) {
    return 'Arrived on site';
  }
  if (status === DeliveryStatus.Done) {
    return 'Delivered';
  }
  if (status === DeliveryStatus.Failed) {
    return failureReason
      ? `Could not deliver: ${failureReason}`
      : 'Could not deliver';
  }
  if (status === DeliveryStatus.Canceled) {
    return 'Delivery canceled, stock returned to warehouse';
  }
  return `Status changed to ${toApiDeliveryStatus(status)}`;
};

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ops: OpsService,
    @Inject(forwardRef(() => OrdersService))
    private readonly orders: OrdersService,
  ) {}

  async list(user: JwtPayload): Promise<DeliveryView[]> {
    const items = await this.prisma.delivery.findMany({
      where: companyScopeWhere(user),
      include: { company: true, items: true, proof: true },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => this.toView(item));
  }

  async getById(user: JwtPayload, id: string): Promise<DeliveryView> {
    return this.toView(await this.getDeliveryOrThrow(user, id));
  }

  async create(
    user: JwtPayload,
    dto: CreateDeliveryDto,
  ): Promise<DeliveryView> {
    const client = assertFound(
      await this.prisma.client.findUnique({
        where: { id: dto.clientId },
        include: { addresses: true, company: true },
      }),
      'Client not found',
    );
    assertCompanyAccess(user, client.companyId);

    const address = dto.addressId
      ? client.addresses.find((item) => item.id === dto.addressId)
      : undefined;

    let lineItems: {
      productId: string;
      sku: string;
      name: string;
      quantity: number;
    }[] = [];
    let orderId: string | undefined;
    let orderNumber: string | undefined;

    if (dto.orderId) {
      const order = assertFound(
        await this.prisma.order.findUnique({
          where: { id: dto.orderId },
          include: { items: true },
        }),
        'Order not found',
      );
      assert(order.companyId === client.companyId, 'Order company mismatch');
      assert(
        order.fulfillmentStatus === FulfillmentStatus.Ready &&
          isOrderFullyReserved(order.items),
        'Order must be Ready with full reservation',
      );

      const existing = await this.prisma.delivery.findFirst({
        where: {
          orderId: order.id,
          status: {
            notIn: [
              DeliveryStatus.Canceled,
              DeliveryStatus.Done,
              DeliveryStatus.Failed,
            ],
          },
        },
      });
      assert(!existing, 'Order already has an active delivery');

      orderId = order.id;
      orderNumber = order.number;
      lineItems = order.items.map((item) => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
      }));
    } else {
      assert(dto.items?.length, 'Items are required without orderId');
      const products = await this.prisma.inventoryItem.findMany({
        where: {
          id: { in: dto.items.map((line) => line.productId) },
          companyId: client.companyId,
        },
      });
      const byId = new Map(products.map((item) => [item.id, item]));
      lineItems = dto.items.map((line) => {
        const product = byId.get(line.productId);
        assert(product, `Product not found: ${line.productId}`);
        return {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity: line.quantity,
        };
      });
    }

    const driver = dto.driverId
      ? assertFound(
          await this.prisma.user.findUnique({ where: { id: dto.driverId } }),
          'Driver not found',
        )
      : null;
    const vehicle = dto.vehicleId
      ? assertFound(
          await this.prisma.vehicle.findUnique({
            where: { id: dto.vehicleId },
          }),
          'Vehicle not found',
        )
      : null;

    if (driver) {
      assert(driver.companyId === client.companyId, 'Driver company mismatch');
    }
    if (vehicle) {
      assert(
        vehicle.companyId === client.companyId,
        'Vehicle company mismatch',
      );
    }

    const numbers = (
      await this.prisma.delivery.findMany({
        where: { companyId: client.companyId },
        select: { number: true },
      })
    ).map((item) => item.number);

    const dispatchAt = dto.dispatchAt ? new Date(dto.dispatchAt) : null;
    const deliverBy = dto.deliverBy ? new Date(dto.deliverBy) : null;
    const status = getDeliveryStatusFromSchedule(dispatchAt, deliverBy);
    const createdAt = new Date();
    const actor = assertFound(
      await this.prisma.user.findUnique({ where: { id: user.sub } }),
      'User not found',
    );

    const delivery = await this.prisma.$transaction(async (tx) => {
      const created = await tx.delivery.create({
        data: {
          id: newId(),
          number: nextDeliveryNumber(numbers),
          clientId: client.id,
          clientName: client.name,
          driverId: driver?.id,
          driverName: driver?.name,
          addressId: address?.id ?? dto.addressId,
          destination: dto.destination?.trim() || address?.line || undefined,
          dispatchAt,
          deliverBy,
          notes: dto.notes?.trim() ?? '',
          status,
          reservesStock: false,
          stockWrittenOff: false,
          vehicleId: vehicle?.id,
          vehicleName: vehicle?.name,
          lat: dto.lat ?? address?.lat,
          lng: dto.lng ?? address?.lng,
          orderId,
          orderNumber,
          companyId: client.companyId,
          createdAt,
          items: {
            create: lineItems.map((line) => ({
              id: newId(),
              productId: line.productId,
              sku: line.sku,
              name: line.name,
              quantity: line.quantity,
            })),
          },
        },
        include: { company: true, items: true, proof: true },
      });

      await this.ops.logEvent({
        tx,
        companyId: client.companyId,
        entityType: 'delivery',
        entityId: created.id,
        entityNumber: created.number,
        message: 'Delivery scheduled',
        actorId: actor.id,
        actorName: actor.name,
        notify: driver
          ? [
              {
                userId: driver.id,
                title: 'New delivery assigned',
                body: `${created.number} is ready for you`,
              },
            ]
          : [
              {
                role: UserRole.SEO,
                title: 'Delivery needs a driver',
                body: `${created.number} has no driver yet`,
              },
            ],
      });

      return created;
    });

    return this.toView(delivery);
  }

  async assign(
    user: JwtPayload,
    id: string,
    dto: AssignDeliveryDto,
  ): Promise<DeliveryView> {
    const delivery = await this.getDeliveryOrThrow(user, id);
    assert(
      canEditDeliveryAssignment(delivery.status),
      'Assignment can only be edited when New or Planned',
    );

    let driverId = delivery.driverId;
    let driverName = delivery.driverName;
    let vehicleId = delivery.vehicleId;
    let vehicleName = delivery.vehicleName;

    if (dto.driverId !== undefined) {
      if (dto.driverId === null) {
        driverId = null;
        driverName = null;
      } else {
        const driver = assertFound(
          await this.prisma.user.findUnique({ where: { id: dto.driverId } }),
          'Driver not found',
        );
        assert(
          driver.companyId === delivery.companyId,
          'Driver company mismatch',
        );
        driverId = driver.id;
        driverName = driver.name;
      }
    }

    if (dto.vehicleId !== undefined) {
      if (dto.vehicleId === null) {
        vehicleId = null;
        vehicleName = null;
      } else {
        const vehicle = assertFound(
          await this.prisma.vehicle.findUnique({
            where: { id: dto.vehicleId },
          }),
          'Vehicle not found',
        );
        assert(
          vehicle.companyId === delivery.companyId,
          'Vehicle company mismatch',
        );
        vehicleId = vehicle.id;
        vehicleName = vehicle.name;
      }
    }

    const dispatchAt =
      dto.dispatchAt === undefined
        ? delivery.dispatchAt
        : dto.dispatchAt
          ? new Date(dto.dispatchAt)
          : null;
    const deliverBy =
      dto.deliverBy === undefined
        ? delivery.deliverBy
        : dto.deliverBy
          ? new Date(dto.deliverBy)
          : null;

    const status =
      delivery.status === DeliveryStatus.New && (dispatchAt || deliverBy)
        ? DeliveryStatus.Planned
        : delivery.status;

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        driverId,
        driverName,
        vehicleId,
        vehicleName,
        addressId:
          dto.addressId === undefined ? delivery.addressId : dto.addressId,
        destination:
          dto.destination === undefined
            ? delivery.destination
            : dto.destination,
        dispatchAt,
        deliverBy,
        notes: dto.notes !== undefined ? dto.notes.trim() : delivery.notes,
        status,
      },
      include: { company: true, items: true, proof: true },
    });

    return this.toView(updated);
  }

  async progress(
    user: JwtPayload,
    id: string,
    dto: ProgressDeliveryDto,
  ): Promise<DeliveryView> {
    const delivery = await this.getDeliveryOrThrow(user, id);
    assert(!isDeliveryTerminal(delivery.status), 'Delivery is terminal');

    const nextStatus = fromApiDeliveryStatus(dto.status);
    const actor = assertFound(
      await this.prisma.user.findUnique({ where: { id: user.sub } }),
      'User not found',
    );

    const now = new Date();
    const shipping =
      nextStatus === DeliveryStatus.InTransit ||
      nextStatus === DeliveryStatus.Arrived ||
      nextStatus === DeliveryStatus.Done;
    const returning =
      nextStatus === DeliveryStatus.Canceled ||
      nextStatus === DeliveryStatus.Failed;

    const wasWrittenOff = delivery.stockWrittenOff;
    let stockWrittenOff = delivery.stockWrittenOff;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (shipping && !stockWrittenOff) {
        if (!delivery.reservesStock && !delivery.orderId) {
          for (const line of delivery.items) {
            const product = await tx.inventoryItem.findUnique({
              where: { id: line.productId },
            });
            if (!product) {
              continue;
            }
            await tx.inventoryItem.update({
              where: { id: line.productId },
              data: {
                quantity: Math.max(0, product.quantity - line.quantity),
              },
            });
          }
        }
        stockWrittenOff = true;
      }

      if (returning) {
        if (delivery.orderId) {
          const order = await tx.order.findUnique({
            where: { id: delivery.orderId },
            include: { items: true },
          });
          if (order) {
            for (const line of order.items) {
              if (line.reservedQuantity > 0) {
                await tx.inventoryItem.update({
                  where: { id: line.productId },
                  data: { quantity: { increment: line.reservedQuantity } },
                });
              }
            }
            await this.orders.releaseReservation(order.id, tx);
          }
          stockWrittenOff = false;
        } else if (
          stockWrittenOff ||
          delivery.reservesStock ||
          canEditDeliveryAssignment(delivery.status)
        ) {
          for (const line of delivery.items) {
            await tx.inventoryItem.update({
              where: { id: line.productId },
              data: { quantity: { increment: line.quantity } },
            });
          }
          stockWrittenOff = false;
        }
      }

      const failureReason = dto.failureReason
        ? fromApiFailureReason(dto.failureReason)
        : undefined;

      const result = await tx.delivery.update({
        where: { id },
        data: {
          status: nextStatus,
          stockWrittenOff,
          failureReason:
            nextStatus === DeliveryStatus.Failed ? failureReason : null,
          shippedAt:
            nextStatus === DeliveryStatus.InTransit ? now : delivery.shippedAt,
          arrivedAt:
            nextStatus === DeliveryStatus.Arrived ? now : delivery.arrivedAt,
          completedAt:
            nextStatus === DeliveryStatus.Done ||
            nextStatus === DeliveryStatus.Failed
              ? now
              : delivery.completedAt,
          proof: dto.proof
            ? {
                upsert: {
                  create: {
                    id: newId(),
                    photoUrl: dto.proof.photoUrl,
                    signatureUrl: dto.proof.signatureUrl,
                    lat: dto.proof.lat,
                    lng: dto.proof.lng,
                    capturedAt: dto.proof.capturedAt
                      ? new Date(dto.proof.capturedAt)
                      : now,
                  },
                  update: {
                    photoUrl: dto.proof.photoUrl,
                    signatureUrl: dto.proof.signatureUrl,
                    lat: dto.proof.lat,
                    lng: dto.proof.lng,
                    capturedAt: dto.proof.capturedAt
                      ? new Date(dto.proof.capturedAt)
                      : now,
                  },
                },
              }
            : undefined,
        },
        include: { company: true, items: true, proof: true },
      });

      const notify =
        nextStatus === DeliveryStatus.Failed
          ? [
              {
                role: UserRole.SEO,
                title: 'Delivery failed',
                body: `${delivery.number}: ${dto.failureReason ?? 'Could not deliver'}`,
              },
              {
                role: UserRole.Staff,
                title: 'Delivery failed',
                body: `${delivery.number}: ${dto.failureReason ?? 'Could not deliver'}`,
              },
            ]
          : nextStatus === DeliveryStatus.InTransit &&
              delivery.deliverBy &&
              delivery.deliverBy.getTime() < Date.now()
            ? [
                {
                  role: UserRole.SEO,
                  title: 'Delivery is overdue',
                  body: `${delivery.number} left after its planned ETA`,
                },
              ]
            : undefined;

      await this.ops.logEvent({
        tx,
        companyId: delivery.companyId,
        entityType: 'delivery',
        entityId: delivery.id,
        entityNumber: delivery.number,
        message: statusMessage(nextStatus, dto.failureReason),
        actorId: actor.id,
        actorName: actor.name,
        notify,
      });

      if (shipping && !wasWrittenOff) {
        for (const line of delivery.items) {
          const product = await tx.inventoryItem.findUnique({
            where: { id: line.productId },
          });
          if (!product || getStockLevel(product.quantity) !== 'critical') {
            continue;
          }
          await tx.appNotification.create({
            data: {
              id: newId(),
              companyId: delivery.companyId,
              recipientRole: UserRole.SEO,
              title: 'Critical stock',
              body: `${product.name} dropped below the safety level`,
              read: false,
              createdAt: now,
            },
          });
          await tx.appNotification.create({
            data: {
              id: newId(),
              companyId: delivery.companyId,
              recipientRole: UserRole.Storekeeper,
              title: 'Critical stock',
              body: `${product.name} dropped below the safety level`,
              read: false,
              createdAt: now,
            },
          });
        }
      }

      return result;
    });

    return this.toView(updated);
  }

  private async getDeliveryOrThrow(
    user: JwtPayload,
    id: string,
  ): Promise<DeliveryWithRelations> {
    const delivery = assertFound(
      await this.prisma.delivery.findUnique({
        where: { id },
        include: { company: true, items: true, proof: true },
      }),
      'Delivery not found',
    );
    assertCompanyAccess(user, delivery.companyId);
    return delivery;
  }

  toView(delivery: DeliveryWithRelations): DeliveryView {
    return {
      id: delivery.id,
      number: delivery.number,
      clientId: delivery.clientId,
      clientName: delivery.clientName,
      driverId: delivery.driverId ?? undefined,
      driverName: delivery.driverName ?? undefined,
      addressId: delivery.addressId ?? undefined,
      destination: delivery.destination ?? undefined,
      dispatchAt: delivery.dispatchAt ? toIso(delivery.dispatchAt) : undefined,
      deliverBy: delivery.deliverBy ? toIso(delivery.deliverBy) : undefined,
      notes: delivery.notes,
      status: toApiDeliveryStatus(delivery.status),
      items: delivery.items.map((item) => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
      })),
      reservesStock: delivery.reservesStock,
      stockWrittenOff: delivery.stockWrittenOff,
      vehicleId: delivery.vehicleId ?? undefined,
      vehicleName: delivery.vehicleName ?? undefined,
      routeId: delivery.routeId ?? undefined,
      routeNumber: delivery.routeNumber ?? undefined,
      stopIndex: delivery.stopIndex ?? undefined,
      lat: delivery.lat ?? undefined,
      lng: delivery.lng ?? undefined,
      orderId: delivery.orderId ?? undefined,
      orderNumber: delivery.orderNumber ?? undefined,
      shippedAt: delivery.shippedAt ? toIso(delivery.shippedAt) : undefined,
      arrivedAt: delivery.arrivedAt ? toIso(delivery.arrivedAt) : undefined,
      completedAt: delivery.completedAt
        ? toIso(delivery.completedAt)
        : undefined,
      failureReason: delivery.failureReason
        ? toApiFailureReason(delivery.failureReason)
        : undefined,
      proof: delivery.proof
        ? {
            photoUrl: delivery.proof.photoUrl ?? undefined,
            signatureUrl: delivery.proof.signatureUrl ?? undefined,
            lat: delivery.proof.lat ?? undefined,
            lng: delivery.proof.lng ?? undefined,
            capturedAt: delivery.proof.capturedAt
              ? toIso(delivery.proof.capturedAt)
              : undefined,
          }
        : undefined,
      companyId: delivery.companyId,
      companyName: delivery.company.name,
      createdAt: toIso(delivery.createdAt),
    };
  }
}
