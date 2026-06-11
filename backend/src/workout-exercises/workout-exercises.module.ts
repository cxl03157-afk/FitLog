import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExerciseSet } from '../exercise-sets/entities/exercise-set.entity';
import { WorkoutPost } from '../workout-posts/entities/workout-post.entity';
import { WorkoutExercise } from './entities/workout-exercise.entity';
import { WorkoutExercisesController } from './workout-exercises.controller';
import { WorkoutExercisesService } from './workout-exercises.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkoutExercise, ExerciseSet, WorkoutPost]),
  ],
  controllers: [WorkoutExercisesController],
  providers: [WorkoutExercisesService],
  exports: [WorkoutExercisesService],
})
export class WorkoutExercisesModule {}
