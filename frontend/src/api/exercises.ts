import { apiClient } from './client';
import type { CreateExerciseDto, Exercise } from '../types/workout';

export const fetchExercises = (): Promise<Exercise[]> =>
  apiClient.get<Exercise[]>('/api/exercises').then((r) => r.data);

export const createExercise = (dto: CreateExerciseDto): Promise<Exercise> =>
  apiClient.post<Exercise>('/api/exercises', dto).then((r) => r.data);
