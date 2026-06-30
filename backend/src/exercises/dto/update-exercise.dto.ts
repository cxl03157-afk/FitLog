import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EXERCISE_CATEGORIES } from './exercise-categories';

export class UpdateExerciseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsIn(EXERCISE_CATEGORIES)
  category?: string;

  // undefined: 変更なし / string: 更新 / null: 削除
  // @IsOptional() は null/undefined 時に後続 validator を全スキップする（class-validator 仕様）
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
