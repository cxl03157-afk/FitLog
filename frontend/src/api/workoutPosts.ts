import { apiClient } from './client';
import type { CreateWorkoutPostDto, WorkoutPost, WorkoutPostsResponse } from '../types/workout';

export type FetchWorkoutPostsParams = {
  page?: number;
  limit?: number;
  feed?: 'all';
};

export const fetchWorkoutPosts = (params: FetchWorkoutPostsParams): Promise<WorkoutPostsResponse> =>
  apiClient.get<WorkoutPostsResponse>('/api/workout-posts', { params }).then((r) => r.data);

export const fetchWorkoutPost = (id: string): Promise<WorkoutPost> =>
  apiClient.get<WorkoutPost>(`/api/workout-posts/${id}`).then((r) => r.data);

export const createWorkoutPost = (dto: CreateWorkoutPostDto): Promise<WorkoutPost> =>
  apiClient.post<WorkoutPost>('/api/workout-posts', dto).then((r) => r.data);

export const deleteWorkoutPost = (id: string): Promise<void> =>
  apiClient.delete(`/api/workout-posts/${id}`).then(() => undefined);
