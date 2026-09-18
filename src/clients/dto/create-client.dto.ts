import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ClientAddressInputDto {
  @ApiProperty({ example: '12 Market St, Portland' })
  @IsString()
  @MinLength(1)
  line!: string;

  @ApiPropertyOptional({ example: 45.512 })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: -122.678 })
  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class CreateClientDto {
  @ApiProperty({ example: 'Marta Reyes' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: '+1 555 0100' })
  @IsString()
  @MinLength(1)
  phone!: string;

  @ApiProperty({ example: 'marta@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'Prefers morning delivery' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ type: [ClientAddressInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientAddressInputDto)
  addresses?: ClientAddressInputDto[];
}
