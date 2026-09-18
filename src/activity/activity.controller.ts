import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityService } from './activity.service';

@ApiTags('activity')
@ApiBearerAuth()
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ApiOperation({ summary: 'List activity events' })
  @ApiQuery({ name: 'companyId', required: false })
  list(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
  ) {
    return this.activityService.list(user, companyId);
  }
}
