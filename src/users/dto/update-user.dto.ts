import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ enum: UserRole, example: UserRole.Staff })
  @IsEnum(UserRole)
  role!: UserRole;
}
