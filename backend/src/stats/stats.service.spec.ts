import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExerciseSet } from '../exercise-sets/entities/exercise-set.entity';
import { WorkoutPost } from '../workout-posts/entities/workout-post.entity';
import { StatsService } from './stats.service';

const makeQb = (result: unknown[]) => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue(result),
});

describe('StatsService', () => {
  let service: StatsService;
  let postRepo: { createQueryBuilder: jest.Mock };
  let setRepo: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    postRepo = { createQueryBuilder: jest.fn() };
    setRepo = { createQueryBuilder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: getRepositoryToken(WorkoutPost), useValue: postRepo },
        { provide: getRepositoryToken(ExerciseSet), useValue: setRepo },
      ],
    }).compile();

    service = module.get(StatsService);
  });

  describe('getWeeklyStats', () => {
    it('returns weekly stats for user', async () => {
      const rows = [{ period: '2026-06-08', postCount: 3, totalVolume: 1500 }];
      postRepo.createQueryBuilder.mockReturnValue(makeQb(rows));

      const result = await service.getWeeklyStats('user1');

      expect(result).toEqual(rows);
    });
  });

  describe('getMonthlyStats', () => {
    it('returns monthly stats for user', async () => {
      const rows = [{ period: '2026-06', postCount: 12, totalVolume: 5000 }];
      postRepo.createQueryBuilder.mockReturnValue(makeQb(rows));

      const result = await service.getMonthlyStats('user1');

      expect(result).toEqual(rows);
    });
  });
});
