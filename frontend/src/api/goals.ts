import { apiClient } from './client';
import type { CreateGoalPayload, Goal, GoalStatus, UpdateGoalPayload } from '../types/goal';

export const getGoals = (status?: GoalStatus): Promise<Goal[]> =>
  apiClient
    .get<Goal[]>('/api/goals', { params: status !== undefined ? { status } : {} })
    .then((r) => r.data);

export const createGoal = (payload: CreateGoalPayload): Promise<Goal> =>
  apiClient.post<Goal>('/api/goals', payload).then((r) => r.data);

export const updateGoal = (id: string, payload: UpdateGoalPayload): Promise<Goal> =>
  apiClient.put<Goal>(`/api/goals/${id}`, payload).then((r) => r.data);

export const deleteGoal = (id: string): Promise<void> =>
  apiClient.delete(`/api/goals/${id}`).then(() => undefined);
