import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

const PURPOSES = ['order', 'warehouse'] as const;

export class CreateRestockDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  productId!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ enum: PURPOSES, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(PURPOSES, { each: true })
  purposes!: Array<(typeof PURPOSES)[number]>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;
}
