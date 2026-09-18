import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AdjustInventoryDto {
  @ApiProperty({ example: -5, description: 'Signed quantity delta' })
  @IsInt()
  delta!: number;
}
