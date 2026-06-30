import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EXERCISE_CATEGORIES } from './exercise-categories';

export class CreateExerciseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsIn(EXERCISE_CATEGORIES)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
