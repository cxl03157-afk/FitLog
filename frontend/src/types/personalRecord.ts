export type PersonalRecordType = 'MAX_WEIGHT' | 'MAX_REPS';

export interface PersonalRecordExercise {
  id: string;
  name: string;
  category: string;
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  recordType: PersonalRecordType;
  weightKg: number | null;
  reps: number | null;
  achievedAt: string;
  note: string | null;
  sourceExerciseSetId: string | null;
  createdAt: string;
  updatedAt: string;
  exercise: PersonalRecordExercise;
}

// POST レスポンスは service.create() が save() を直接返すため exercise リレーションを含まない
export type PersonalRecordCreated = Omit<PersonalRecord, 'exercise'>;

export interface PersonalRecordFilters {
  exerciseId?: string;
  recordType?: PersonalRecordType;
}

export interface CreatePersonalRecordPayload {
  exerciseId: string;
  recordType: PersonalRecordType;
  weightKg?: number;
  reps?: number;
  achievedAt: string;
  note?: string | null;
}

export interface UpdatePersonalRecordPayload {
  weightKg?: number;
  reps?: number;
  achievedAt?: string;
  note?: string | null;
}
