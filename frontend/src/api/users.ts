import { apiClient } from './client';
import type { UserProfile, SearchUser } from '../types/user';

export type UpdateProfileDto = {
  displayName?: string;
  bio?: string | null;
};

export type UpdateProfileResponse = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
};

export type UploadAvatarResponse = {
  avatarKey: string;
  avatarUrl: string;
};

export const getProfile = (userId: string): Promise<UserProfile> =>
  apiClient.get<UserProfile>(`/api/users/${userId}`).then((r) => r.data);

export const searchUsers = (username: string, limit?: number): Promise<SearchUser[]> =>
  apiClient
    .get<SearchUser[]>('/api/users/search', { params: { username, limit } })
    .then((r) => r.data);

export const updateProfile = (dto: UpdateProfileDto): Promise<UpdateProfileResponse> =>
  apiClient.patch<UpdateProfileResponse>('/api/users/me/profile', dto).then((r) => r.data);

export const uploadAvatar = (file: File): Promise<UploadAvatarResponse> => {
  const formData = new FormData();
  formData.append('avatar', file);
  return apiClient
    .patch<UploadAvatarResponse>('/api/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};
