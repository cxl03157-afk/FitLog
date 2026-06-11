import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExerciseSet } from '../exercise-sets/entities/exercise-set.entity';
import { WorkoutPost } from '../workout-posts/entities/workout-post.entity';
import { WorkoutExercise } from './entities/workout-exercise.entity';
import { WorkoutExercisesService } from './workout-exercises.service';

describe('WorkoutExercisesService', () => {
  let service: WorkoutExercisesService;
  let weRepo: { findOne: jest.Mock };
  let setRepo: { create: jest.Mock; save: jest.Mock };
  let postRepo: jest.Mock;

  beforeEach(async () => {
    weRepo = { findOne: jest.fn() };
    setRepo = { create: jest.fn(), save: jest.fn() };
    postRepo = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutExercisesService,
        { provide: getRepositoryToken(WorkoutExercise), useValue: weRepo },
        { provide: getRepositoryToken(ExerciseSet), useValue: setRepo },
        { provide: getRepositoryToken(WorkoutPost), useValue: postRepo },
      ],
    }).compile();

    service = module.get(WorkoutExercisesService);
  });

  describe('addSet', () => {
    const dto = { setNumber: 1, weightKg: 60, reps: 10 };

    it('throws NotFoundException when workout exercise not found', async () => {
      weRepo.findOne.mockResolvedValue(null);

      await expect(service.addSet('1', dto, 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when adding set to another user exercise', async () => {
      weRepo.findOne.mockResolvedValue({
        id: '1',
        workoutPost: { userId: 'user2' },
      });

      await expect(service.addSet('1', dto, 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('creates set when owner', async () => {
      const mockSet = { id: '100', ...dto, workoutExerciseId: '1' };
      weRepo.findOne.mockResolvedValue({
        id: '1',
        workoutPost: { userId: 'user1' },
      });
      setRepo.create.mockReturnValue(mockSet);
      setRepo.save.mockResolvedValue(mockSet);

      const result = await service.addSet('1', dto, 'user1');

      expect(result).toEqual(mockSet);
    });
  });
});
