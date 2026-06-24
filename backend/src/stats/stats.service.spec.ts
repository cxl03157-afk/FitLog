import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExerciseSet } from '../exercise-sets/entities/exercise-set.entity';
import { WorkoutPost } from '../workout-posts/entities/workout-post.entity';
import { StatsService } from './stats.service';

// 2026-06-24 (水曜 UTC) を基準として固定: 今週の月曜 = 2026-06-22
const FIXED_TIME = new Date('2026-06-24T10:00:00.000Z');

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

  // ──────────────────────────────────────────
  // getWeeklyStats
  // ──────────────────────────────────────────
  describe('getWeeklyStats', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(FIXED_TIME);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('always returns 12 periods', async () => {
      postRepo.createQueryBuilder.mockReturnValue(makeQb([]));
      const result = await service.getWeeklyStats('user1');
      expect(result).toHaveLength(12);
    });

    it('zero-fills missing weeks', async () => {
      // DB から 1 件だけ返す
      const dbRows = [
        { period: '2026-06-22', postCount: 3, totalVolume: 1500 },
      ];
      postRepo.createQueryBuilder.mockReturnValue(makeQb(dbRows));

      const result = await service.getWeeklyStats('user1');

      expect(result).toHaveLength(12);
      // データがない週は 0 補完
      expect(result[0].postCount).toBe(0);
      expect(result[0].totalVolume).toBe(0);
      // 最新週にデータあり
      expect(result[11].period).toBe('2026-06-22');
      expect(result[11].postCount).toBe(3);
      expect(result[11].totalVolume).toBe(1500);
    });

    it('returns periods in ascending order (oldest first)', async () => {
      postRepo.createQueryBuilder.mockReturnValue(makeQb([]));
      const result = await service.getWeeklyStats('user1');
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].period < result[i].period).toBe(true);
      }
    });

    it('period[0] is 11 weeks before this Monday (2026-04-06)', async () => {
      postRepo.createQueryBuilder.mockReturnValue(makeQb([]));
      const result = await service.getWeeklyStats('user1');
      // 2026-06-22 − 11週 = 2026-04-06
      expect(result[0].period).toBe('2026-04-06');
    });

    it('period[11] is this Monday (2026-06-22)', async () => {
      postRepo.createQueryBuilder.mockReturnValue(makeQb([]));
      const result = await service.getWeeklyStats('user1');
      expect(result[11].period).toBe('2026-06-22');
    });

    it('handles year boundary correctly', async () => {
      // 2026-01-07 (水曜) → 今週の月曜 = 2026-01-05
      jest.setSystemTime(new Date('2026-01-07T10:00:00.000Z'));
      postRepo.createQueryBuilder.mockReturnValue(makeQb([]));

      const result = await service.getWeeklyStats('user1');

      expect(result).toHaveLength(12);
      // period[0] は 2025 年内
      expect(result[0].period.startsWith('2025-')).toBe(true);
      // period[11] は 2026-01-05
      expect(result[11].period).toBe('2026-01-05');
    });
  });

  // ──────────────────────────────────────────
  // getMonthlyStats
  // ──────────────────────────────────────────
  describe('getMonthlyStats', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(FIXED_TIME);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('always returns 12 periods', async () => {
      postRepo.createQueryBuilder.mockReturnValue(makeQb([]));
      const result = await service.getMonthlyStats('user1');
      expect(result).toHaveLength(12);
    });

    it('zero-fills missing months', async () => {
      const dbRows = [{ period: '2026-06', postCount: 10, totalVolume: 5000 }];
      postRepo.createQueryBuilder.mockReturnValue(makeQb(dbRows));

      const result = await service.getMonthlyStats('user1');

      expect(result).toHaveLength(12);
      expect(result[0].postCount).toBe(0);
      expect(result[0].totalVolume).toBe(0);
      expect(result[11].period).toBe('2026-06');
      expect(result[11].postCount).toBe(10);
    });

    it('returns periods in ascending order (oldest first)', async () => {
      postRepo.createQueryBuilder.mockReturnValue(makeQb([]));
      const result = await service.getMonthlyStats('user1');
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].period < result[i].period).toBe(true);
      }
    });

    it('period[0] is 11 months before current month (2025-07)', async () => {
      postRepo.createQueryBuilder.mockReturnValue(makeQb([]));
      const result = await service.getMonthlyStats('user1');
      expect(result[0].period).toBe('2025-07');
    });

    it('period[11] is current month (2026-06)', async () => {
      postRepo.createQueryBuilder.mockReturnValue(makeQb([]));
      const result = await service.getMonthlyStats('user1');
      expect(result[11].period).toBe('2026-06');
    });

    it('handles year boundary in months', async () => {
      // 2026-02-15 → 12ヶ月: 2025-03〜2026-02
      jest.setSystemTime(new Date('2026-02-15T10:00:00.000Z'));
      postRepo.createQueryBuilder.mockReturnValue(makeQb([]));

      const result = await service.getMonthlyStats('user1');

      expect(result).toHaveLength(12);
      expect(result[0].period).toBe('2025-03');
      expect(result[11].period).toBe('2026-02');
    });
  });

  // ──────────────────────────────────────────
  // getExerciseStats
  // ──────────────────────────────────────────
  describe('getExerciseStats', () => {
    it('returns metric: weight when weight > 0 records exist', async () => {
      // DB は DESC で返す
      const dbRows = [
        {
          date: '2026-06-20',
          exerciseName: 'ベンチプレス',
          maxWeightKg: 80,
          maxReps: 8,
        },
        {
          date: '2026-06-15',
          exerciseName: 'ベンチプレス',
          maxWeightKg: 75,
          maxReps: 10,
        },
      ];
      setRepo.createQueryBuilder.mockReturnValue(makeQb(dbRows));

      const result = await service.getExerciseStats('user1', '1');

      expect(result.metric).toBe('weight');
      expect(result.unit).toBe('kg');
      expect(result.exerciseName).toBe('ベンチプレス');
      // 昇順で返る
      expect(result.records).toEqual([
        { date: '2026-06-15', value: 75 },
        { date: '2026-06-20', value: 80 },
      ]);
    });

    it('returns metric: reps when all weight_kg = 0 (bodyweight)', async () => {
      const dbRows = [
        {
          date: '2026-06-20',
          exerciseName: '懸垂',
          maxWeightKg: 0,
          maxReps: 12,
        },
        {
          date: '2026-06-15',
          exerciseName: '懸垂',
          maxWeightKg: 0,
          maxReps: 10,
        },
      ];
      setRepo.createQueryBuilder.mockReturnValue(makeQb(dbRows));

      const result = await service.getExerciseStats('user1', '2');

      expect(result.metric).toBe('reps');
      expect(result.unit).toBe('reps');
      expect(result.records).toEqual([
        { date: '2026-06-15', value: 10 },
        { date: '2026-06-20', value: 12 },
      ]);
    });

    it('returns metric: none when no records', async () => {
      setRepo.createQueryBuilder.mockReturnValue(makeQb([]));

      const result = await service.getExerciseStats('user1', '3');

      expect(result.metric).toBe('none');
      expect(result.unit).toBeNull();
      expect(result.records).toEqual([]);
    });

    it('prioritizes weight when bodyweight and weighted records are mixed', async () => {
      const dbRows = [
        {
          date: '2026-06-20',
          exerciseName: '懸垂',
          maxWeightKg: 10,
          maxReps: 8,
        }, // 加重
        {
          date: '2026-06-15',
          exerciseName: '懸垂',
          maxWeightKg: 0,
          maxReps: 12,
        }, // 自重
        {
          date: '2026-06-10',
          exerciseName: '懸垂',
          maxWeightKg: 5,
          maxReps: 10,
        }, // 加重
      ];
      setRepo.createQueryBuilder.mockReturnValue(makeQb(dbRows));

      const result = await service.getExerciseStats('user1', '2');

      expect(result.metric).toBe('weight');
      // 加重記録のある日だけ含む（自重のみの 2026-06-15 を除外）
      expect(result.records).toHaveLength(2);
      expect(result.records.map((r) => r.date)).not.toContain('2026-06-15');
      // 昇順
      expect(result.records[0].date).toBe('2026-06-10');
      expect(result.records[1].date).toBe('2026-06-20');
    });

    it('excludes weight-0-only days from records when metric is weight', async () => {
      const dbRows = [
        {
          date: '2026-06-20',
          exerciseName: 'Bench',
          maxWeightKg: 80,
          maxReps: 8,
        },
        {
          date: '2026-06-15',
          exerciseName: 'Bench',
          maxWeightKg: 0,
          maxReps: 10,
        }, // 除外
      ];
      setRepo.createQueryBuilder.mockReturnValue(makeQb(dbRows));

      const result = await service.getExerciseStats('user1', '1');

      expect(result.metric).toBe('weight');
      expect(result.records).toHaveLength(1);
      expect(result.records[0].date).toBe('2026-06-20');
    });

    it('excludes reps-0-only days from records when metric is reps', async () => {
      const dbRows = [
        { date: '2026-06-20', exerciseName: 'BW', maxWeightKg: 0, maxReps: 10 },
        { date: '2026-06-15', exerciseName: 'BW', maxWeightKg: 0, maxReps: 0 }, // 除外
      ];
      setRepo.createQueryBuilder.mockReturnValue(makeQb(dbRows));

      const result = await service.getExerciseStats('user1', '2');

      expect(result.metric).toBe('reps');
      expect(result.records).toHaveLength(1);
      expect(result.records[0].date).toBe('2026-06-20');
    });

    it('correctly converts string DB values to numbers', async () => {
      // pg ドライバーが decimal を文字列で返すケース
      const dbRows = [
        {
          date: '2026-06-20',
          exerciseName: 'Bench',
          maxWeightKg: '80.50',
          maxReps: '8',
        },
        {
          date: '2026-06-15',
          exerciseName: 'Bench',
          maxWeightKg: '75.00',
          maxReps: '10',
        },
      ];
      setRepo.createQueryBuilder.mockReturnValue(makeQb(dbRows));

      const result = await service.getExerciseStats('user1', '1');

      expect(result.metric).toBe('weight');
      expect(result.records[0].value).toBe(75);
      expect(result.records[1].value).toBe(80.5);
    });

    it('returns records in ascending date order (DB returns DESC)', async () => {
      const dbRows = [
        {
          date: '2026-06-20',
          exerciseName: 'Bench',
          maxWeightKg: 80,
          maxReps: 8,
        },
        {
          date: '2026-06-15',
          exerciseName: 'Bench',
          maxWeightKg: 75,
          maxReps: 10,
        },
        {
          date: '2026-06-10',
          exerciseName: 'Bench',
          maxWeightKg: 70,
          maxReps: 12,
        },
      ];
      setRepo.createQueryBuilder.mockReturnValue(makeQb(dbRows));

      const result = await service.getExerciseStats('user1', '1');

      expect(result.records[0].date).toBe('2026-06-10');
      expect(result.records[1].date).toBe('2026-06-15');
      expect(result.records[2].date).toBe('2026-06-20');
    });

    it('passes limit parameter to the query', async () => {
      const qb = makeQb([]);
      setRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getExerciseStats('user1', '1', 15);

      expect(qb.limit).toHaveBeenCalledWith(15);
    });

    it('uses default limit of 30 when not specified', async () => {
      const qb = makeQb([]);
      setRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getExerciseStats('user1', '1');

      expect(qb.limit).toHaveBeenCalledWith(30);
    });
  });
});
