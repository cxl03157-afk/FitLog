import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateWorkoutPostDto {
  @ApiPropertyOptional({
    description: '投稿タイトル（1〜100 文字）',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    description: '全体メモ（500 文字以内）',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({
    description: 'トレーニング実施日（YYYY-MM-DD）',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  trainedOn?: string;
}
