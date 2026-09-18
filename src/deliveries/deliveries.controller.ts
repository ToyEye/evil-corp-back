import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppPageId, UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePage } from '../common/decorators/require-page.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AssignDeliveryDto,
  CreateDeliveryDto,
  ProgressDeliveryDto,
} from './dto/delivery.dto';
import { DeliveriesService } from './deliveries.service';

@ApiTags('deliveries')
@ApiBearerAuth()
@RequirePage(AppPageId.deliveries)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  @ApiOperation({ summary: 'List deliveries' })
  list(@CurrentUser() user: JwtPayload) {
    return this.deliveriesService.list(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery by id' })
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.deliveriesService.getById(user, id);
  }

  @Post()
  @Roles(UserRole.Staff, UserRole.SEO)
  @ApiOperation({ summary: 'Create delivery (from order or standalone)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDeliveryDto) {
    return this.deliveriesService.create(user, dto);
  }

  @Patch(':id/assign')
  @Roles(UserRole.Staff, UserRole.SEO)
  @ApiOperation({ summary: 'Assign driver/vehicle/schedule' })
  assign(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AssignDeliveryDto,
  ) {
    return this.deliveriesService.assign(user, id, dto);
  }

  @Post(':id/progress')
  @Roles(UserRole.Staff, UserRole.SEO, UserRole.Driver)
  @ApiOperation({
    summary: 'Progress delivery status (write-off / return stock)',
  })
  progress(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ProgressDeliveryDto,
  ) {
    return this.deliveriesService.progress(user, id, dto);
  }
}
