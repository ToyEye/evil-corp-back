import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CompanyType, UserRole, type Company, type User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { JwtPayload } from '../auth/auth.types';
import {
  assert,
  assertCompanyAccess,
  assertFound,
  companyScopeWhere,
  newId,
} from '../common/utils/access';
import {
  canAssignCompanyRoles,
  getAssignableMemberRoles,
} from '../common/utils/roles';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type UserWithCompany = User & { company: Company };

export type UserView = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName: string;
  companyId: string;
  avatarUrl?: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: JwtPayload): Promise<UserView[]> {
    const scope = companyScopeWhere(user);
    const users = await this.prisma.user.findMany({
      where: scope,
      include: { company: true },
      orderBy: { name: 'asc' },
    });

    return users.map((item) => this.toView(item));
  }

  async create(actor: JwtPayload, dto: CreateUserDto): Promise<UserView> {
    assert(
      canAssignCompanyRoles(actor.role),
      'You cannot assign company roles',
    );

    const targetCompanyId =
      actor.companyType === CompanyType.client
        ? actor.companyId
        : (dto.companyId ?? '');

    assert(Boolean(targetCompanyId), 'companyId is required');

    if (actor.companyType === CompanyType.client) {
      assert(
        !dto.companyId || dto.companyId === actor.companyId,
        'Client actors can only invite to their own company',
      );
    }

    assertCompanyAccess(actor, targetCompanyId);

    const company = assertFound(
      await this.prisma.company.findUnique({ where: { id: targetCompanyId } }),
      'Company not found',
    );

    const assignable = getAssignableMemberRoles(company.type);
    assert(
      assignable.includes(dto.role),
      `Role ${dto.role} is not assignable for this company`,
    );

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.prisma.user.create({
      data: {
        id: newId(),
        name: dto.name.trim(),
        email,
        passwordHash,
        role: dto.role,
        companyId: company.id,
      },
      include: { company: true },
    });

    return this.toView(created);
  }

  async updateRole(
    actor: JwtPayload,
    id: string,
    dto: UpdateUserDto,
  ): Promise<UserView> {
    assert(
      canAssignCompanyRoles(actor.role),
      'You cannot assign company roles',
    );

    const target = assertFound(
      await this.prisma.user.findUnique({
        where: { id },
        include: { company: true },
      }),
      'User not found',
    );

    assertCompanyAccess(actor, target.companyId);

    if (target.role === UserRole.Admin) {
      throw new ForbiddenException('Cannot change Admin role');
    }

    const assignable = getAssignableMemberRoles(target.company.type);
    assert(
      assignable.includes(dto.role),
      `Role ${dto.role} is not assignable for this company`,
    );

    if (dto.role === UserRole.Admin) {
      throw new ForbiddenException('Cannot assign Admin role');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      include: { company: true },
    });

    return this.toView(updated);
  }

  toView(user: UserWithCompany): UserView {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyName: user.company.name,
      companyId: user.companyId,
      ...(user.avatarUrl != null ? { avatarUrl: user.avatarUrl } : {}),
    };
  }
}
