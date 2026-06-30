import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, QueryFailedError, Repository } from 'typeorm';
import { Goal } from '../goals/entities/goal.entity';
import { PersonalRecord } from '../personal-records/entities/personal-record.entity';
import { WorkoutExercise } from '../workout-exercises/entities/workout-exercise.entity';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { Exercise } from './entities/exercise.entity';
import { ExercisesService } from './exercises.service';

const MY_USER_ID = '100';
const OTHER_USER_ID = '200';

const makeExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: '1',
  name: 'ベンチプレス',
  category: '胸',
  description: null,
  userId: null,
  createdAt: new Date(),
  ...overrides,
});

const makeDbError = (code: string): QueryFailedError => {
  const err = new QueryFailedError('query', [], new Error('db error'));
  (err as QueryFailedError & { code: string }).code = code;
  return err;
};

describe('ExercisesService', () => {
  let service: ExercisesService;
  let exerciseRepo: jest.Mocked<Repository<Exercise>>;
  let workoutExerciseRepo: jest.Mocked<Repository<WorkoutExercise>>;
  let goalRepo: jest.Mocked<Repository<Goal>>;
  let personalRecordRepo: jest.Mocked<Repository<PersonalRecord>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        {
          provide: getRepositoryToken(Exercise),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            count: jest.fn().mockResolvedValue(0),
          },
        },
        {
          provide: getRepositoryToken(WorkoutExercise),
          useValue: { existsBy: jest.fn().mockResolvedValue(false) },
        },
        {
          provide: getRepositoryToken(Goal),
          useValue: { existsBy: jest.fn().mockResolvedValue(false) },
        },
        {
          provide: getRepositoryToken(PersonalRecord),
          useValue: { existsBy: jest.fn().mockResolvedValue(false) },
        },
      ],
    }).compile();

    service = module.get(ExercisesService);
    exerciseRepo = module.get(getRepositoryToken(Exercise));
    workoutExerciseRepo = module.get(getRepositoryToken(WorkoutExercise));
    goalRepo = module.get(getRepositoryToken(Goal));
    personalRecordRepo = module.get(getRepositoryToken(PersonalRecord));
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('queries with IsNull OR userId and returns results', async () => {
      const exercises = [makeExercise()];
      exerciseRepo.find.mockResolvedValue(exercises);

      const result = await service.findAll(MY_USER_ID);

      expect(result).toEqual(exercises);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(exerciseRepo.find).toHaveBeenCalledWith({
        where: [{ userId: IsNull() }, { userId: MY_USER_ID }],
        order: { name: 'ASC' },
      });
    });
  });

  // ─── findVisibleOne ──────────────────────────────────────────────────────────

  describe('findVisibleOne', () => {
    it('returns standard exercise (userId=null)', async () => {
      const ex = makeExercise({ userId: null });
      exerciseRepo.findOne.mockResolvedValue(ex);

      const result = await service.findVisibleOne('1', MY_USER_ID);

      expect(result).toEqual(ex);
    });

    it('returns own custom exercise', async () => {
      const ex = makeExercise({ userId: MY_USER_ID });
      exerciseRepo.findOne.mockResolvedValue(ex);

      const result = await service.findVisibleOne('1', MY_USER_ID);

      expect(result).toEqual(ex);
    });

    it('throws NotFoundException for other user exercise (invisible)', async () => {
      exerciseRepo.findOne.mockResolvedValue(null);

      await expect(service.findVisibleOne('1', MY_USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateExerciseDto = { name: '新種目', category: '胸' };

    it('creates exercise with caller userId', async () => {
      const ex = makeExercise({ name: dto.name, userId: MY_USER_ID });
      exerciseRepo.create.mockReturnValue(ex);
      exerciseRepo.save.mockResolvedValue(ex);

      const result = await service.create(dto, MY_USER_ID);

      expect(result).toEqual(ex);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(exerciseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: MY_USER_ID }),
      );
    });

    it('throws ConflictException when standard exercise has same name', async () => {
      exerciseRepo.count.mockResolvedValueOnce(1);

      await expect(service.create(dto, MY_USER_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException when own custom exercise has same name', async () => {
      exerciseRepo.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

      await expect(service.create(dto, MY_USER_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('converts 23505 to ConflictException', async () => {
      exerciseRepo.create.mockReturnValue(makeExercise());
      exerciseRepo.save.mockRejectedValue(makeDbError('23505'));

      await expect(service.create(dto, MY_USER_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows non-23505 DB errors', async () => {
      exerciseRepo.create.mockReturnValue(makeExercise());
      exerciseRepo.save.mockRejectedValue(makeDbError('23000'));

      await expect(service.create(dto, MY_USER_ID)).rejects.toThrow(
        QueryFailedError,
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates own custom exercise', async () => {
      const ex = makeExercise({ userId: MY_USER_ID });
      exerciseRepo.findOne.mockResolvedValue(ex);
      exerciseRepo.save.mockImplementation((e) =>
        Promise.resolve(e as Exercise),
      );

      const result = await service.update('1', { name: '更新後' }, MY_USER_ID);

      expect(result.name).toBe('更新後');
    });

    it('throws ForbiddenException for standard exercise (userId=null)', async () => {
      exerciseRepo.findOne.mockResolvedValue(makeExercise({ userId: null }));

      await expect(
        service.update('1', { name: '更新後' }, MY_USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for other user exercise', async () => {
      exerciseRepo.findOne.mockResolvedValue(
        makeExercise({ userId: OTHER_USER_ID }),
      );

      await expect(
        service.update('1', { name: '更新後' }, MY_USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException on duplicate name', async () => {
      exerciseRepo.findOne.mockResolvedValue(
        makeExercise({ userId: MY_USER_ID }),
      );
      exerciseRepo.count.mockResolvedValueOnce(1);

      await expect(
        service.update('1', { name: '重複名' }, MY_USER_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('converts 23505 to ConflictException', async () => {
      exerciseRepo.findOne.mockResolvedValue(
        makeExercise({ userId: MY_USER_ID }),
      );
      exerciseRepo.save.mockRejectedValue(makeDbError('23505'));

      await expect(
        service.update('1', { category: '背中' }, MY_USER_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows non-23505 DB errors', async () => {
      exerciseRepo.findOne.mockResolvedValue(
        makeExercise({ userId: MY_USER_ID }),
      );
      exerciseRepo.save.mockRejectedValue(makeDbError('23000'));

      await expect(
        service.update('1', { category: '背中' }, MY_USER_ID),
      ).rejects.toThrow(QueryFailedError);
    });

    it('sets description to null when null is provided', async () => {
      const ex = makeExercise({ userId: MY_USER_ID, description: '旧説明' });
      exerciseRepo.findOne.mockResolvedValue(ex);
      exerciseRepo.save.mockImplementation((e) =>
        Promise.resolve(e as Exercise),
      );

      await service.update('1', { description: null }, MY_USER_ID);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(exerciseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ description: null }),
      );
    });

    it('preserves existing description when description is undefined', async () => {
      const ex = makeExercise({ userId: MY_USER_ID, description: '説明あり' });
      exerciseRepo.findOne.mockResolvedValue(ex);
      exerciseRepo.save.mockImplementation((e) =>
        Promise.resolve(e as Exercise),
      );

      await service.update('1', { category: '背中' }, MY_USER_ID);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(exerciseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ description: '説明あり' }),
      );
    });

    it('updates description to string when string is provided', async () => {
      const ex = makeExercise({ userId: MY_USER_ID, description: null });
      exerciseRepo.findOne.mockResolvedValue(ex);
      exerciseRepo.save.mockImplementation((e) =>
        Promise.resolve(e as Exercise),
      );

      await service.update('1', { description: '新説明' }, MY_USER_ID);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(exerciseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ description: '新説明' }),
      );
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes own custom exercise', async () => {
      exerciseRepo.findOne.mockResolvedValue(
        makeExercise({ userId: MY_USER_ID }),
      );
      exerciseRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await expect(service.remove('1', MY_USER_ID)).resolves.toBeUndefined();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(exerciseRepo.delete).toHaveBeenCalledWith('1');
    });

    it('throws ForbiddenException for standard exercise (userId=null)', async () => {
      exerciseRepo.findOne.mockResolvedValue(makeExercise({ userId: null }));

      await expect(service.remove('1', MY_USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException for other user exercise', async () => {
      exerciseRepo.findOne.mockResolvedValue(
        makeExercise({ userId: OTHER_USER_ID }),
      );

      await expect(service.remove('1', MY_USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ConflictException when used in workout_exercises', async () => {
      exerciseRepo.findOne.mockResolvedValue(
        makeExercise({ userId: MY_USER_ID }),
      );
      workoutExerciseRepo.existsBy.mockResolvedValue(true);

      await expect(service.remove('1', MY_USER_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException when used in goals', async () => {
      exerciseRepo.findOne.mockResolvedValue(
        makeExercise({ userId: MY_USER_ID }),
      );
      goalRepo.existsBy.mockResolvedValue(true);

      await expect(service.remove('1', MY_USER_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException when used in personal_records', async () => {
      exerciseRepo.findOne.mockResolvedValue(
        makeExercise({ userId: MY_USER_ID }),
      );
      personalRecordRepo.existsBy.mockResolvedValue(true);

      await expect(service.remove('1', MY_USER_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('converts 23503 to ConflictException', async () => {
      exerciseRepo.findOne.mockResolvedValue(
        makeExercise({ userId: MY_USER_ID }),
      );
      exerciseRepo.delete.mockRejectedValue(makeDbError('23503'));

      await expect(service.remove('1', MY_USER_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows non-23503 DB errors', async () => {
      exerciseRepo.findOne.mockResolvedValue(
        makeExercise({ userId: MY_USER_ID }),
      );
      exerciseRepo.delete.mockRejectedValue(makeDbError('00000'));

      await expect(service.remove('1', MY_USER_ID)).rejects.toThrow(
        QueryFailedError,
      );
    });
  });
});
