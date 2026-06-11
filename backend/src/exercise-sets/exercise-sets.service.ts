import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateSetDto } from './dto/update-set.dto';
import { ExerciseSet } from './entities/exercise-set.entity';

@Injectable()
export class ExerciseSetsService {
  constructor(
    @InjectRepository(ExerciseSet)
    private readonly exerciseSetRepository: Repository<ExerciseSet>,
  ) {}

  private async findOneWithOwnership(id: string): Promise<ExerciseSet> {
    const set = await this.exerciseSetRepository.findOne({
      where: { id },
      relations: ['workoutExercise', 'workoutExercise.workoutPost'],
    });
    if (!set) {
      throw new NotFoundException(`ExerciseSet ${id} not found`);
    }
    return set;
  }

  async update(id: string, dto: UpdateSetDto, userId: string): Promise<ExerciseSet> {
    const set = await this.findOneWithOwnership(id);
    if (set.workoutExercise.workoutPost.userId !== userId) {
      throw new ForbiddenException('Cannot update another user\'s set');
    }
    await this.exerciseSetRepository.update(id, {
      ...(dto.weightKg !== undefined && { weightKg: dto.weightKg }),
      ...(dto.reps !== undefined && { reps: dto.reps }),
      ...(dto.isPr !== undefined && { isPr: dto.isPr }),
      ...(dto.memo !== undefined && { memo: dto.memo }),
    });
    return this.exerciseSetRepository.findOne({ where: { id } }) as Promise<ExerciseSet>;
  }

  async remove(id: string, userId: string): Promise<void> {
    const set = await this.findOneWithOwnership(id);
    if (set.workoutExercise.workoutPost.userId !== userId) {
      throw new ForbiddenException('Cannot delete another user\'s set');
    }
    await this.exerciseSetRepository.delete(id);
  }
}
