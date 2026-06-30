import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Goal } from '../goals/entities/goal.entity';
import { PersonalRecord } from '../personal-records/entities/personal-record.entity';
import { WorkoutExercise } from '../workout-exercises/entities/workout-exercise.entity';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';
import { Exercise } from './entities/exercise.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exercise, WorkoutExercise, Goal, PersonalRecord]),
  ],
  controllers: [ExercisesController],
  providers: [ExercisesService],
  exports: [ExercisesService],
})
export class ExercisesModule {}
