import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AppPageId, UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePage } from '../common/decorators/require-page.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { JwtPayload } from '../auth/auth.types';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'List companies (platform: all; client: own)' })
  @ApiOkResponse({ description: 'Company list' })
  list(@CurrentUser() user: JwtPayload) {
    return this.companiesService.list(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by id' })
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.companiesService.getById(user, id);
  }

  @Patch(':id')
  @RequirePage(AppPageId.settings)
  @Roles(UserRole.SEO, UserRole.Admin)
  @ApiOperation({ summary: 'Update company name and/or icon' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(user, id, dto);
  }
}
