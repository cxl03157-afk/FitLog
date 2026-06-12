import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RecordType } from '../entities/personal-record.entity';

export class CreatePersonalRecordDto {
  @ApiProperty({ description: '種目 ID' })
  @IsString()
  exerciseId: string;

  @ApiProperty({
    enum: ['MAX_WEIGHT', 'MAX_REPS'],
    description: 'レコードタイプ',
  })
  @IsIn(['MAX_WEIGHT', 'MAX_REPS'])
  recordType: RecordType;

  @ApiPropertyOptional({
    description: '最大重量 (kg)。MAX_WEIGHT 時は必須',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  weightKg?: number;

  @ApiPropertyOptional({
    description: '最大回数。MAX_REPS 時は必須',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  reps?: number;

  @ApiProperty({ description: '達成日 (YYYY-MM-DD)', example: '2024-06-01' })
  @IsDateString()
  achievedAt: string;

  @ApiPropertyOptional({ description: 'メモ (最大 200 文字)', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @ApiPropertyOptional({ description: '参照元 exercise_set の ID (任意)' })
  @IsOptional()
  @IsString()
  sourceExerciseSetId?: string;
}
