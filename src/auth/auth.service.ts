import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Company, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUserView, JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { UpdateMeDto } from './dto/update-me.dto';

type UserWithCompany = User & { company: Company };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ user: AuthUserView; token: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = await this.signToken(user);
    return { user: this.toAuthUser(user), token };
  }

  async getMe(userId: string): Promise<AuthUserView> {
    const user = await this.findUserOrThrow(userId);
    return this.toAuthUser(user);
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<AuthUserView> {
    const data: {
      name?: string;
      email?: string;
      avatarUrl?: string | null;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Email is already in use');
      }
      data.email = email;
    }

    if (dto.avatarUrl !== undefined) {
      data.avatarUrl = dto.avatarUrl;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: { company: true },
    });

    return this.toAuthUser(user);
  }

  async signToken(user: UserWithCompany): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      companyType: user.company.type,
    };

    return this.jwtService.signAsync(payload);
  }

  toAuthUser(user: UserWithCompany): AuthUserView {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company.name,
      avatarUrl: user.avatarUrl,
    };
  }

  private async findUserOrThrow(userId: string): Promise<UserWithCompany> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
