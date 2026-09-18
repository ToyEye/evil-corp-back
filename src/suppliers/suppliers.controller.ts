import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppPageId } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePage } from '../common/decorators/require-page.decorator';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@ApiBearerAuth()
@RequirePage(AppPageId.suppliers)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'List suppliers' })
  list(@CurrentUser() user: JwtPayload) {
    return this.suppliersService.list(user);
  }

  @Post()
  @ApiOperation({ summary: 'Create supplier' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update supplier' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(user, id, dto);
  }
}
