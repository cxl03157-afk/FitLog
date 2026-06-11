import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSetDto {
  @IsInt()
  @Min(1)
  setNumber: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  weightKg: number;

  @IsInt()
  @Min(1)
  reps: number;

  @IsOptional()
  @IsBoolean()
  isPr?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;
}
