import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Optional overrides when approving. Used when the applicant did not
 * provide companyName / password on the original request.
 */
export class ApproveJoinRequestDto {
  @ApiPropertyOptional({ example: 'Northwind Logistics' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  companyName?: string;

  @ApiPropertyOptional({ example: 47.4812 })
  @IsOptional()
  @IsNumber()
  depotLat?: number;

  @ApiPropertyOptional({ example: 19.1303 })
  @IsOptional()
  @IsNumber()
  depotLng?: number;

  @ApiPropertyOptional({ example: 'Password123!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
