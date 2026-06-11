import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExerciseSet } from './entities/exercise-set.entity';
import { ExerciseSetsService } from './exercise-sets.service';

const mockSet = (postUserId = 'user1') =>
  ({
    id: '1',
    weightKg: 60,
    reps: 10,
    isPr: false,
    memo: null,
    workoutExercise: {
      workoutPost: { userId: postUserId },
    },
  }) as unknown as ExerciseSet;

describe('ExerciseSetsService', () => {
  let service: ExerciseSetsService;
  let repository: { findOne: jest.Mock; update: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    repository = { findOne: jest.fn(), update: jest.fn(), delete: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExerciseSetsService,
        { provide: getRepositoryToken(ExerciseSet), useValue: repository },
      ],
    }).compile();

    service = module.get(ExerciseSetsService);
  });

  describe('update', () => {
    it('throws NotFoundException when set not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('1', { reps: 5 }, 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when updating another user set', async () => {
      repository.findOne.mockResolvedValue(mockSet('user2'));

      await expect(service.update('1', { reps: 5 }, 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('updates set when owner', async () => {
      const set = mockSet('user1');
      repository.findOne
        .mockResolvedValueOnce(set)
        .mockResolvedValueOnce({ ...set, reps: 5 });
      repository.update.mockResolvedValue(undefined);

      const result = await service.update('1', { reps: 5 }, 'user1');

      expect(repository.update).toHaveBeenCalledWith('1', { reps: 5 });
      expect(result.reps).toBe(5);
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException when deleting another user set', async () => {
      repository.findOne.mockResolvedValue(mockSet('user2'));

      await expect(service.remove('1', 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes set when owner', async () => {
      repository.findOne.mockResolvedValue(mockSet('user1'));
      repository.delete.mockResolvedValue(undefined);

      await service.remove('1', 'user1');

      expect(repository.delete).toHaveBeenCalledWith('1');
    });
  });
});
