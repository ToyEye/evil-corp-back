import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type {
  ApiDeliveryStatus,
  ApiFailureReason,
} from '../../common/utils/enums';

const DELIVERY_STATUSES = [
  'New',
  'Planned',
  'In transit',
  'Arrived',
  'Failed',
  'Canceled',
  'Done',
] as const;

const FAILURE_REASONS = [
  'Customer absent',
  'Refused',
  'Wrong address',
  'Damaged goods',
  'Could not access site',
  'Other',
] as const;

export class DeliveryLineDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  productId!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateDeliveryDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  clientId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ type: [DeliveryLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeliveryLineDto)
  items?: DeliveryLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driverId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dispatchAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliverBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class AssignDeliveryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driverId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destination?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dispatchAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliverBy?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeliveryProofDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signatureUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  capturedAt?: string;
}

export class ProgressDeliveryDto {
  @ApiProperty({ enum: DELIVERY_STATUSES })
  @IsIn(DELIVERY_STATUSES)
  status!: ApiDeliveryStatus;

  @ApiPropertyOptional({ type: DeliveryProofDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryProofDto)
  proof?: DeliveryProofDto;

  @ApiPropertyOptional({ enum: FAILURE_REASONS })
  @IsOptional()
  @IsIn(FAILURE_REASONS)
  failureReason?: ApiFailureReason;
}
