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

export interface ExerciseStat {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number;
  maxReps: number;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(WorkoutPost)
    private readonly workoutPostRepository: Repository<WorkoutPost>,
    @InjectRepository(ExerciseSet)
    private readonly exerciseSetRepository: Repository<ExerciseSet>,
  ) {}

  async getWeeklyStats(userId: string): Promise<PeriodStat[]> {
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
      .groupBy("DATE_TRUNC('week', post.trained_on)")
      .orderBy("DATE_TRUNC('week', post.trained_on)", 'DESC')
      .limit(12)
      .getRawMany<{ period: string; postCount: number; totalVolume: number }>();

    return rows;
  }

  async getMonthlyStats(userId: string): Promise<PeriodStat[]> {
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
      .groupBy("DATE_TRUNC('month', post.trained_on)")
      .orderBy("DATE_TRUNC('month', post.trained_on)", 'DESC')
      .limit(12)
      .getRawMany<{ period: string; postCount: number; totalVolume: number }>();

    return rows;
  }

  async getExerciseStats(
    userId: string,
    exerciseId: string,
  ): Promise<ExerciseStat[]> {
    const rows = await this.exerciseSetRepository
      .createQueryBuilder('es')
      .select('we.exercise_id', 'exerciseId')
      .addSelect('exercise.name', 'exerciseName')
      .addSelect('MAX(es.weight_kg)::float', 'maxWeightKg')
      .addSelect('MAX(es.reps)::int', 'maxReps')
      .innerJoin('es.workoutExercise', 'we')
      .innerJoin('we.exercise', 'exercise')
      .innerJoin('we.workoutPost', 'post')
      .where('post.user_id = :userId', { userId })
      .andWhere('we.exercise_id = :exerciseId', { exerciseId })
      .groupBy('we.exercise_id')
      .addGroupBy('exercise.name')
      .getRawMany<ExerciseStat>();

    return rows;
  }
}
