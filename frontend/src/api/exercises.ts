import { apiClient } from './client';
import type { CreateExerciseDto, Exercise, UpdateExerciseDto } from '../types/workout';

export const fetchExercises = (): Promise<Exercise[]> =>
  apiClient.get<Exercise[]>('/api/exercises').then((r) => r.data);

export const createExercise = (dto: CreateExerciseDto): Promise<Exercise> =>
  apiClient.post<Exercise>('/api/exercises', dto).then((r) => r.data);

export const updateExercise = (id: string, dto: UpdateExerciseDto): Promise<Exercise> =>
  apiClient.patch<Exercise>(`/api/exercises/${id}`, dto).then((r) => r.data);

export const deleteExercise = (id: string): Promise<void> =>
  apiClient.delete(`/api/exercises/${id}`).then(() => undefined);
