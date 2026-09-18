import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ApproveJoinRequestDto } from './dto/approve-join-request.dto';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { JoinRequestsService } from './join-requests.service';

@ApiTags('join-requests')
@Controller('join-requests')
export class JoinRequestsController {
  constructor(private readonly joinRequestsService: JoinRequestsService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Submit a public join / access request (replaces sign-up)',
  })
  @ApiCreatedResponse({ description: 'Pending join request created' })
  create(@Body() dto: CreateJoinRequestDto) {
    return this.joinRequestsService.create(dto);
  }

  @ApiBearerAuth()
  @Get()
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'List all join requests (platform Admin)' })
  @ApiOkResponse({ description: 'Join requests without passwordHash' })
  list() {
    return this.joinRequestsService.list();
  }

  @ApiBearerAuth()
  @Post(':id/approve')
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary:
      'Approve join request: create client company + SEO user (platform Admin)',
  })
  @ApiOkResponse({
    description: 'Approved request with created company and SEO user',
  })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveJoinRequestDto = {},
  ) {
    return this.joinRequestsService.approve(id, dto);
  }

  @ApiBearerAuth()
  @Post(':id/reject')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Reject a pending join request (platform Admin)' })
  @ApiOkResponse({ description: 'Rejected join request' })
  reject(@Param('id') id: string) {
    return this.joinRequestsService.reject(id);
  }
}
