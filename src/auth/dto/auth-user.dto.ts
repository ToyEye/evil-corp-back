import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  companyName!: string;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl?: string | null;
}

export class LoginResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ description: 'JWT access token' })
  token!: string;
}
