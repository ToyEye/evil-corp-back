import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import {
  API_INVENTORY_CATEGORIES,
  type ApiInventoryCategoryDto,
} from './create-inventory-item.dto';

export class UpdateInventoryItemDto {
  @ApiPropertyOptional({ example: 'Euro pallet' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'Standard wood pallet' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @ApiPropertyOptional({ example: 24.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    enum: API_INVENTORY_CATEGORIES,
    example: 'Spare parts',
  })
  @IsOptional()
  @IsIn(API_INVENTORY_CATEGORIES)
  category?: ApiInventoryCategoryDto;

  @ApiPropertyOptional({ example: 'A-12' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  bin?: string;
}
