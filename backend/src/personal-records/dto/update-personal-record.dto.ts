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
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { RecordType } from '../entities/personal-record.entity';

export class UpdatePersonalRecordDto {
  @ApiPropertyOptional({
    enum: ['MAX_WEIGHT', 'MAX_REPS'],
    description:
      'レコードタイプ。作成後変更不可 — 既存値と異なる値を指定すると 400 Bad Request を返す',
  })
  @IsOptional()
  @IsIn(['MAX_WEIGHT', 'MAX_REPS'])
  recordType?: RecordType;

  @ApiPropertyOptional({ description: '最大重量 (kg)', minimum: 0.01 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  weightKg?: number;

  @ApiPropertyOptional({ description: '最大回数', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  reps?: number;

  @ApiPropertyOptional({
    description: '達成日 (YYYY-MM-DD)',
    example: '2024-06-01',
  })
  @IsOptional()
  @IsDateString()
  achievedAt?: string;

  // null を許可（メモ削除として扱う）。undefined の場合は既存値を維持
  @ApiPropertyOptional({
    description: 'メモ (最大 200 文字)。null でメモ削除',
    maxLength: 200,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string | null;
}
