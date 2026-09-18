import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppPageId } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePage } from '../common/decorators/require-page.decorator';
import { ClientsService } from './clients.service';
import { CreateClientAddressDto } from './dto/create-client-address.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('clients')
@ApiBearerAuth()
@RequirePage(AppPageId.clients)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'List clients for the company' })
  list(@CurrentUser() user: JwtPayload) {
    return this.clientsService.list(user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a client' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateClientDto) {
    return this.clientsService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update client contact fields' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(user, id, dto);
  }

  @Post(':id/addresses')
  @ApiOperation({ summary: 'Add an address to a client' })
  addAddress(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateClientAddressDto,
  ) {
    return this.clientsService.addAddress(user, id, dto);
  }
}
