import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SearchUsersDto {
  @ApiProperty({
    description: 'ユーザー名（部分一致、trim 後の空文字は 400）',
    maxLength: 20,
    example: 'fit',
  })
  @IsString()
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Matches(/\S/, {
    message: 'username must contain at least one non-whitespace character',
  })
  @MaxLength(20)
  username: string;

  @ApiPropertyOptional({
    description: '取得件数（1〜50、デフォルト 20）',
    minimum: 1,
    maximum: 50,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
