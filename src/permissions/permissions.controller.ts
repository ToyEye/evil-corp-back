import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppPageId, UserRole } from '@prisma/client';
import { RequirePage } from '../common/decorators/require-page.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdatePageAccessDto } from './dto/update-page-access.dto';
import { PermissionsService } from './permissions.service';

@ApiTags('permissions')
@ApiBearerAuth()
@RequirePage(AppPageId.settings)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get page access matrix and page metadata' })
  getAccess() {
    return this.permissionsService.getAccess();
  }

  @Patch()
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Update roles allowed for a page' })
  updateAccess(@Body() dto: UpdatePageAccessDto) {
    return this.permissionsService.updateAccess(dto);
  }
}
