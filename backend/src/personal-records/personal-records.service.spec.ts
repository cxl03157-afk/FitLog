import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Exercise } from '../exercises/entities/exercise.entity';
import { ExerciseSet } from '../exercise-sets/entities/exercise-set.entity';
import { UpdatePersonalRecordDto } from './dto/update-personal-record.dto';
import { PersonalRecord } from './entities/personal-record.entity';
import { PersonalRecordsService } from './personal-records.service';

const mockRecord = (
  userId = 'user1',
  overrides: Partial<PersonalRecord> = {},
): PersonalRecord =>
  ({
    id: '1',
    userId,
    exerciseId: '10',
    recordType: 'MAX_WEIGHT',
    weightKg: 100,
    reps: null,
    achievedAt: '2024-01-15',
    note: null,
    sourceExerciseSetId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as PersonalRecord;

const mockExercise = (): Exercise =>
  ({ id: '10', name: 'ベンチプレス' }) as Exercise;

const mockExerciseSet = (userId = 'user1', exerciseId = '10'): ExerciseSet =>
  ({
    id: '5',
    workoutExercise: {
      id: '3',
      exerciseId,
      workoutPost: { id: '2', userId },
    },
  }) as unknown as ExerciseSet;

describe('PersonalRecordsService', () => {
  let service: PersonalRecordsService;
  let prRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let exerciseRepository: { findOne: jest.Mock };
  let exerciseSetRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    prRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    exerciseRepository = { findOne: jest.fn() };
    exerciseSetRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonalRecordsService,
        {
          provide: getRepositoryToken(PersonalRecord),
          useValue: prRepository,
        },
        {
          provide: getRepositoryToken(Exercise),
          useValue: exerciseRepository,
        },
        {
          provide: getRepositoryToken(ExerciseSet),
          useValue: exerciseSetRepository,
        },
      ],
    }).compile();

    service = module.get(PersonalRecordsService);
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('userId フィルタで一覧を返す', async () => {
      prRepository.find.mockResolvedValue([mockRecord()]);

      const result = await service.findAll('user1');

      expect(prRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user1' } }),
      );
      expect(result).toHaveLength(1);
    });

    it('exerciseId フィルタを追加できる', async () => {
      prRepository.find.mockResolvedValue([]);

      await service.findAll('user1', '10');

      expect(prRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user1', exerciseId: '10' },
        }),
      );
    });

    it('recordType フィルタを追加できる', async () => {
      prRepository.find.mockResolvedValue([]);

      await service.findAll('user1', undefined, 'MAX_WEIGHT');

      expect(prRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user1', recordType: 'MAX_WEIGHT' },
        }),
      );
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('自分のレコードを exercise リレーション付きで返す', async () => {
      const record = mockRecord();
      prRepository.findOne.mockResolvedValue(record);

      const result = await service.findOne('1', 'user1');

      expect(result).toBe(record);
    });

    it('存在しない id で NotFoundException', async () => {
      prRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('他人のレコードで ForbiddenException', async () => {
      prRepository.findOne.mockResolvedValue(mockRecord('user2'));

      await expect(service.findOne('1', 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('MAX_WEIGHT: weightKg あり → 正常作成', async () => {
      exerciseRepository.findOne.mockResolvedValue(mockExercise());
      prRepository.create.mockReturnValue(mockRecord());
      prRepository.save.mockResolvedValue(mockRecord());

      const result = await service.create(
        {
          exerciseId: '10',
          recordType: 'MAX_WEIGHT',
          weightKg: 100,
          achievedAt: '2024-01-15',
        },
        'user1',
      );

      expect(result).toBeDefined();
    });

    it('MAX_WEIGHT: weightKg なし → BadRequestException', async () => {
      exerciseRepository.findOne.mockResolvedValue(mockExercise());

      await expect(
        service.create(
          {
            exerciseId: '10',
            recordType: 'MAX_WEIGHT',
            achievedAt: '2024-01-15',
          },
          'user1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('MAX_REPS: reps あり → 正常作成', async () => {
      exerciseRepository.findOne.mockResolvedValue(mockExercise());
      const rec = mockRecord('user1', {
        recordType: 'MAX_REPS',
        weightKg: null,
        reps: 10,
      });
      prRepository.create.mockReturnValue(rec);
      prRepository.save.mockResolvedValue(rec);

      const result = await service.create(
        {
          exerciseId: '10',
          recordType: 'MAX_REPS',
          reps: 10,
          achievedAt: '2024-01-15',
        },
        'user1',
      );

      expect(result).toBeDefined();
    });

    it('MAX_REPS: reps なし → BadRequestException', async () => {
      exerciseRepository.findOne.mockResolvedValue(mockExercise());

      await expect(
        service.create(
          {
            exerciseId: '10',
            recordType: 'MAX_REPS',
            achievedAt: '2024-01-15',
          },
          'user1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('存在しない exerciseId → NotFoundException', async () => {
      exerciseRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          {
            exerciseId: '999',
            recordType: 'MAX_WEIGHT',
            weightKg: 100,
            achievedAt: '2024-01-15',
          },
          'user1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('sourceExerciseSetId: 自分の set + 同じ exerciseId → 正常', async () => {
      exerciseRepository.findOne.mockResolvedValue(mockExercise());
      exerciseSetRepository.findOne.mockResolvedValue(
        mockExerciseSet('user1', '10'),
      );
      prRepository.create.mockReturnValue(mockRecord());
      prRepository.save.mockResolvedValue(mockRecord());

      await expect(
        service.create(
          {
            exerciseId: '10',
            recordType: 'MAX_WEIGHT',
            weightKg: 100,
            achievedAt: '2024-01-15',
            sourceExerciseSetId: '5',
          },
          'user1',
        ),
      ).resolves.toBeDefined();
    });

    it('sourceExerciseSetId: set が存在しない → NotFoundException', async () => {
      exerciseRepository.findOne.mockResolvedValue(mockExercise());
      exerciseSetRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          {
            exerciseId: '10',
            recordType: 'MAX_WEIGHT',
            weightKg: 100,
            achievedAt: '2024-01-15',
            sourceExerciseSetId: '999',
          },
          'user1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('sourceExerciseSetId: 他人の set → ForbiddenException', async () => {
      exerciseRepository.findOne.mockResolvedValue(mockExercise());
      exerciseSetRepository.findOne.mockResolvedValue(
        mockExerciseSet('user2', '10'),
      );

      await expect(
        service.create(
          {
            exerciseId: '10',
            recordType: 'MAX_WEIGHT',
            weightKg: 100,
            achievedAt: '2024-01-15',
            sourceExerciseSetId: '5',
          },
          'user1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('sourceExerciseSetId: exerciseId 不一致 → BadRequestException', async () => {
      exerciseRepository.findOne.mockResolvedValue(mockExercise());
      exerciseSetRepository.findOne.mockResolvedValue(
        mockExerciseSet('user1', '99'),
      );

      await expect(
        service.create(
          {
            exerciseId: '10',
            recordType: 'MAX_WEIGHT',
            weightKg: 100,
            achievedAt: '2024-01-15',
            sourceExerciseSetId: '5',
          },
          'user1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('部分更新して exercise リレーション付きで再取得して返す', async () => {
      const updated = mockRecord('user1', { weightKg: 120 });
      prRepository.findOne
        .mockResolvedValueOnce(mockRecord())
        .mockResolvedValueOnce(updated);
      prRepository.update.mockResolvedValue(undefined);

      const result = await service.update('1', { weightKg: 120 }, 'user1');

      const updateArg = (
        prRepository.update.mock.calls[0] as [string, Partial<PersonalRecord>]
      )[1];
      expect(updateArg.weightKg).toBe(120);
      expect(updateArg.updatedAt).toBeInstanceOf(Date);
      expect(result).toBe(updated);
    });

    it('存在しない id → NotFoundException', async () => {
      prRepository.findOne.mockResolvedValue(null);

      await expect(service.update('999', {}, 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('他人のレコード → ForbiddenException', async () => {
      prRepository.findOne.mockResolvedValue(mockRecord('user2'));

      await expect(service.update('1', {}, 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('weightKg=null → BadRequestException', async () => {
      prRepository.findOne.mockResolvedValue(mockRecord());

      await expect(
        service.update(
          '1',
          { weightKg: null } as unknown as UpdatePersonalRecordDto,
          'user1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('reps=null → BadRequestException', async () => {
      prRepository.findOne.mockResolvedValue(mockRecord());

      await expect(
        service.update(
          '1',
          { reps: null } as unknown as UpdatePersonalRecordDto,
          'user1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('achievedAt=null → BadRequestException', async () => {
      prRepository.findOne.mockResolvedValue(mockRecord());

      await expect(
        service.update(
          '1',
          { achievedAt: null } as unknown as UpdatePersonalRecordDto,
          'user1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('recordType=null → BadRequestException', async () => {
      prRepository.findOne.mockResolvedValue(mockRecord());

      await expect(
        service.update(
          '1',
          { recordType: null } as unknown as UpdatePersonalRecordDto,
          'user1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('note=null → DB に null 保存（メモ削除）', async () => {
      const updated = mockRecord('user1', { note: null });
      prRepository.findOne
        .mockResolvedValueOnce(mockRecord('user1', { note: 'old note' }))
        .mockResolvedValueOnce(updated);
      prRepository.update.mockResolvedValue(undefined);

      await service.update('1', { note: null }, 'user1');

      expect(prRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ note: null }),
      );
    });

    it('note=undefined → note を更新しない', async () => {
      prRepository.findOne
        .mockResolvedValueOnce(mockRecord('user1', { note: 'keep this' }))
        .mockResolvedValueOnce(mockRecord('user1', { note: 'keep this' }));
      prRepository.update.mockResolvedValue(undefined);

      await service.update('1', {}, 'user1');

      const updateArg = (
        prRepository.update.mock.calls[0] as [string, Partial<PersonalRecord>]
      )[1];
      expect('note' in updateArg).toBe(false);
    });

    it('recordType を MAX_REPS に変更して reps がない → BadRequestException', async () => {
      prRepository.findOne.mockResolvedValue(
        mockRecord('user1', {
          recordType: 'MAX_WEIGHT',
          weightKg: 100,
          reps: null,
        }),
      );

      await expect(
        service.update('1', { recordType: 'MAX_REPS' }, 'user1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('既存と異なる recordType を指定 → BadRequestException（変更不可）', async () => {
      prRepository.findOne.mockResolvedValue(
        mockRecord('user1', { recordType: 'MAX_WEIGHT' }),
      );

      await expect(
        service.update('1', { recordType: 'MAX_REPS' }, 'user1'),
      ).rejects.toThrow(
        new BadRequestException('recordType cannot be changed after creation'),
      );
    });

    it('既存と同じ recordType を指定 → 更新成功（許可）', async () => {
      const updated = mockRecord('user1', { weightKg: 120 });
      prRepository.findOne
        .mockResolvedValueOnce(
          mockRecord('user1', { recordType: 'MAX_WEIGHT' }),
        )
        .mockResolvedValueOnce(updated);
      prRepository.update.mockResolvedValue(undefined);

      const result = await service.update(
        '1',
        { recordType: 'MAX_WEIGHT', weightKg: 120 },
        'user1',
      );

      expect(result).toBe(updated);
    });

    it('recordType を省略した更新 → 更新成功（許可）', async () => {
      const updated = mockRecord('user1', { weightKg: 130 });
      prRepository.findOne
        .mockResolvedValueOnce(mockRecord('user1'))
        .mockResolvedValueOnce(updated);
      prRepository.update.mockResolvedValue(undefined);

      const result = await service.update('1', { weightKg: 130 }, 'user1');

      expect(result).toBe(updated);
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('正常削除', async () => {
      prRepository.findOne.mockResolvedValue(mockRecord());
      prRepository.delete.mockResolvedValue(undefined);

      await service.remove('1', 'user1');

      expect(prRepository.delete).toHaveBeenCalledWith('1');
    });

    it('存在しない id → NotFoundException', async () => {
      prRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('999', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('他人のレコード → ForbiddenException', async () => {
      prRepository.findOne.mockResolvedValue(mockRecord('user2'));

      await expect(service.remove('1', 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
