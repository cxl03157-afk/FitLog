import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise } from '../exercises/entities/exercise.entity';
import { ExerciseSet } from '../exercise-sets/entities/exercise-set.entity';
import { PersonalRecord } from './entities/personal-record.entity';
import { PersonalRecordsController } from './personal-records.controller';
import { PersonalRecordsService } from './personal-records.service';

@Module({
  imports: [TypeOrmModule.forFeature([PersonalRecord, Exercise, ExerciseSet])],
  controllers: [PersonalRecordsController],
  providers: [PersonalRecordsService],
})
export class PersonalRecordsModule {}
