import { ConflictException, Injectable } from '@nestjs/common';
import {
  CompanyType,
  JoinRequestStatus,
  UserRole,
  type JoinRequest,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { assert, assertFound, newId, toIso } from '../common/utils/access';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveJoinRequestDto } from './dto/approve-join-request.dto';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';

export type JoinRequestView = {
  id: string;
  contactName: string;
  email: string;
  message: string;
  companyName?: string;
  depotLat?: number;
  depotLng?: number;
  hasPassword: boolean;
  status: JoinRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type ApproveJoinRequestResult = {
  joinRequest: JoinRequestView;
  company: {
    id: string;
    name: string;
    type: CompanyType;
    depotLat?: number;
    depotLng?: number;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    companyId: string;
    companyName: string;
  };
};

@Injectable()
export class JoinRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateJoinRequestDto): Promise<JoinRequestView> {
    const email = dto.email.trim().toLowerCase();
    const contactName = dto.contactName.trim();
    const message = dto.message.trim();
    const companyName = dto.companyName?.trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }

    const pending = await this.prisma.joinRequest.findFirst({
      where: { email, status: JoinRequestStatus.pending },
    });
    if (pending) {
      throw new ConflictException(
        'A pending join request already exists for this email',
      );
    }

    if (companyName) {
      const existingCompany = await this.prisma.company.findUnique({
        where: { name: companyName },
      });
      if (existingCompany) {
        throw new ConflictException('Company name is already in use');
      }
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : null;

    const created = await this.prisma.joinRequest.create({
      data: {
        contactName,
        email,
        message,
        companyName: companyName ?? null,
        depotLat: dto.depotLat ?? null,
        depotLng: dto.depotLng ?? null,
        passwordHash,
        status: JoinRequestStatus.pending,
      },
    });

    await this.notifyPlatformAdmins(created);

    return this.toView(created);
  }

  async list(): Promise<JoinRequestView[]> {
    const items = await this.prisma.joinRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => this.toView(item));
  }

  async approve(
    id: string,
    dto: ApproveJoinRequestDto = {},
  ): Promise<ApproveJoinRequestResult> {
    const request = assertFound(
      await this.prisma.joinRequest.findUnique({ where: { id } }),
      'Join request not found',
    );

    assert(
      request.status === JoinRequestStatus.pending,
      `Join request is already ${request.status}`,
    );

    const companyName = (dto.companyName?.trim() || request.companyName || '')
      .trim();
    assert(Boolean(companyName), 'companyName is required to approve');

    const depotLat = dto.depotLat ?? request.depotLat ?? null;
    const depotLng = dto.depotLng ?? request.depotLng ?? null;

    let passwordHash = request.passwordHash;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    }
    assert(
      Boolean(passwordHash),
      'password is required to approve (provide on request or in approve body)',
    );

    const existingUser = await this.prisma.user.findUnique({
      where: { email: request.email },
    });
    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }

    const existingCompany = await this.prisma.company.findUnique({
      where: { name: companyName },
    });
    if (existingCompany) {
      throw new ConflictException('Company name is already in use');
    }

    const companyId = newId();
    const userId = newId();

    const result = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          id: companyId,
          name: companyName,
          type: CompanyType.client,
          depotLat,
          depotLng,
        },
      });

      const user = await tx.user.create({
        data: {
          id: userId,
          name: request.contactName,
          email: request.email,
          passwordHash: passwordHash!,
          role: UserRole.SEO,
          companyId: company.id,
        },
      });

      const joinRequest = await tx.joinRequest.update({
        where: { id: request.id },
        data: {
          status: JoinRequestStatus.approved,
          companyName,
          depotLat,
          depotLng,
          // Clear stored hash after account creation.
          passwordHash: null,
        },
      });

      return { company, user, joinRequest };
    });

    return {
      joinRequest: this.toView(result.joinRequest),
      company: {
        id: result.company.id,
        name: result.company.name,
        type: result.company.type,
        ...(result.company.depotLat != null
          ? { depotLat: result.company.depotLat }
          : {}),
        ...(result.company.depotLng != null
          ? { depotLng: result.company.depotLng }
          : {}),
      },
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        companyId: result.company.id,
        companyName: result.company.name,
      },
    };
  }

  async reject(id: string): Promise<JoinRequestView> {
    const request = assertFound(
      await this.prisma.joinRequest.findUnique({ where: { id } }),
      'Join request not found',
    );

    assert(
      request.status === JoinRequestStatus.pending,
      `Join request is already ${request.status}`,
    );

    const updated = await this.prisma.joinRequest.update({
      where: { id },
      data: {
        status: JoinRequestStatus.rejected,
        passwordHash: null,
      },
    });

    return this.toView(updated);
  }

  private async notifyPlatformAdmins(request: JoinRequest): Promise<void> {
    const platform = await this.prisma.company.findFirst({
      where: { type: CompanyType.platform },
    });

    if (!platform) {
      return;
    }

    await this.prisma.appNotification.create({
      data: {
        id: newId(),
        companyId: platform.id,
        recipientRole: UserRole.Admin,
        title: 'New join request',
        body: `${request.contactName} (${request.email}) requested access${
          request.companyName ? ` for ${request.companyName}` : ''
        }.`,
        href: '/dashboard',
        read: false,
        createdAt: new Date(),
      },
    });
  }

  toView(item: JoinRequest): JoinRequestView {
    return {
      id: item.id,
      contactName: item.contactName,
      email: item.email,
      message: item.message,
      ...(item.companyName != null ? { companyName: item.companyName } : {}),
      ...(item.depotLat != null ? { depotLat: item.depotLat } : {}),
      ...(item.depotLng != null ? { depotLng: item.depotLng } : {}),
      hasPassword: Boolean(item.passwordHash),
      status: item.status,
      createdAt: toIso(item.createdAt),
      updatedAt: toIso(item.updatedAt),
    };
  }
}
