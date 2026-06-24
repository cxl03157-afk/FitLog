import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExerciseSet } from '../exercise-sets/entities/exercise-set.entity';
import { WorkoutPost } from '../workout-posts/entities/workout-post.entity';

export interface PeriodStat {
  period: string;
  postCount: number;
  totalVolume: number;
}

export type ExerciseMetric = 'weight' | 'reps' | 'none';

export interface ExerciseStatPoint {
  date: string;
  value: number;
}

export interface ExerciseStatResponse {
  exerciseId: string;
  exerciseName: string;
  metric: ExerciseMetric;
  unit: 'kg' | 'reps' | null;
  records: ExerciseStatPoint[];
}

type RawExerciseRow = {
  date: string;
  exerciseName: string;
  maxWeightKg: string | number;
  maxReps: string | number;
};

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(WorkoutPost)
    private readonly workoutPostRepository: Repository<WorkoutPost>,
    @InjectRepository(ExerciseSet)
    private readonly exerciseSetRepository: Repository<ExerciseSet>,
  ) {}

  // 直近 count 週の月曜日リスト（昇順）
  private generateWeekPeriods(count: number): string[] {
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon..6=Sat
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisMondayMs = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysToMonday,
    );

    const periods: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const ms = thisMondayMs - i * 7 * 24 * 60 * 60 * 1000;
      const d = new Date(ms);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      periods.push(`${y}-${m}-${day}`);
    }
    return periods;
  }

  // 直近 count ヶ月のリスト（昇順、YYYY-MM）
  private generateMonthPeriods(count: number): string[] {
    const now = new Date();
    const curYear = now.getUTCFullYear();
    const curMonth = now.getUTCMonth() + 1; // 1-12

    const periods: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
      let month = curMonth - i;
      let year = curYear;
      while (month <= 0) {
        month += 12;
        year--;
      }
      periods.push(`${year}-${String(month).padStart(2, '0')}`);
    }
    return periods;
  }

  async getWeeklyStats(userId: string): Promise<PeriodStat[]> {
    const periods = this.generateWeekPeriods(12);
    const startDate = periods[0]; // 最古の月曜日

    const rows = await this.workoutPostRepository
      .createQueryBuilder('post')
      .select(
        "TO_CHAR(DATE_TRUNC('week', post.trained_on), 'YYYY-MM-DD')",
        'period',
      )
      .addSelect('COUNT(DISTINCT post.id)::int', 'postCount')
      .addSelect(
        'COALESCE(SUM(es.weight_kg * es.reps), 0)::float',
        'totalVolume',
      )
      .leftJoin('post.workoutExercises', 'we')
      .leftJoin('we.sets', 'es')
      .where('post.user_id = :userId', { userId })
      .andWhere('post.trained_on >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('week', post.trained_on)")
      .orderBy("DATE_TRUNC('week', post.trained_on)", 'ASC')
      .getRawMany<{ period: string; postCount: number; totalVolume: number }>();

    const rowMap = new Map(rows.map((r) => [r.period, r]));
    return periods.map(
      (period) =>
        rowMap.get(period) ?? { period, postCount: 0, totalVolume: 0 },
    );
  }

  async getMonthlyStats(userId: string): Promise<PeriodStat[]> {
    const periods = this.generateMonthPeriods(12);
    const startDate = periods[0] + '-01'; // 最古の月の1日

    const rows = await this.workoutPostRepository
      .createQueryBuilder('post')
      .select(
        "TO_CHAR(DATE_TRUNC('month', post.trained_on), 'YYYY-MM')",
        'period',
      )
      .addSelect('COUNT(DISTINCT post.id)::int', 'postCount')
      .addSelect(
        'COALESCE(SUM(es.weight_kg * es.reps), 0)::float',
        'totalVolume',
      )
      .leftJoin('post.workoutExercises', 'we')
      .leftJoin('we.sets', 'es')
      .where('post.user_id = :userId', { userId })
      .andWhere('post.trained_on >= :startDate', { startDate })
      .groupBy("DATE_TRUNC('month', post.trained_on)")
      .orderBy("DATE_TRUNC('month', post.trained_on)", 'ASC')
      .getRawMany<{ period: string; postCount: number; totalVolume: number }>();

    const rowMap = new Map(rows.map((r) => [r.period, r]));
    return periods.map(
      (period) =>
        rowMap.get(period) ?? { period, postCount: 0, totalVolume: 0 },
    );
  }

  async getExerciseStats(
    userId: string,
    exerciseId: string,
    limit = 30,
  ): Promise<ExerciseStatResponse> {
    const rows = await this.exerciseSetRepository
      .createQueryBuilder('es')
      .select("TO_CHAR(post.trained_on, 'YYYY-MM-DD')", 'date')
      .addSelect('MAX(exercise.name)', 'exerciseName')
      .addSelect('MAX(es.weight_kg)', 'maxWeightKg')
      .addSelect('MAX(es.reps)', 'maxReps')
      .innerJoin('es.workoutExercise', 'we')
      .innerJoin('we.exercise', 'exercise')
      .innerJoin('we.workoutPost', 'post')
      .where('post.user_id = :userId', { userId })
      .andWhere('we.exercise_id = :exerciseId', { exerciseId })
      .groupBy('post.trained_on')
      .orderBy('post.trained_on', 'DESC')
      .limit(limit)
      .getRawMany<RawExerciseRow>();

    const exerciseName = rows[0]?.exerciseName ?? '';

    if (rows.length === 0) {
      return {
        exerciseId,
        exerciseName,
        metric: 'none',
        unit: null,
        records: [],
      };
    }

    const hasWeightData = rows.some((r) => Number(r.maxWeightKg) > 0);

    if (hasWeightData) {
      const records = rows
        .filter((r) => Number(r.maxWeightKg) > 0)
        .reverse()
        .map((r) => ({ date: r.date, value: Number(r.maxWeightKg) }));
      return {
        exerciseId,
        exerciseName,
        metric: 'weight',
        unit: 'kg',
        records,
      };
    }

    const hasRepsData = rows.some((r) => Number(r.maxReps) >= 1);

    if (hasRepsData) {
      const records = rows
        .filter((r) => Number(r.maxReps) >= 1)
        .reverse()
        .map((r) => ({ date: r.date, value: Number(r.maxReps) }));
      return {
        exerciseId,
        exerciseName,
        metric: 'reps',
        unit: 'reps',
        records,
      };
    }

    return {
      exerciseId,
      exerciseName,
      metric: 'none',
      unit: null,
      records: [],
    };
  }
}
