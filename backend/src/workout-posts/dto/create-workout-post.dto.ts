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
  @IsInt()
  @Min(1)
  setNumber: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  weightKg: number;

  @IsInt()
  @Min(1)
  reps: number;

  @IsOptional()
  @IsBoolean()
  isPr?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;
}

export class CreateWorkoutExerciseDto {
  @IsString()
  exerciseId: string;

  @IsInt()
  @Min(0)
  orderIndex: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateExerciseSetDto)
  sets: CreateExerciseSetDto[];
}

export class CreateWorkoutPostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsDateString()
  trainedOn: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutExerciseDto)
  exercises: CreateWorkoutExerciseDto[];
}
