import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AppPageId, UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePage } from '../common/decorators/require-page.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@RequirePage(AppPageId.users)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (scoped by company)' })
  @ApiOkResponse({ description: 'User list without passwordHash' })
  list(@CurrentUser() user: JwtPayload) {
    return this.usersService.list(user);
  }

  @Post()
  @Roles(UserRole.Admin, UserRole.SEO, UserRole.Staff)
  @ApiOperation({ summary: 'Invite / create a user' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    return this.usersService.create(user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.Admin, UserRole.SEO, UserRole.Staff)
  @ApiOperation({ summary: 'Update user role' })
  updateRole(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateRole(user, id, dto);
  }
}
