import { apiClient } from './client';
import type { WorkoutComment } from '../types/workout';

export const fetchComments = (postId: string): Promise<WorkoutComment[]> =>
  apiClient
    .get<WorkoutComment[]>(`/api/workout-posts/${postId}/comments`)
    .then((r) => r.data);

export const createComment = (
  postId: string,
  content: string,
): Promise<WorkoutComment> =>
  apiClient
    .post<WorkoutComment>(`/api/workout-posts/${postId}/comments`, { content })
    .then((r) => r.data);

export const deleteComment = (commentId: string): Promise<void> =>
  apiClient.delete(`/api/comments/${commentId}`).then(() => undefined);
