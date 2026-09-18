import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

export class CreateSupportMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  body!: string;
}

export class MarkSupportReadDto {
  @ApiProperty({ enum: ['support', 'requester'] })
  @IsIn(['support', 'requester'])
  as!: 'support' | 'requester';
}
