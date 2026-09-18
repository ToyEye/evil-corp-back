import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestockService } from './restock.service';

@ApiTags('restock')
@ApiBearerAuth()
@Controller('restock')
export class RestockController {
  constructor(private readonly restockService: RestockService) {}

  @Get()
  list() {
    return { items: [], resource: 'restock' };
  }
}
