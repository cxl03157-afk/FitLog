import { apiClient } from './client';
import type { Exercise } from '../types/workout';

export const fetchExercises = (): Promise<Exercise[]> =>
  apiClient.get<Exercise[]>('/api/exercises').then((r) => r.data);
