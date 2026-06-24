export type GoalStatus = 'IN_PROGRESS' | 'ACHIEVED' | 'ABANDONED';

export interface GoalExercise {
  id: string;
  name: string;
  category: string;
}

export interface Goal {
  id: string;
  userId: string;
  exerciseId: string;
  exercise: GoalExercise;
  targetWeightKg: number | null;
  targetReps: number | null;
  deadline: string | null;
  status: GoalStatus;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalPayload {
  exerciseId: string;
  targetWeightKg?: number;
  targetReps?: number;
  deadline?: string;
}

export interface UpdateGoalPayload {
  status?: 'ACHIEVED' | 'ABANDONED';
  deadline?: string;
}
