import { apiClient } from './client';
import type { ExerciseStatResponse, PeriodStat } from '../types/stats';

export const getWeeklyStats = (): Promise<PeriodStat[]> =>
  apiClient.get<PeriodStat[]>('/api/stats/weekly').then((r) => r.data);

export const getMonthlyStats = (): Promise<PeriodStat[]> =>
  apiClient.get<PeriodStat[]>('/api/stats/monthly').then((r) => r.data);

export const getExerciseStats = (
  exerciseId: string,
  limit?: number,
): Promise<ExerciseStatResponse> =>
  apiClient
    .get<ExerciseStatResponse>(`/api/stats/exercise/${exerciseId}`, {
      params: limit !== undefined ? { limit } : {},
    })
    .then((r) => r.data);
