import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise } from '../exercises/entities/exercise.entity';
import { ExerciseSet } from '../exercise-sets/entities/exercise-set.entity';
import { CreatePersonalRecordDto } from './dto/create-personal-record.dto';
import { UpdatePersonalRecordDto } from './dto/update-personal-record.dto';
import { PersonalRecord } from './entities/personal-record.entity';

@Injectable()
export class PersonalRecordsService {
  constructor(
    @InjectRepository(PersonalRecord)
    private readonly personalRecordRepository: Repository<PersonalRecord>,
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
    @InjectRepository(ExerciseSet)
    private readonly exerciseSetRepository: Repository<ExerciseSet>,
  ) {}

  findAll(
    userId: string,
    exerciseId?: string,
    recordType?: string,
  ): Promise<PersonalRecord[]> {
    const where: Record<string, unknown> = { userId };
    if (exerciseId) where['exerciseId'] = exerciseId;
    if (recordType) where['recordType'] = recordType;
    return this.personalRecordRepository.find({
      where,
      relations: { exercise: true },
      order: { achievedAt: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<PersonalRecord> {
    const record = await this.personalRecordRepository.findOne({
      where: { id },
      relations: { exercise: true },
    });
    if (!record) throw new NotFoundException(`PersonalRecord ${id} not found`);
    if (record.userId !== userId)
      throw new ForbiddenException("Cannot access another user's record");
    return record;
  }

  async create(
    dto: CreatePersonalRecordDto,
    userId: string,
  ): Promise<PersonalRecord> {
    const exercise = await this.exerciseRepository.findOne({
      where: { id: dto.exerciseId },
    });
    if (!exercise)
      throw new NotFoundException(`Exercise ${dto.exerciseId} not found`);

    if (dto.recordType === 'MAX_WEIGHT' && dto.weightKg == null)
      throw new BadRequestException('weightKg is required for MAX_WEIGHT');
    if (dto.recordType === 'MAX_REPS' && dto.reps == null)
      throw new BadRequestException('reps is required for MAX_REPS');

    if (dto.sourceExerciseSetId != null) {
      const set = await this.exerciseSetRepository.findOne({
        where: { id: dto.sourceExerciseSetId },
        relations: { workoutExercise: { workoutPost: true } },
      });
      if (!set)
        throw new NotFoundException(
          `ExerciseSet ${dto.sourceExerciseSetId} not found`,
        );
      if (set.workoutExercise.workoutPost.userId !== userId)
        throw new ForbiddenException(
          "Cannot reference another user's exercise set",
        );
      if (set.workoutExercise.exerciseId !== dto.exerciseId)
        throw new BadRequestException(
          'sourceExerciseSetId does not belong to the specified exercise',
        );
    }

    const record = this.personalRecordRepository.create({
      userId,
      exerciseId: dto.exerciseId,
      recordType: dto.recordType,
      weightKg: dto.weightKg ?? null,
      reps: dto.reps ?? null,
      achievedAt: dto.achievedAt,
      note: dto.note ?? null,
      sourceExerciseSetId: dto.sourceExerciseSetId ?? null,
    });
    return this.personalRecordRepository.save(record);
  }

  async update(
    id: string,
    dto: UpdatePersonalRecordDto,
    userId: string,
  ): Promise<PersonalRecord> {
    const record = await this.personalRecordRepository.findOne({
      where: { id },
    });
    if (!record) throw new NotFoundException(`PersonalRecord ${id} not found`);
    if (record.userId !== userId)
      throw new ForbiddenException("Cannot update another user's record");

    if (dto.weightKg === null)
      throw new BadRequestException('weightKg cannot be set to null');
    if (dto.reps === null)
      throw new BadRequestException('reps cannot be set to null');
    if (dto.achievedAt === null)
      throw new BadRequestException('achievedAt cannot be set to null');
    if (dto.recordType === null)
      throw new BadRequestException('recordType cannot be set to null');
    if (dto.recordType !== undefined && dto.recordType !== record.recordType)
      throw new BadRequestException(
        'recordType cannot be changed after creation',
      );

    const effectiveRecordType = dto.recordType ?? record.recordType;
    const effectiveWeightKg =
      dto.weightKg !== undefined ? dto.weightKg : record.weightKg;
    const effectiveReps = dto.reps !== undefined ? dto.reps : record.reps;

    if (effectiveRecordType === 'MAX_WEIGHT' && effectiveWeightKg == null)
      throw new BadRequestException('weightKg is required for MAX_WEIGHT');
    if (effectiveRecordType === 'MAX_REPS' && effectiveReps == null)
      throw new BadRequestException('reps is required for MAX_REPS');

    const updates: Partial<PersonalRecord> = { updatedAt: new Date() };
    if (dto.recordType !== undefined) updates.recordType = dto.recordType;
    if (dto.weightKg !== undefined) updates.weightKg = dto.weightKg;
    if (dto.reps !== undefined) updates.reps = dto.reps;
    if (dto.achievedAt !== undefined) updates.achievedAt = dto.achievedAt;
    if ('note' in dto) updates.note = dto.note ?? null;

    await this.personalRecordRepository.update(id, updates);
    return this.personalRecordRepository.findOne({
      where: { id },
      relations: { exercise: true },
    }) as Promise<PersonalRecord>;
  }

  async remove(id: string, userId: string): Promise<void> {
    const record = await this.personalRecordRepository.findOne({
      where: { id },
    });
    if (!record) throw new NotFoundException(`PersonalRecord ${id} not found`);
    if (record.userId !== userId)
      throw new ForbiddenException("Cannot delete another user's record");
    await this.personalRecordRepository.delete(id);
  }
}
