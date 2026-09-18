import { ApiProperty } from '@nestjs/swagger';
import { AppPageId, UserRole } from '@prisma/client';
import { IsArray, IsEnum } from 'class-validator';

export class UpdatePageAccessDto {
  @ApiProperty({ enum: AppPageId, example: AppPageId.warehouse })
  @IsEnum(AppPageId)
  pageId!: AppPageId;

  @ApiProperty({
    enum: UserRole,
    isArray: true,
    example: [UserRole.SEO, UserRole.Storekeeper],
  })
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles!: UserRole[];
}
