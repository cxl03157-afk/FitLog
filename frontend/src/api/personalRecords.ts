import { apiClient } from './client';
import type {
  CreatePersonalRecordPayload,
  PersonalRecord,
  PersonalRecordCreated,
  PersonalRecordFilters,
  UpdatePersonalRecordPayload,
} from '../types/personalRecord';

export const fetchPersonalRecords = (
  filters?: PersonalRecordFilters,
): Promise<PersonalRecord[]> =>
  apiClient
    .get<PersonalRecord[]>('/api/personal-records', { params: filters })
    .then((r) => r.data);

export const fetchPersonalRecord = (id: string): Promise<PersonalRecord> =>
  apiClient
    .get<PersonalRecord>(`/api/personal-records/${id}`)
    .then((r) => r.data);

export const createPersonalRecord = (
  payload: CreatePersonalRecordPayload,
): Promise<PersonalRecordCreated> =>
  apiClient
    .post<PersonalRecordCreated>('/api/personal-records', payload)
    .then((r) => r.data);

export const updatePersonalRecord = (
  id: string,
  payload: UpdatePersonalRecordPayload,
): Promise<PersonalRecord> =>
  apiClient
    .put<PersonalRecord>(`/api/personal-records/${id}`, payload)
    .then((r) => r.data);

export const deletePersonalRecord = (id: string): Promise<void> =>
  apiClient.delete(`/api/personal-records/${id}`).then(() => undefined);
