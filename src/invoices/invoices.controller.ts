import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppPageId, UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePage } from '../common/decorators/require-page.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@RequirePage(AppPageId.invoices)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices' })
  list(@CurrentUser() user: JwtPayload) {
    return this.invoicesService.list(user);
  }

  @Post('from-order/:orderId')
  @Roles(UserRole.Accountant, UserRole.SEO)
  @ApiOperation({ summary: 'Issue invoice from a paid/paid-eligible order' })
  issueFromOrder(
    @CurrentUser() user: JwtPayload,
    @Param('orderId') orderId: string,
  ) {
    return this.invoicesService.issueFromOrderId(user, orderId);
  }
}
