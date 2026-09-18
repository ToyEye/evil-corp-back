import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppPageId, UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePage } from '../common/decorators/require-page.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AssignRouteStopsDto, CreateRouteDto } from './dto/route.dto';
import { RoutesService } from './routes.service';

@ApiTags('routes')
@ApiBearerAuth()
@RequirePage(AppPageId.deliveries)
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  @ApiOperation({ summary: 'List dispatch routes' })
  list(@CurrentUser() user: JwtPayload) {
    return this.routesService.list(user);
  }

  @Post()
  @Roles(UserRole.Staff, UserRole.SEO)
  @ApiOperation({ summary: 'Create a dispatch route' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRouteDto) {
    return this.routesService.create(user, dto);
  }

  @Post(':id/assign-stops')
  @Roles(UserRole.Staff, UserRole.SEO)
  @ApiOperation({ summary: 'Assign delivery stops to a route' })
  assignStops(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AssignRouteStopsDto,
  ) {
    return this.routesService.assignStops(user, id, dto);
  }
}
