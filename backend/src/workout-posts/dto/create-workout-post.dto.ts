import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateExerciseSetDto {
  @ApiProperty({ description: 'セット番号（1 始まり）', minimum: 1 })
  @IsInt()
  @Min(1)
  setNumber: number;

  @ApiProperty({ description: '重量（kg）。自重は 0', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  weightKg: number;

  @ApiProperty({ description: '回数（1 以上）', minimum: 1 })
  @IsInt()
  @Min(1)
  reps: number;

  @ApiPropertyOptional({ description: '個人記録フラグ' })
  @IsOptional()
  @IsBoolean()
  isPr?: boolean;

  @ApiPropertyOptional({
    description: 'セット単位のメモ（200 文字以内）',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;
}

export class CreateWorkoutExerciseDto {
  @ApiProperty({ description: '種目 ID' })
  @IsString()
  exerciseId: string;

  @ApiProperty({ description: '表示順序（0 始まり）', minimum: 0 })
  @IsInt()
  @Min(0)
  orderIndex: number;

  @ApiProperty({
    description: 'セット記録（1 件以上）',
    type: [CreateExerciseSetDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateExerciseSetDto)
  sets: CreateExerciseSetDto[];
}

export class CreateWorkoutPostDto {
  @ApiProperty({
    description: '投稿タイトル（1〜100 文字）',
    minLength: 1,
    maxLength: 100,
    example: '胸の日',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({
    description: '全体メモ（500 文字以内）',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({
    description: 'トレーニング実施日（YYYY-MM-DD）',
    format: 'date',
    example: '2026-06-24',
  })
  @IsDateString()
  trainedOn: string;

  @ApiProperty({
    description: '種目リスト（1 件以上）',
    type: [CreateWorkoutExerciseDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutExerciseDto)
  exercises: CreateWorkoutExerciseDto[];
}
