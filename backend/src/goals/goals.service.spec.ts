import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Goal } from './entities/goal.entity';
import { GoalsService } from './goals.service';

const mockGoal = (userId = 'user1', status: Goal['status'] = 'IN_PROGRESS') =>
  ({ id: '1', userId, status, exerciseId: '10', targetWeightKg: null, targetReps: null, deadline: null, achievedAt: null }) as Goal;

describe('GoalsService', () => {
  let service: GoalsService;
  let repository: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock; update: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    repository = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), update: jest.fn(), delete: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        { provide: getRepositoryToken(Goal), useValue: repository },
      ],
    }).compile();

    service = module.get(GoalsService);
  });

  describe('update', () => {
    it('throws NotFoundException when goal not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('1', { status: 'ACHIEVED' }, 'user1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when updating another user goal', async () => {
      repository.findOne.mockResolvedValue(mockGoal('user2'));

      await expect(service.update('1', { status: 'ACHIEVED' }, 'user1')).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when goal is already completed', async () => {
      repository.findOne.mockResolvedValue(mockGoal('user1', 'ACHIEVED'));

      await expect(service.update('1', { status: 'ABANDONED' }, 'user1')).rejects.toThrow(BadRequestException);
    });

    it('sets achievedAt when status becomes ACHIEVED', async () => {
      repository.findOne.mockResolvedValueOnce(mockGoal('user1')).mockResolvedValueOnce({ ...mockGoal('user1'), status: 'ACHIEVED' });
      repository.update.mockResolvedValue(undefined);

      await service.update('1', { status: 'ACHIEVED' }, 'user1');

      const updateCall = repository.update.mock.calls[0][1] as Partial<Goal>;
      expect(updateCall.status).toBe('ACHIEVED');
      expect(updateCall.achievedAt).toBeInstanceOf(Date);
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException when deleting another user goal', async () => {
      repository.findOne.mockResolvedValue(mockGoal('user2'));

      await expect(service.remove('1', 'user1')).rejects.toThrow(ForbiddenException);
    });
  });
});
