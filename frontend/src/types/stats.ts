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
