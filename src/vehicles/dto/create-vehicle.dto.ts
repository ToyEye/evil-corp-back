import { ApiProperty } from '@nestjs/swagger';
import { VehicleType } from '@prisma/client';
import { IsEnum, IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'Van 12' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'ABC-1234' })
  @IsString()
  @MinLength(1)
  plate!: string;

  @ApiProperty({ enum: VehicleType, example: VehicleType.Van })
  @IsEnum(VehicleType)
  type!: VehicleType;

  @ApiProperty({ example: 40 })
  @IsInt()
  @Min(1)
  maxUnits!: number;
}
