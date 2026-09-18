import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JoinRequestsService } from './join-requests.service';

@ApiTags('join-requests')
@ApiBearerAuth()
@Controller('join-requests')
export class JoinRequestsController {
  constructor(private readonly joinRequestsService: JoinRequestsService) {}

  @Get()
  list() {
    return { items: [], resource: 'join-requests' };
  }
}
