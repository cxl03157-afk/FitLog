import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: '表示名（1〜50文字）。trim 後に空文字になる場合は 400',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(1)
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional({
    description:
      '自己紹介（160文字以内）。null を指定すると削除。空文字 or trim後空文字 → null として保存',
    maxLength: 160,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown => {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'string') return value;
    return value.trim() === '' ? null : value;
  })
  @IsString()
  @MaxLength(160)
  bio?: string | null;
}
