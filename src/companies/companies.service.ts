import { ConflictException, Injectable } from '@nestjs/common';
import type { Company } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import {
  assertCompanyAccess,
  assertFound,
  companyScopeWhere,
} from '../common/utils/access';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

export type CompanyView = {
  id: string;
  name: string;
  type: Company['type'];
  iconUrl?: string;
  depotLat?: number;
  depotLng?: number;
};

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: JwtPayload): Promise<CompanyView[]> {
    const scope = companyScopeWhere(user);
    const companies = await this.prisma.company.findMany({
      where: scope.companyId ? { id: scope.companyId } : undefined,
      orderBy: { name: 'asc' },
    });

    return companies.map((company) => this.toView(company));
  }

  async getById(user: JwtPayload, id: string): Promise<CompanyView> {
    const company = assertFound(
      await this.prisma.company.findUnique({ where: { id } }),
      'Company not found',
    );
    assertCompanyAccess(user, company.id);
    return this.toView(company);
  }

  async update(
    user: JwtPayload,
    id: string,
    dto: UpdateCompanyDto,
  ): Promise<CompanyView> {
    const company = assertFound(
      await this.prisma.company.findUnique({ where: { id } }),
      'Company not found',
    );
    assertCompanyAccess(user, company.id);

    const data: Prisma.CompanyUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.iconUrl !== undefined) {
      data.iconUrl = dto.iconUrl;
    }

    try {
      const updated = await this.prisma.company.update({
        where: { id },
        data,
      });
      return this.toView(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Company name is already in use');
      }
      throw error;
    }
  }

  toView(company: Company): CompanyView {
    return {
      id: company.id,
      name: company.name,
      type: company.type,
      ...(company.iconUrl != null ? { iconUrl: company.iconUrl } : {}),
      ...(company.depotLat != null ? { depotLat: company.depotLat } : {}),
      ...(company.depotLng != null ? { depotLng: company.depotLng } : {}),
    };
  }
}
