import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExerciseSet } from '../exercise-sets/entities/exercise-set.entity';
import { WorkoutPost } from '../workout-posts/entities/workout-post.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkoutPost, ExerciseSet])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
