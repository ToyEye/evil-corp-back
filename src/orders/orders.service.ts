import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  FulfillmentStatus,
  OrderStatus,
  RestockPurpose,
  RestockStatus,
  UserRole,
  type Company,
  type Order,
  type OrderItem,
  type Prisma,
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
import { nextOrderNumber } from '../common/utils/numbering';
import {
  isOrderFullyPicked,
  nextFulfillmentFromStock,
} from '../common/utils/orders';
import { InvoicesService } from '../invoices/invoices.service';
import { OpsService } from '../ops/ops.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateOrderDto,
  ReserveOrderItemsDto,
  SetPickedQuantityDto,
} from './dto/order.dto';

type OrderWithRelations = Order & {
  company: Company;
  items: OrderItem[];
};

export type OrderItemView = {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  reservedQuantity: number;
  pickedQuantity: number;
};

export type OrderView = {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  addressId?: string;
  destination?: string;
  notes: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  items: OrderItemView[];
  companyId: string;
  companyName: string;
  createdAt: string;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ops: OpsService,
    @Inject(forwardRef(() => InvoicesService))
    private readonly invoices: InvoicesService,
  ) {}

  async list(user: JwtPayload): Promise<OrderView[]> {
    const orders = await this.prisma.order.findMany({
      where: companyScopeWhere(user),
      include: { company: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => this.toView(order));
  }

  async getById(user: JwtPayload, id: string): Promise<OrderView> {
    const order = assertFound(
      await this.prisma.order.findUnique({
        where: { id },
        include: { company: true, items: true },
      }),
      'Order not found',
    );
    assertCompanyAccess(user, order.companyId);
    return this.toView(order);
  }

  async create(user: JwtPayload, dto: CreateOrderDto): Promise<OrderView> {
    const client = assertFound(
      await this.prisma.client.findUnique({
        where: { id: dto.clientId },
        include: { company: true, addresses: true },
      }),
      'Client not found',
    );
    assertCompanyAccess(user, client.companyId);

    const address = dto.addressId
      ? client.addresses.find((item) => item.id === dto.addressId)
      : undefined;
    assert(!dto.addressId || address, 'Address not found for client');

    const productIds = [...new Set(dto.items.map((line) => line.productId))];
    const products = await this.prisma.inventoryItem.findMany({
      where: { id: { in: productIds }, companyId: client.companyId },
    });
    const productById = new Map(products.map((item) => [item.id, item]));

    const totals = new Map<string, number>();
    for (const line of dto.items) {
      totals.set(
        line.productId,
        (totals.get(line.productId) ?? 0) + line.quantity,
      );
    }

    type LineDraft = OrderItemView & { shortageQty: number };
    const lines: LineDraft[] = [];

    for (const [productId, requested] of totals) {
      const product = productById.get(productId);
      assert(product, `Product not found: ${productId}`);
      const available = Math.max(0, product.quantity);
      const reservedQuantity = Math.min(requested, available);
      lines.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: requested,
        unitPrice: product.price,
        reservedQuantity,
        pickedQuantity: 0,
        shortageQty: requested - reservedQuantity,
      });
    }

    assert(lines.length > 0, 'Order must contain at least one valid line');

    const existingNumbers = (
      await this.prisma.order.findMany({
        where: { companyId: client.companyId },
        select: { number: true },
      })
    ).map((item) => item.number);

    const number = nextOrderNumber(existingNumbers);
    const createdAt = new Date();
    const orderId = newId();
    const fulfillmentStatus = nextFulfillmentFromStock(
      FulfillmentStatus.Waiting,
      lines,
    );
    const actor = assertFound(
      await this.prisma.user.findUnique({ where: { id: user.sub } }),
      'User not found',
    );

    const order = await this.prisma.$transaction(async (tx) => {
      for (const line of lines) {
        if (line.reservedQuantity <= 0) {
          continue;
        }
        await tx.inventoryItem.update({
          where: { id: line.productId },
          data: { quantity: { decrement: line.reservedQuantity } },
        });
      }

      const created = await tx.order.create({
        data: {
          id: orderId,
          number,
          clientId: client.id,
          clientName: client.name,
          addressId: address?.id,
          destination: dto.destination?.trim() || address?.line,
          notes: dto.notes?.trim() ?? '',
          status: OrderStatus.New,
          fulfillmentStatus,
          companyId: client.companyId,
          createdAt,
          items: {
            create: lines.map((line) => ({
              id: newId(),
              productId: line.productId,
              sku: line.sku,
              name: line.name,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              reservedQuantity: line.reservedQuantity,
              pickedQuantity: 0,
            })),
          },
        },
        include: { company: true, items: true },
      });

      const backorder = lines.filter((line) => line.shortageQty > 0);
      for (const line of backorder) {
        await tx.restockRequest.create({
          data: {
            id: newId(),
            productId: line.productId,
            sku: line.sku,
            productName: line.name,
            quantity: line.shortageQty,
            note: `Shortage for ${number}`,
            status: RestockStatus.New,
            purposes: [RestockPurpose.order],
            orderId: created.id,
            orderNumber: number,
            requestedById: actor.id,
            requestedByName: actor.name,
            companyId: client.companyId,
            createdAt,
          },
        });
      }

      await this.ops.logEvent({
        tx,
        companyId: client.companyId,
        entityType: 'order',
        entityId: created.id,
        entityNumber: number,
        message:
          backorder.length > 0
            ? `Order created with stock shortage (${backorder.length} SKU)`
            : 'Order created',
        actorId: actor.id,
        actorName: actor.name,
        notify:
          backorder.length > 0
            ? [
                {
                  role: UserRole.Supply,
                  title: 'Order needs restock',
                  body: `${number} is short on stock`,
                },
                {
                  role: UserRole.Storekeeper,
                  title: 'Order needs restock',
                  body: `${number} is short on stock`,
                },
              ]
            : undefined,
      });

      return created;
    });

    return this.toView(order);
  }

  async pay(user: JwtPayload, id: string): Promise<OrderView> {
    const order = assertFound(
      await this.prisma.order.findUnique({
        where: { id },
        include: { company: true, items: true },
      }),
      'Order not found',
    );
    assertCompanyAccess(user, order.companyId);
    assert(order.status === OrderStatus.New, 'Only New orders can be paid');

    const actor = assertFound(
      await this.prisma.user.findUnique({ where: { id: user.sub } }),
      'User not found',
    );

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.Paid },
      include: { company: true, items: true },
    });

    await this.invoices.issueForOrder(user, updated, actor);

    return this.toView(updated);
  }

  async reserveItems(
    user: JwtPayload,
    orderId: string,
    dto: ReserveOrderItemsDto,
    tx?: Prisma.TransactionClient,
  ): Promise<OrderView> {
    const db = tx ?? this.prisma;
    const order = assertFound(
      await db.order.findUnique({
        where: { id: orderId },
        include: { company: true, items: true },
      }),
      'Order not found',
    );
    assertCompanyAccess(user, order.companyId);

    const line = order.items.find((item) => item.productId === dto.productId);
    assert(line, 'Order line not found');

    const remaining = Math.max(0, line.quantity - line.reservedQuantity);
    const toReserve = Math.min(remaining, Math.max(0, dto.quantity));

    if (toReserve <= 0) {
      return this.toView(order);
    }

    await db.orderItem.update({
      where: { id: line.id },
      data: { reservedQuantity: { increment: toReserve } },
    });

    const items = order.items.map((item) =>
      item.id === line.id
        ? { ...item, reservedQuantity: item.reservedQuantity + toReserve }
        : item,
    );
    const fulfillmentStatus = nextFulfillmentFromStock(
      order.fulfillmentStatus,
      items,
    );

    const updated = await db.order.update({
      where: { id: orderId },
      data: { fulfillmentStatus },
      include: { company: true, items: true },
    });

    return this.toView(updated);
  }

  async startPicking(user: JwtPayload, id: string): Promise<OrderView> {
    const order = await this.getOrderOrThrow(user, id);
    assert(
      order.fulfillmentStatus === FulfillmentStatus.Reserved,
      'Order must be Reserved to start picking',
    );

    const updated = await this.prisma.order.update({
      where: { id },
      data: { fulfillmentStatus: FulfillmentStatus.Picking },
      include: { company: true, items: true },
    });
    return this.toView(updated);
  }

  async setPickedQuantity(
    user: JwtPayload,
    orderId: string,
    dto: SetPickedQuantityDto,
  ): Promise<OrderView> {
    const order = await this.getOrderOrThrow(user, orderId);
    assert(
      order.fulfillmentStatus === FulfillmentStatus.Picking,
      'Order must be Picking',
    );

    const line = order.items.find((item) => item.productId === dto.productId);
    assert(line, 'Order line not found');

    const pickedQuantity = Math.min(line.quantity, Math.max(0, dto.quantity));

    await this.prisma.orderItem.update({
      where: { id: line.id },
      data: { pickedQuantity },
    });

    const updated = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { company: true, items: true },
    });
    return this.toView(assertFound(updated));
  }

  async completePicking(user: JwtPayload, id: string): Promise<OrderView> {
    const order = await this.getOrderOrThrow(user, id);
    assert(
      order.fulfillmentStatus === FulfillmentStatus.Picking,
      'Order must be Picking',
    );
    assert(isOrderFullyPicked(order.items), 'All lines must be fully picked');

    const updated = await this.prisma.order.update({
      where: { id },
      data: { fulfillmentStatus: FulfillmentStatus.Ready },
      include: { company: true, items: true },
    });
    return this.toView(updated);
  }

  async releaseReservation(
    orderId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    assertFound(
      await db.order.findUnique({ where: { id: orderId } }),
      'Order not found',
    );

    await db.orderItem.updateMany({
      where: { orderId },
      data: { reservedQuantity: 0, pickedQuantity: 0 },
    });
    await db.order.update({
      where: { id: orderId },
      data: { fulfillmentStatus: FulfillmentStatus.Waiting },
    });
  }

  private async getOrderOrThrow(
    user: JwtPayload,
    id: string,
  ): Promise<OrderWithRelations> {
    const order = assertFound(
      await this.prisma.order.findUnique({
        where: { id },
        include: { company: true, items: true },
      }),
      'Order not found',
    );
    assertCompanyAccess(user, order.companyId);
    return order;
  }

  toView(order: OrderWithRelations): OrderView {
    return {
      id: order.id,
      number: order.number,
      clientId: order.clientId,
      clientName: order.clientName,
      addressId: order.addressId ?? undefined,
      destination: order.destination ?? undefined,
      notes: order.notes,
      status: order.status,
      fulfillmentStatus: order.fulfillmentStatus,
      items: order.items.map((item) => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        reservedQuantity: item.reservedQuantity,
        pickedQuantity: item.pickedQuantity,
      })),
      companyId: order.companyId,
      companyName: order.company.name,
      createdAt: toIso(order.createdAt),
    };
  }
}
