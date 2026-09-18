import { Injectable } from '@nestjs/common';
import type { Client, ClientAddress, Company } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import {
  assertCompanyAccess,
  assertFound,
  companyScopeWhere,
  newId,
  toIsoDate,
} from '../common/utils/access';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientAddressDto } from './dto/create-client-address.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

type ClientWithRelations = Client & {
  company: Company;
  addresses: ClientAddress[];
};

export type ClientAddressView = {
  id: string;
  line: string;
  lat?: number;
  lng?: number;
};

export type ClientView = {
  id: string;
  name: string;
  phone: string;
  email: string;
  addedAt: string;
  note: string;
  addresses: ClientAddressView[];
  companyId: string;
  companyName: string;
};

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: JwtPayload): Promise<ClientView[]> {
    const clients = await this.prisma.client.findMany({
      where: companyScopeWhere(user),
      include: { company: true, addresses: true },
      orderBy: { name: 'asc' },
    });

    return clients.map((client) => this.toView(client));
  }

  async create(user: JwtPayload, dto: CreateClientDto): Promise<ClientView> {
    const companyId = user.companyId;
    const company = assertFound(
      await this.prisma.company.findUnique({ where: { id: companyId } }),
      'Company not found',
    );

    const addresses = dto.addresses ?? [];
    const created = await this.prisma.client.create({
      data: {
        id: newId(),
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        email: dto.email.trim().toLowerCase(),
        note: dto.note?.trim() ?? '',
        addedAt: new Date(),
        companyId: company.id,
        addresses: {
          create: addresses.map((address) => ({
            id: newId(),
            line: address.line.trim(),
            lat: address.lat,
            lng: address.lng,
          })),
        },
      },
      include: { company: true, addresses: true },
    });

    return this.toView(created);
  }

  async update(
    user: JwtPayload,
    id: string,
    dto: UpdateClientDto,
  ): Promise<ClientView> {
    const existing = assertFound(
      await this.prisma.client.findUnique({
        where: { id },
        include: { company: true, addresses: true },
      }),
      'Client not found',
    );
    assertCompanyAccess(user, existing.companyId);

    const name = dto.name !== undefined ? dto.name.trim() : existing.name;
    const phone = dto.phone !== undefined ? dto.phone.trim() : existing.phone;
    const email =
      dto.email !== undefined
        ? dto.email.trim().toLowerCase()
        : existing.email;
    const note = dto.note !== undefined ? dto.note.trim() : existing.note;

    const updated = await this.prisma.$transaction(async (tx) => {
      const client = await tx.client.update({
        where: { id },
        data: { name, phone, email, note },
        include: { company: true, addresses: true },
      });

      await tx.order.updateMany({
        where: { clientId: id },
        data: { clientName: name },
      });
      await tx.delivery.updateMany({
        where: { clientId: id },
        data: { clientName: name },
      });

      for (const address of client.addresses) {
        await tx.order.updateMany({
          where: { clientId: id, addressId: address.id },
          data: { destination: address.line },
        });
        await tx.delivery.updateMany({
          where: { clientId: id, addressId: address.id },
          data: {
            destination: address.line,
            lat: address.lat,
            lng: address.lng,
          },
        });
      }

      return client;
    });

    return this.toView(updated);
  }

  async addAddress(
    user: JwtPayload,
    clientId: string,
    dto: CreateClientAddressDto,
  ): Promise<ClientView> {
    const client = assertFound(
      await this.prisma.client.findUnique({ where: { id: clientId } }),
      'Client not found',
    );
    assertCompanyAccess(user, client.companyId);

    await this.prisma.clientAddress.create({
      data: {
        id: newId(),
        clientId,
        line: dto.line.trim(),
        lat: dto.lat,
        lng: dto.lng,
      },
    });

    const refreshed = assertFound(
      await this.prisma.client.findUnique({
        where: { id: clientId },
        include: { company: true, addresses: true },
      }),
      'Client not found',
    );

    return this.toView(refreshed);
  }

  toView(client: ClientWithRelations): ClientView {
    return {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      addedAt: toIsoDate(client.addedAt),
      note: client.note,
      addresses: client.addresses.map((address) => ({
        id: address.id,
        line: address.line,
        ...(address.lat != null ? { lat: address.lat } : {}),
        ...(address.lng != null ? { lng: address.lng } : {}),
      })),
      companyId: client.companyId,
      companyName: client.company.name,
    };
  }
}
