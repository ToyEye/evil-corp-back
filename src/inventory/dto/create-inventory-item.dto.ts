import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsString, Min, MinLength } from 'class-validator';

export const API_INVENTORY_CATEGORIES = [
  'Packaging',
  'Spare parts',
  'Consumables',
  'Equipment',
  'Safety',
] as const;

export type ApiInventoryCategoryDto =
  (typeof API_INVENTORY_CATEGORIES)[number];

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'RR-PAL-001' })
  @IsString()
  @MinLength(1)
  sku!: string;

  @ApiProperty({ example: 'Euro pallet' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'Standard wood pallet' })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty({ example: 120 })
  @IsInt()
  @Min(0)
  quantity!: number;

  @ApiProperty({ example: 24.5 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({
    enum: API_INVENTORY_CATEGORIES,
    example: 'Packaging',
  })
  @IsIn(API_INVENTORY_CATEGORIES)
  category!: ApiInventoryCategoryDto;

  @ApiProperty({ example: 'A-12' })
  @IsString()
  @MinLength(1)
  bin!: string;
}
