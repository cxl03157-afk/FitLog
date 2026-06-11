import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExerciseSet } from '../exercise-sets/entities/exercise-set.entity';
import { WorkoutExercise } from '../workout-exercises/entities/workout-exercise.entity';
import { WorkoutPost } from './entities/workout-post.entity';
import { WorkoutPostsController } from './workout-posts.controller';
import { WorkoutPostsService } from './workout-posts.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkoutPost, WorkoutExercise, ExerciseSet])],
  controllers: [WorkoutPostsController],
  providers: [WorkoutPostsService],
  exports: [WorkoutPostsService],
})
export class WorkoutPostsModule {}
