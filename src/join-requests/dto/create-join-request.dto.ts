import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateJoinRequestDto {
  @ApiProperty({ example: 'Jordan Lee' })
  @IsString()
  @MinLength(1)
  contactName!: string;

  @ApiProperty({ example: 'jordan@newco.example' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'We need warehouse + delivery ops for our regional fleet.',
  })
  @IsString()
  @MinLength(1)
  message!: string;

  @ApiPropertyOptional({ example: 'Northwind Logistics' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  companyName?: string;

  @ApiPropertyOptional({ example: 47.4812 })
  @IsOptional()
  @IsNumber()
  depotLat?: number;

  @ApiPropertyOptional({ example: 19.1303 })
  @IsOptional()
  @IsNumber()
  depotLng?: number;

  /** Optional password for the future SEO account created on approve. */
  @ApiPropertyOptional({ example: 'Password123!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
