import {
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { AppPageId, UserRole } from '@prisma/client';
import type { Response } from 'express';
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

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiProduces('application/pdf')
  @ApiOperation({ summary: 'Download invoice PDF' })
  async downloadPdf(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pdf = await this.invoicesService.getPdf(user, id);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${pdf.filename}"`,
    );
    return new StreamableFile(pdf.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${pdf.filename}"`,
    });
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
