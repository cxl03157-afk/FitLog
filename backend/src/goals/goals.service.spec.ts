import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Goal } from './entities/goal.entity';
import { GoalsService } from './goals.service';

jest.mock('../common/utils/date.util', () => ({
  getJstToday: jest.fn(),
}));

import { getJstToday } from '../common/utils/date.util';
const mockGetJstToday = getJstToday as jest.MockedFunction<typeof getJstToday>;

const mockGoal = (userId = 'user1', status: Goal['status'] = 'IN_PROGRESS') =>
  ({
    id: '1',
    userId,
    status,
    exerciseId: '10',
    targetWeightKg: null,
    targetReps: null,
    deadline: null,
    achievedAt: null,
  }) as Goal;

describe('GoalsService', () => {
  let service: GoalsService;
  let repository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        { provide: getRepositoryToken(Goal), useValue: repository },
      ],
    }).compile();

    service = module.get(GoalsService);
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────
  // create
  // ──────────────────────────────────────────
  describe('create', () => {
    const baseDto = { exerciseId: '10', targetWeightKg: 100 };

    it('succeeds when targetWeightKg only', async () => {
      mockGetJstToday.mockReturnValue('2026-06-24');
      const saved = { ...mockGoal(), targetWeightKg: 100 };
      repository.create.mockReturnValue(saved);
      repository.save.mockResolvedValue(saved);

      await expect(
        service.create({ exerciseId: '10', targetWeightKg: 100 }, 'user1'),
      ).resolves.toBeDefined();
    });

    it('succeeds when targetReps only', async () => {
      mockGetJstToday.mockReturnValue('2026-06-24');
      const saved = { ...mockGoal(), targetReps: 10 };
      repository.create.mockReturnValue(saved);
      repository.save.mockResolvedValue(saved);

      await expect(
        service.create({ exerciseId: '10', targetReps: 10 }, 'user1'),
      ).resolves.toBeDefined();
    });

    it('succeeds when both targetWeightKg and targetReps are specified', async () => {
      mockGetJstToday.mockReturnValue('2026-06-24');
      const saved = { ...mockGoal(), targetWeightKg: 80, targetReps: 8 };
      repository.create.mockReturnValue(saved);
      repository.save.mockResolvedValue(saved);

      await expect(
        service.create(
          { exerciseId: '10', targetWeightKg: 80, targetReps: 8 },
          'user1',
        ),
      ).resolves.toBeDefined();
    });

    it('throws BadRequestException when both targetWeightKg and targetReps are null/undefined', async () => {
      mockGetJstToday.mockReturnValue('2026-06-24');

      await expect(
        service.create({ exerciseId: '10' }, 'user1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when targetWeightKg is null and targetReps is undefined', async () => {
      mockGetJstToday.mockReturnValue('2026-06-24');

      await expect(
        service.create(
          {
            exerciseId: '10',
            targetWeightKg: undefined,
            targetReps: undefined,
          },
          'user1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    // deadline JST バリデーション
    it('succeeds when deadline is exactly JST today', async () => {
      mockGetJstToday.mockReturnValue('2026-06-24');
      const saved = { ...mockGoal(), deadline: '2026-06-24' };
      repository.create.mockReturnValue(saved);
      repository.save.mockResolvedValue(saved);

      await expect(
        service.create({ ...baseDto, deadline: '2026-06-24' }, 'user1'),
      ).resolves.toBeDefined();
    });

    it('succeeds when deadline is JST tomorrow', async () => {
      mockGetJstToday.mockReturnValue('2026-06-24');
      const saved = { ...mockGoal(), deadline: '2026-06-25' };
      repository.create.mockReturnValue(saved);
      repository.save.mockResolvedValue(saved);

      await expect(
        service.create({ ...baseDto, deadline: '2026-06-25' }, 'user1'),
      ).resolves.toBeDefined();
    });

    it('throws BadRequestException when deadline is JST yesterday', async () => {
      mockGetJstToday.mockReturnValue('2026-06-24');

      await expect(
        service.create({ ...baseDto, deadline: '2026-06-23' }, 'user1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('uses JST date even when UTC and JST differ (UTC 23:30 = JST next day)', async () => {
      // UTC 2026-06-24T23:30 = JST 2026-06-25 08:30
      // JST today = 2026-06-25、deadline '2026-06-24' は過去日として拒否
      mockGetJstToday.mockReturnValue('2026-06-25');

      await expect(
        service.create({ ...baseDto, deadline: '2026-06-24' }, 'user1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts JST today even when it differs from UTC date', async () => {
      // JST today = 2026-06-25、deadline '2026-06-25' は本日として許可
      mockGetJstToday.mockReturnValue('2026-06-25');
      const saved = { ...mockGoal(), deadline: '2026-06-25' };
      repository.create.mockReturnValue(saved);
      repository.save.mockResolvedValue(saved);

      await expect(
        service.create({ ...baseDto, deadline: '2026-06-25' }, 'user1'),
      ).resolves.toBeDefined();
    });

    it('succeeds when no deadline is specified', async () => {
      mockGetJstToday.mockReturnValue('2026-06-24');
      const saved = mockGoal();
      repository.create.mockReturnValue(saved);
      repository.save.mockResolvedValue(saved);

      await expect(service.create(baseDto, 'user1')).resolves.toBeDefined();
    });
  });

  // ──────────────────────────────────────────
  // update
  // ──────────────────────────────────────────
  describe('update', () => {
    it('throws NotFoundException when goal not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update('1', { status: 'ACHIEVED' }, 'user1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when updating another user goal', async () => {
      repository.findOne.mockResolvedValue(mockGoal('user2'));

      await expect(
        service.update('1', { status: 'ACHIEVED' }, 'user1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when goal is already completed', async () => {
      repository.findOne.mockResolvedValue(mockGoal('user1', 'ACHIEVED'));

      await expect(
        service.update('1', { status: 'ABANDONED' }, 'user1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets achievedAt when status becomes ACHIEVED', async () => {
      repository.findOne
        .mockResolvedValueOnce(mockGoal('user1'))
        .mockResolvedValueOnce({ ...mockGoal('user1'), status: 'ACHIEVED' });
      repository.update.mockResolvedValue(undefined);

      await service.update('1', { status: 'ACHIEVED' }, 'user1');

      const updateCall = (
        repository.update.mock.calls[0] as [string, Partial<Goal>]
      )[1];
      expect(updateCall.status).toBe('ACHIEVED');
      expect(updateCall.achievedAt).toBeInstanceOf(Date);
    });

    it('throws BadRequestException when deadline is past in JST', async () => {
      mockGetJstToday.mockReturnValue('2026-06-24');
      repository.findOne.mockResolvedValue(mockGoal('user1'));

      await expect(
        service.update('1', { deadline: '2026-06-23' }, 'user1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('succeeds when deadline is today in JST', async () => {
      mockGetJstToday.mockReturnValue('2026-06-24');
      repository.findOne
        .mockResolvedValueOnce(mockGoal('user1'))
        .mockResolvedValueOnce({
          ...mockGoal('user1'),
          deadline: '2026-06-24',
        });
      repository.update.mockResolvedValue(undefined);

      await expect(
        service.update('1', { deadline: '2026-06-24' }, 'user1'),
      ).resolves.toBeDefined();
    });
  });

  // ──────────────────────────────────────────
  // remove
  // ──────────────────────────────────────────
  describe('remove', () => {
    it('throws ForbiddenException when deleting another user goal', async () => {
      repository.findOne.mockResolvedValue(mockGoal('user2'));

      await expect(service.remove('1', 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
