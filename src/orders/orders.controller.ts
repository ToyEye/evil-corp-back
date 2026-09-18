import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppPageId, UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePage } from '../common/decorators/require-page.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateOrderDto,
  ReserveOrderItemsDto,
  SetPickedQuantityDto,
} from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@RequirePage(AppPageId.orders)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders' })
  list(@CurrentUser() user: JwtPayload) {
    return this.ordersService.list(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by id' })
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ordersService.getById(user, id);
  }

  @Post()
  @Roles(UserRole.Staff, UserRole.Accountant, UserRole.SEO)
  @ApiOperation({ summary: 'Create order (reserve stock, create restocks)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user, dto);
  }

  @Post(':id/pay')
  @Roles(UserRole.Accountant)
  @ApiOperation({ summary: 'Mark order paid and issue invoice' })
  pay(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ordersService.pay(user, id);
  }

  @Post(':id/reserve')
  @ApiOperation({ summary: 'Reserve additional quantity on a line' })
  reserve(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReserveOrderItemsDto,
  ) {
    return this.ordersService.reserveItems(user, id, dto);
  }

  @Post(':id/start-picking')
  @Roles(UserRole.Storekeeper, UserRole.SEO)
  @ApiOperation({ summary: 'Start picking (Reserved → Picking)' })
  startPicking(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ordersService.startPicking(user, id);
  }

  @Post(':id/pick')
  @Roles(UserRole.Storekeeper, UserRole.SEO)
  @ApiOperation({ summary: 'Set picked quantity on a line' })
  pick(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetPickedQuantityDto,
  ) {
    return this.ordersService.setPickedQuantity(user, id, dto);
  }

  @Post(':id/complete-picking')
  @Roles(UserRole.Storekeeper, UserRole.SEO)
  @ApiOperation({ summary: 'Complete picking (Picking → Ready)' })
  completePicking(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ordersService.completePicking(user, id);
  }
}
