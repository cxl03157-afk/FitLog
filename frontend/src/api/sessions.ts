import { apiClient } from './client';

export type SessionInfo = {
  sessionId: string;
  deviceName: string | null;
  userAgent: string;
  ipAddress: string;
  lastUsedAt: string;
  isCurrent: boolean;
};

export const getSessions = (): Promise<SessionInfo[]> =>
  apiClient.get<SessionInfo[]>('/api/auth/sessions').then((r) => r.data);

export const revokeSession = (sessionId: string): Promise<void> =>
  apiClient.delete(`/api/auth/sessions/${sessionId}`).then(() => undefined);

export const revokeAllOtherSessions = (): Promise<void> =>
  apiClient.delete('/api/auth/sessions').then(() => undefined);
