import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Nordic Pack Co' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: SupplierType, example: SupplierType.Distributor })
  @IsEnum(SupplierType)
  type!: SupplierType;

  @ApiProperty({ example: 'Pallets and stretch wrap' })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty({ example: 'Hazardous chemicals' })
  @IsString()
  @MinLength(1)
  doesNotSupply!: string;

  @ApiPropertyOptional({ example: 'Preferred lead time 5 days' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional({ example: 'Nordic Pack Co' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ enum: SupplierType })
  @IsOptional()
  @IsEnum(SupplierType)
  type?: SupplierType;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  addedAt?: string;

  @ApiPropertyOptional({ example: 'Pallets and stretch wrap' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @ApiPropertyOptional({ example: 'Hazardous chemicals' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  doesNotSupply?: string;

  @ApiPropertyOptional({ example: 'Preferred lead time 5 days' })
  @IsOptional()
  @IsString()
  notes?: string;
}
