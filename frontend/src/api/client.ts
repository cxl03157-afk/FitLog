import axios from 'axios';
import type { AuthResponse } from '../types/auth';

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const originalRequest = error.config;
    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      (originalRequest as { _retry?: boolean })._retry ||
      originalRequest.url === '/api/auth/refresh'
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<unknown>((resolve, reject) => {
        subscribeTokenRefresh((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        });
        void reject;
      });
    }

    (originalRequest as { _retry?: boolean })._retry = true;
    isRefreshing = true;

    try {
      const { data } = await apiClient.post<AuthResponse>('/api/auth/refresh');
      setAccessToken(data.accessToken);
      onRefreshed(data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(originalRequest);
    } catch {
      setAccessToken(null);
      window.location.href = '/login';
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);
