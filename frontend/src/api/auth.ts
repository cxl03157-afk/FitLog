import { apiClient } from './client';
import type { AuthResponse } from '../types/auth';

export const login = (email: string, password: string) =>
  apiClient
    .post<AuthResponse>('/api/auth/login', { email, password })
    .then((r) => r.data);

export const register = (
  username: string,
  displayName: string,
  email: string,
  password: string,
) =>
  apiClient
    .post<AuthResponse>('/api/auth/register', {
      username,
      displayName,
      email,
      password,
    })
    .then((r) => r.data);

export const logout = () =>
  apiClient.post('/api/auth/logout').then(() => undefined);

export const refresh = () =>
  apiClient
    .post<AuthResponse>('/api/auth/refresh')
    .then((r) => r.data);
