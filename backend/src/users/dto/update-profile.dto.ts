import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(1)
  @MaxLength(50)
  displayName?: string;

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
