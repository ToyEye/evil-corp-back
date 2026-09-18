import { Injectable } from '@nestjs/common';
import {
  InvoiceStatus,
  UserRole,
  type Company,
  type Invoice,
  type Order,
  type OrderItem,
  type User,
} from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import {
  assertCompanyAccess,
  assertFound,
  companyScopeWhere,
  newId,
  toIso,
} from '../common/utils/access';
import { nextInvoiceNumber } from '../common/utils/numbering';
import { getOrderTotal } from '../common/utils/orders';
import { OpsService } from '../ops/ops.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildInvoicePdf, invoicePdfFilename } from './invoice-pdf';

type InvoiceWithCompany = Invoice & { company: Company };

type InvoicePdfSource = InvoiceWithCompany & {
  order: Order & { items: OrderItem[] };
  client: { addresses: { id: string; line: string }[] };
};

export type InvoicePdfFile = {
  buffer: Buffer;
  filename: string;
};

type OrderForInvoice = Order & {
  company: Company;
  items: OrderItem[];
};

export type InvoiceView = {
  id: string;
  number: string;
  orderId: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  status: InvoiceStatus;
  total: number;
  companyId: string;
  companyName: string;
  createdAt: string;
  paidAt: string;
};

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ops: OpsService,
  ) {}

  async list(user: JwtPayload): Promise<InvoiceView[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: companyScopeWhere(user),
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
    return invoices.map((invoice) => this.toView(invoice));
  }

  async issueFromOrderId(
    user: JwtPayload,
    orderId: string,
  ): Promise<InvoiceView> {
    const order = assertFound(
      await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { company: true, items: true },
      }),
      'Order not found',
    );
    assertCompanyAccess(user, order.companyId);

    const actor = assertFound(
      await this.prisma.user.findUnique({ where: { id: user.sub } }),
      'User not found',
    );

    return this.issueForOrder(user, order, actor);
  }

  async issueForOrder(
    _user: JwtPayload,
    order: OrderForInvoice,
    actor: Pick<User, 'id' | 'name'>,
  ): Promise<InvoiceView> {
    const existing = await this.prisma.invoice.findUnique({
      where: { orderId: order.id },
      include: { company: true },
    });

    if (existing) {
      return this.toView(existing);
    }

    const numbers = (
      await this.prisma.invoice.findMany({
        where: { companyId: order.companyId },
        select: { number: true },
      })
    ).map((item) => item.number);

    const createdAt = new Date();
    const invoice = await this.prisma.invoice.create({
      data: {
        id: newId(),
        number: nextInvoiceNumber(numbers),
        orderId: order.id,
        orderNumber: order.number,
        clientId: order.clientId,
        clientName: order.clientName,
        status: InvoiceStatus.Paid,
        total: getOrderTotal(order.items),
        companyId: order.companyId,
        createdAt,
        paidAt: createdAt,
      },
      include: { company: true },
    });

    await this.ops.logEvent({
      companyId: order.companyId,
      entityType: 'invoice',
      entityId: invoice.id,
      entityNumber: invoice.number,
      message: `Invoice issued from ${order.number}`,
      actorId: actor.id,
      actorName: actor.name,
      notify: [
        {
          role: UserRole.SEO,
          title: 'Invoice issued',
          body: `${invoice.number} for ${order.clientName}`,
        },
      ],
    });

    return this.toView(invoice);
  }

  async getPdf(user: JwtPayload, invoiceId: string): Promise<InvoicePdfFile> {
    const invoice = assertFound(
      await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          company: true,
          order: { include: { items: true } },
          client: { include: { addresses: true } },
        },
      }),
      'Invoice not found',
    );
    assertCompanyAccess(user, invoice.companyId);

    const buffer = await buildInvoicePdf({
      companyName: invoice.company.name,
      invoiceNumber: invoice.number,
      orderNumber: invoice.orderNumber,
      clientName: invoice.clientName,
      clientAddress: resolveInvoiceAddress(invoice),
      total: invoice.total,
      paidAt: invoice.paidAt,
      items: invoice.order.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });

    return {
      buffer,
      filename: invoicePdfFilename(invoice.number),
    };
  }

  toView(invoice: InvoiceWithCompany): InvoiceView {
    return {
      id: invoice.id,
      number: invoice.number,
      orderId: invoice.orderId,
      orderNumber: invoice.orderNumber,
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      status: invoice.status,
      total: invoice.total,
      companyId: invoice.companyId,
      companyName: invoice.company.name,
      createdAt: toIso(invoice.createdAt),
      paidAt: toIso(invoice.paidAt),
    };
  }
}

const resolveInvoiceAddress = (invoice: InvoicePdfSource): string => {
  const destination = invoice.order.destination?.trim();
  if (destination) {
    return destination;
  }

  const byId = invoice.client.addresses
    .find((address) => address.id === invoice.order.addressId)
    ?.line.trim();
  if (byId) {
    return byId;
  }

  const first = invoice.client.addresses.find((address) => address.line.trim());
  return first?.line.trim() || '—';
};
