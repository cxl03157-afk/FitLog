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
  @IsString()
  exerciseId: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000)
  targetWeightKg?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  targetReps?: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}
