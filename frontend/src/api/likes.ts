import { apiClient } from './client';

export const addLike = (postId: string): Promise<void> =>
  apiClient.post(`/api/workout-posts/${postId}/likes`).then(() => undefined);

export const removeLike = (postId: string): Promise<void> =>
  apiClient.delete(`/api/workout-posts/${postId}/likes`).then(() => undefined);
