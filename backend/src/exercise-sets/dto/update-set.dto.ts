import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateSetDto {
  @ApiPropertyOptional({
    description: '重量（kg）。自重は 0、小数点以下 2 桁まで',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  weightKg?: number;

  @ApiPropertyOptional({ description: '回数（1 以上）', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  reps?: number;

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
