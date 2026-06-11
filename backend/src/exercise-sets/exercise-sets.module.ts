import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExerciseSet } from './entities/exercise-set.entity';
import { ExerciseSetsController } from './exercise-sets.controller';
import { ExerciseSetsService } from './exercise-sets.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExerciseSet])],
  controllers: [ExerciseSetsController],
  providers: [ExerciseSetsService],
})
export class ExerciseSetsModule {}
