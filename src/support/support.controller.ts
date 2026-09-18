import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppPageId } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePage } from '../common/decorators/require-page.decorator';
import { CreateSupportMessageDto, MarkSupportReadDto } from './dto/support.dto';
import { SupportService } from './support.service';

@ApiTags('support')
@ApiBearerAuth()
@RequirePage(AppPageId.support)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('threads')
  @ApiOperation({ summary: 'List support threads' })
  listThreads(@CurrentUser() user: JwtPayload) {
    return this.supportService.listThreads(user);
  }

  @Post('threads/ensure')
  @ApiOperation({ summary: 'Ensure a support thread for the current user' })
  ensureThread(@CurrentUser() user: JwtPayload) {
    return this.supportService.ensureThread(user);
  }

  @Get('threads/:id/messages')
  @ApiOperation({ summary: 'List messages in a thread' })
  listMessages(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.supportService.listMessages(user, id);
  }

  @Post('threads/:id/messages')
  @ApiOperation({ summary: 'Post a message to a thread' })
  addMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateSupportMessageDto,
  ) {
    return this.supportService.addMessage(user, id, dto);
  }

  @Post('threads/messages')
  @ApiOperation({
    summary: 'Post a message (auto-ensures thread for client users)',
  })
  addMessageAuto(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSupportMessageDto,
  ) {
    return this.supportService.addMessage(user, null, dto);
  }

  @Post('threads/:id/read')
  @ApiOperation({ summary: 'Mark thread as read' })
  markRead(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: MarkSupportReadDto,
  ) {
    return this.supportService.markRead(user, id, dto);
  }
}
