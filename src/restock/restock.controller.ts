import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppPageId, UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePage } from '../common/decorators/require-page.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateRestockDto } from './dto/restock.dto';
import { RestockService } from './restock.service';

@ApiTags('restock')
@ApiBearerAuth()
@RequirePage(AppPageId.warehouse)
@Controller('restock')
export class RestockController {
  constructor(private readonly restockService: RestockService) {}

  @Get()
  @ApiOperation({ summary: 'List restock requests' })
  list(@CurrentUser() user: JwtPayload) {
    return this.restockService.list(user);
  }

  @Post()
  @Roles(UserRole.Storekeeper, UserRole.Supply, UserRole.SEO, UserRole.Staff)
  @ApiOperation({ summary: 'Create restock request' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRestockDto) {
    return this.restockService.create(user, dto);
  }

  @Post(':id/advance')
  @Roles(UserRole.Supply, UserRole.Storekeeper, UserRole.SEO, UserRole.Admin)
  @ApiOperation({ summary: 'Advance restock status one step' })
  advance(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.restockService.advance(user, id);
  }
}
