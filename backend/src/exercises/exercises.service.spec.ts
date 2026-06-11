import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise } from './entities/exercise.entity';
import { ExercisesService } from './exercises.service';

const mockExercise = (): Exercise => ({
  id: '1',
  name: 'ベンチプレス',
  category: '胸',
  description: null,
  createdAt: new Date(),
});

describe('ExercisesService', () => {
  let service: ExercisesService;
  let repository: jest.Mocked<Repository<Exercise>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        {
          provide: getRepositoryToken(Exercise),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ExercisesService);
    repository = module.get(getRepositoryToken(Exercise));
  });

  describe('findAll', () => {
    it('returns all exercises ordered by name', async () => {
      const exercises = [mockExercise()];
      repository.find.mockResolvedValue(exercises);

      const result = await service.findAll();

      expect(result).toEqual(exercises);
      expect(repository.find.mock.calls[0][0]).toEqual({
        order: { name: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('returns exercise when found', async () => {
      const exercise = mockExercise();
      repository.findOne.mockResolvedValue(exercise);

      const result = await service.findOne('1');

      expect(result).toEqual(exercise);
    });

    it('throws NotFoundException when exercise not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });
});
