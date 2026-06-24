import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ExerciseStatsQueryDto {
  @ApiPropertyOptional({
    description: '直近トレーニング日数（1〜90、デフォルト 30）',
    minimum: 1,
    maximum: 90,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  limit: number = 30;
}
