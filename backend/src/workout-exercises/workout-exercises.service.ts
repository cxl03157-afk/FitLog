import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExerciseSet } from '../exercise-sets/entities/exercise-set.entity';
import { WorkoutPost } from '../workout-posts/entities/workout-post.entity';
import { CreateSetDto } from './dto/create-set.dto';
import { WorkoutExercise } from './entities/workout-exercise.entity';

@Injectable()
export class WorkoutExercisesService {
  constructor(
    @InjectRepository(WorkoutExercise)
    private readonly workoutExerciseRepository: Repository<WorkoutExercise>,
    @InjectRepository(ExerciseSet)
    private readonly exerciseSetRepository: Repository<ExerciseSet>,
    @InjectRepository(WorkoutPost)
    private readonly workoutPostRepository: Repository<WorkoutPost>,
  ) {}

  async addSet(
    workoutExerciseId: string,
    dto: CreateSetDto,
    userId: string,
  ): Promise<ExerciseSet> {
    const we = await this.workoutExerciseRepository.findOne({
      where: { id: workoutExerciseId },
      relations: ['workoutPost'],
    });
    if (!we) {
      throw new NotFoundException(`WorkoutExercise ${workoutExerciseId} not found`);
    }
    if (we.workoutPost.userId !== userId) {
      throw new ForbiddenException('Cannot add set to another user\'s exercise');
    }

    const set = this.exerciseSetRepository.create({
      workoutExerciseId,
      setNumber: dto.setNumber,
      weightKg: dto.weightKg,
      reps: dto.reps,
      isPr: dto.isPr ?? false,
      memo: dto.memo ?? null,
    });
    return this.exerciseSetRepository.save(set);
  }
}
