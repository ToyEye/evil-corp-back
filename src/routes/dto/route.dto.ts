import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString, MinLength } from 'class-validator';

export class CreateRouteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  driverId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  vehicleId!: string;
}

export class AssignRouteStopsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  deliveryIds!: string[];
}
