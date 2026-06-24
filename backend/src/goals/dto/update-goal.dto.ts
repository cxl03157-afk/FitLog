import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { GoalStatus } from '../entities/goal.entity';

export class UpdateGoalDto {
  @ApiPropertyOptional({
    description: '目標ステータス（ACHIEVED または ABANDONED のみ更新可）',
    enum: ['ACHIEVED', 'ABANDONED'],
  })
  @IsOptional()
  @IsIn(['ACHIEVED', 'ABANDONED'])
  status?: Extract<GoalStatus, 'ACHIEVED' | 'ABANDONED'>;

  @ApiPropertyOptional({
    description: '目標期限（YYYY-MM-DD）',
    format: 'date',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
