import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateGoalDto {
  @ApiProperty({ description: '種目 ID' })
  @IsString()
  exerciseId: string;

  @ApiPropertyOptional({
    description:
      '目標重量（kg）。targetWeightKg / targetReps の少なくとも一方は必須',
    minimum: 0.01,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000)
  targetWeightKg?: number;

  @ApiPropertyOptional({
    description: '目標回数。targetWeightKg / targetReps の少なくとも一方は必須',
    minimum: 1,
    maximum: 10000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  targetReps?: number;

  @ApiPropertyOptional({
    description: '目標期限（YYYY-MM-DD）。JST 基準で本日以降',
    format: 'date',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
