import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Alex Morgan' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'alex@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.Staff })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({ example: 'company-2' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  companyId?: string;
}
