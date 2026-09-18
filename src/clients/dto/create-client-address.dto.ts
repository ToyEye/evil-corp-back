import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateClientAddressDto {
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
