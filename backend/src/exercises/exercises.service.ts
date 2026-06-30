import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, QueryFailedError, Raw, Repository } from 'typeorm';
import { Goal } from '../goals/entities/goal.entity';
import { PersonalRecord } from '../personal-records/entities/personal-record.entity';
import { WorkoutExercise } from '../workout-exercises/entities/workout-exercise.entity';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { Exercise } from './entities/exercise.entity';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
    @InjectRepository(WorkoutExercise)
    private readonly workoutExerciseRepository: Repository<WorkoutExercise>,
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
    @InjectRepository(PersonalRecord)
    private readonly personalRecordRepository: Repository<PersonalRecord>,
  ) {}

  findAll(userId: string): Promise<Exercise[]> {
    return this.exerciseRepository.find({
      where: [{ userId: IsNull() }, { userId }],
      order: { name: 'ASC' },
    });
  }

  async findVisibleOne(id: string, userId: string): Promise<Exercise> {
    const exercise = await this.exerciseRepository.findOne({
      where: [
        { id, userId: IsNull() },
        { id, userId },
      ],
    });
    if (!exercise) {
      throw new NotFoundException(`Exercise ${id} not found`);
    }
    return exercise;
  }

  private async findOneForMutation(
    id: string,
    userId: string,
  ): Promise<Exercise> {
    const exercise = await this.exerciseRepository.findOne({ where: { id } });
    if (!exercise) {
      throw new NotFoundException(`Exercise ${id} not found`);
    }
    if (exercise.userId === null) {
      throw new ForbiddenException('標準種目は更新・削除できません');
    }
    if (exercise.userId !== userId) {
      throw new ForbiddenException('他ユーザーの種目は更新・削除できません');
    }
    return exercise;
  }

  private async checkDuplicateName(
    name: string,
    userId: string,
    excludeId?: string,
  ): Promise<void> {
    const nameCondition = Raw(
      (alias) => `LOWER(TRIM(${alias})) = LOWER(TRIM(:name))`,
      { name },
    );

    const standardCount = await this.exerciseRepository.count({
      where: { name: nameCondition, userId: IsNull() },
    });
    if (standardCount > 0) {
      throw new ConflictException('標準種目と同じ名前は使用できません');
    }

    const customCount = await this.exerciseRepository.count({
      where:
        excludeId !== undefined
          ? { name: nameCondition, userId, id: Not(excludeId) }
          : { name: nameCondition, userId },
    });
    if (customCount > 0) {
      throw new ConflictException('同じ名前の独自種目がすでにあります');
    }
  }

  async create(dto: CreateExerciseDto, userId: string): Promise<Exercise> {
    await this.checkDuplicateName(dto.name, userId);

    const exercise = this.exerciseRepository.create({
      name: dto.name,
      category: dto.category,
      description: dto.description ?? null,
      userId,
    });

    try {
      return await this.exerciseRepository.save(exercise);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as QueryFailedError & { code: string }).code === '23505'
      ) {
        throw new ConflictException('同じ名前の種目がすでに存在します');
      }
      throw err;
    }
  }

  async update(
    id: string,
    dto: UpdateExerciseDto,
    userId: string,
  ): Promise<Exercise> {
    const exercise = await this.findOneForMutation(id, userId);

    if (dto.name !== undefined) {
      await this.checkDuplicateName(dto.name, userId, id);
    }

    if (dto.name !== undefined) exercise.name = dto.name;
    if (dto.category !== undefined) exercise.category = dto.category;
    if (dto.description !== undefined) exercise.description = dto.description;

    try {
      return await this.exerciseRepository.save(exercise);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as QueryFailedError & { code: string }).code === '23505'
      ) {
        throw new ConflictException('同じ名前の種目がすでに存在します');
      }
      throw err;
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOneForMutation(id, userId);

    const inUse = await Promise.all([
      this.workoutExerciseRepository.existsBy({ exerciseId: id }),
      this.goalRepository.existsBy({ exerciseId: id }),
      this.personalRecordRepository.existsBy({ exerciseId: id }),
    ]);
    if (inUse.some(Boolean)) {
      throw new ConflictException('この種目は使用中のため削除できません');
    }

    try {
      await this.exerciseRepository.delete(id);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as QueryFailedError & { code: string }).code === '23503'
      ) {
        throw new ConflictException('この種目は使用中のため削除できません');
      }
      throw err;
    }
  }
}
