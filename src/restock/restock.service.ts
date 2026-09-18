import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  RestockPurpose,
  RestockStatus,
  UserRole,
  type Company,
  type RestockRequest,
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
  canReceiveRestock,
  canSupplyAdvanceRestock,
  getNextRestockStatus,
} from '../common/utils/restock';
import { OpsService } from '../ops/ops.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestockDto } from './dto/restock.dto';

type RestockWithCompany = RestockRequest & { company: Company };

export type RestockView = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  note: string;
  status: RestockStatus;
  purposes: RestockPurpose[];
  orderId?: string;
  orderNumber?: string;
  requestedById: string;
  requestedByName: string;
  companyId: string;
  companyName: string;
  createdAt: string;
};

@Injectable()
export class RestockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ops: OpsService,
    @Inject(forwardRef(() => OrdersService))
    private readonly orders: OrdersService,
  ) {}

  async list(user: JwtPayload): Promise<RestockView[]> {
    const items = await this.prisma.restockRequest.findMany({
      where: companyScopeWhere(user),
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => this.toView(item));
  }

  async create(user: JwtPayload, dto: CreateRestockDto): Promise<RestockView> {
    const product = assertFound(
      await this.prisma.inventoryItem.findUnique({
        where: { id: dto.productId },
      }),
      'Product not found',
    );
    assertCompanyAccess(user, product.companyId);

    const purposes = dto.purposes.map((purpose) =>
      purpose === 'order' ? RestockPurpose.order : RestockPurpose.warehouse,
    );

    let orderId = dto.orderId;
    let orderNumber: string | undefined;

    if (orderId) {
      const order = assertFound(
        await this.prisma.order.findUnique({ where: { id: orderId } }),
        'Order not found',
      );
      assert(order.companyId === product.companyId, 'Order company mismatch');
      orderNumber = order.number;
    } else if (purposes.includes(RestockPurpose.order) && dto.note) {
      const haystack = dto.note.toUpperCase();
      const orders = await this.prisma.order.findMany({
        where: { companyId: product.companyId },
      });
      const matched = orders.find((order) =>
        haystack.includes(order.number.toUpperCase()),
      );
      if (matched) {
        orderId = matched.id;
        orderNumber = matched.number;
      }
    }

    const actor = assertFound(
      await this.prisma.user.findUnique({ where: { id: user.sub } }),
      'User not found',
    );

    const created = await this.prisma.restockRequest.create({
      data: {
        id: newId(),
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        quantity: dto.quantity,
        note: dto.note?.trim() ?? '',
        status: RestockStatus.New,
        purposes,
        orderId,
        orderNumber,
        requestedById: actor.id,
        requestedByName: actor.name,
        companyId: product.companyId,
        createdAt: new Date(),
      },
      include: { company: true },
    });

    await this.ops.logEvent({
      companyId: product.companyId,
      entityType: 'restock',
      entityId: created.id,
      entityNumber: created.sku,
      message: 'Restock requested',
      actorId: actor.id,
      actorName: actor.name,
    });

    return this.toView(created);
  }

  async advance(user: JwtPayload, id: string): Promise<RestockView> {
    const request = assertFound(
      await this.prisma.restockRequest.findUnique({
        where: { id },
        include: { company: true },
      }),
      'Restock request not found',
    );
    assertCompanyAccess(user, request.companyId);

    const nextStatus = getNextRestockStatus(request.status);
    assert(nextStatus, 'Restock request is already complete');

    this.assertCanAdvance(user.role, request.status);

    const actor = assertFound(
      await this.prisma.user.findUnique({ where: { id: user.sub } }),
      'User not found',
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.restockRequest.update({
        where: { id },
        data: { status: nextStatus },
        include: { company: true },
      });

      if (nextStatus === RestockStatus.Delivered) {
        await this.ops.logEvent({
          tx,
          companyId: request.companyId,
          entityType: 'restock',
          entityId: request.id,
          entityNumber: request.sku,
          message: 'Supplier delivery arrived at the dock',
          actorId: actor.id,
          actorName: actor.name,
          notify: [
            {
              role: UserRole.Storekeeper,
              title: 'Goods waiting at the dock',
              body: `${request.productName} is ready to receive`,
            },
          ],
        });
        return result;
      }

      if (nextStatus !== RestockStatus.Received) {
        await this.ops.logEvent({
          tx,
          companyId: request.companyId,
          entityType: 'restock',
          entityId: request.id,
          entityNumber: request.sku,
          message: `Restock marked as ${nextStatus}`,
          actorId: actor.id,
          actorName: actor.name,
        });
        return result;
      }

      await tx.inventoryItem.update({
        where: { id: request.productId },
        data: { quantity: { increment: request.quantity } },
      });

      if (request.purposes.includes(RestockPurpose.order) && request.orderId) {
        const order = await tx.order.findUnique({
          where: { id: request.orderId },
          include: { items: true, company: true },
        });
        const line = order?.items.find(
          (item) => item.productId === request.productId,
        );
        const remaining = line
          ? Math.max(0, line.quantity - line.reservedQuantity)
          : 0;
        const toReserve = Math.min(request.quantity, remaining);

        if (toReserve > 0 && order) {
          await this.orders.reserveItems(
            user,
            order.id,
            { productId: request.productId, quantity: toReserve },
            tx,
          );
          await tx.inventoryItem.update({
            where: { id: request.productId },
            data: { quantity: { decrement: toReserve } },
          });
        }
      }

      await this.ops.logEvent({
        tx,
        companyId: request.companyId,
        entityType: 'restock',
        entityId: request.id,
        entityNumber: request.sku,
        message: 'Received into warehouse',
        actorId: actor.id,
        actorName: actor.name,
        notify: request.orderNumber
          ? [
              {
                role: UserRole.Staff,
                title: 'Stock received for an order',
                body: `${request.productName} can now cover ${request.orderNumber}`,
              },
            ]
          : undefined,
      });

      return result;
    });

    return this.toView(updated);
  }

  private assertCanAdvance(role: UserRole, status: RestockStatus): void {
    if (role === UserRole.SEO || role === UserRole.Admin) {
      return;
    }

    if (canSupplyAdvanceRestock(status)) {
      if (role !== UserRole.Supply) {
        throw new ForbiddenException('Only Supply can advance this restock');
      }
      return;
    }

    if (canReceiveRestock(status)) {
      if (role !== UserRole.Storekeeper) {
        throw new ForbiddenException(
          'Only Storekeeper can receive this restock',
        );
      }
      return;
    }

    throw new ForbiddenException('Cannot advance restock');
  }

  toView(item: RestockWithCompany): RestockView {
    return {
      id: item.id,
      productId: item.productId,
      sku: item.sku,
      productName: item.productName,
      quantity: item.quantity,
      note: item.note,
      status: item.status,
      purposes: item.purposes,
      orderId: item.orderId ?? undefined,
      orderNumber: item.orderNumber ?? undefined,
      requestedById: item.requestedById,
      requestedByName: item.requestedByName,
      companyId: item.companyId,
      companyName: item.company.name,
      createdAt: toIso(item.createdAt),
    };
  }
}
