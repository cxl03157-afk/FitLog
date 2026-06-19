import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExerciseSet } from '../exercise-sets/entities/exercise-set.entity';
import { WorkoutExercise } from '../workout-exercises/entities/workout-exercise.entity';
import { S3Module } from '../s3/s3.module';
import { WorkoutPost } from './entities/workout-post.entity';
import { PostImage } from './entities/post-image.entity';
import { WorkoutPostsController } from './workout-posts.controller';
import { WorkoutPostsService } from './workout-posts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkoutPost,
      WorkoutExercise,
      ExerciseSet,
      PostImage,
    ]),
    S3Module,
  ],
  controllers: [WorkoutPostsController],
  providers: [WorkoutPostsService],
  exports: [WorkoutPostsService],
})
export class WorkoutPostsModule {}
