import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { GoalStatus } from '../entities/goal.entity';

export class UpdateGoalDto {
  @IsOptional()
  @IsIn(['ACHIEVED', 'ABANDONED'])
  status?: Extract<GoalStatus, 'ACHIEVED' | 'ABANDONED'>;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}
