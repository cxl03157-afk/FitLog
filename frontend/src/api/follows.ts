import { apiClient } from './client';
import type { FollowUser } from '../types/user';

export const followUser = (userId: string): Promise<void> =>
  apiClient.post(`/api/follows/${userId}`).then(() => undefined);

export const unfollowUser = (userId: string): Promise<void> =>
  apiClient.delete(`/api/follows/${userId}`).then(() => undefined);

export const getFollowers = (userId: string): Promise<FollowUser[]> =>
  apiClient.get<FollowUser[]>(`/api/users/${userId}/followers`).then((r) => r.data);

export const getFollowing = (userId: string): Promise<FollowUser[]> =>
  apiClient.get<FollowUser[]>(`/api/users/${userId}/following`).then((r) => r.data);
