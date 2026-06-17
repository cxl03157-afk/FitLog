import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WorkoutPostDetailPage from '../pages/WorkoutPostDetailPage';
import * as AuthContextModule from '../contexts/AuthContext';
import * as workoutPostsApi from '../api/workoutPosts';
import type { WorkoutPost } from '../types/workout';

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal<typeof AuthContextModule>();
  return { ...mod, useAuth: vi.fn() };
});

vi.mock('../api/workoutPosts', () => ({
  fetchWorkoutPosts: vi.fn(),
  fetchWorkoutPost: vi.fn(),
  createWorkoutPost: vi.fn(),
  deleteWorkoutPost: vi.fn(),
}));

const mockUseAuth = vi.mocked(AuthContextModule.useAuth);
const mockFetchWorkoutPost = vi.mocked(workoutPostsApi.fetchWorkoutPost);

const POST_OWNER_ID = '10';

const mockPost: WorkoutPost = {
  id: '1',
  userId: POST_OWNER_ID,
  title: 'ベンチプレスの日',
  note: 'よかった',
  trainedOn: '2026-06-17',
  createdAt: '2026-06-17T10:00:00Z',
  user: { id: POST_OWNER_ID, username: 'owner', displayName: 'オーナー' },
  workoutExercises: [
    {
      id: '1',
      exerciseId: '1',
      orderIndex: 0,
      exercise: { id: '1', name: 'ベンチプレス', category: '胸', description: null },
      sets: [{ id: '1', setNumber: 1, weightKg: 80, reps: 5, isPr: true, memo: null }],
    },
  ],
};

const renderDetail = () =>
  render(
    <MemoryRouter initialEntries={['/workout-posts/1']}>
      <Routes>
        <Route path="/workout-posts/:id" element={<WorkoutPostDetailPage />} />
        <Route path="/" element={<div>timeline</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WorkoutPostDetailPage', () => {
  it('renders post details after data loads', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '99', username: 'other', displayName: 'Other', email: 'o@test.com' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    mockFetchWorkoutPost.mockResolvedValue(mockPost);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('ベンチプレスの日')).toBeTruthy();
    });
    expect(screen.getByText('ベンチプレス')).toBeTruthy();
    expect(screen.getByText('よかった')).toBeTruthy();
  });

  it('shows delete button for own post', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: POST_OWNER_ID, username: 'owner', displayName: 'オーナー', email: 'o@test.com' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    mockFetchWorkoutPost.mockResolvedValue(mockPost);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('削除する')).toBeTruthy();
    });
  });

  it('does not show delete button for other users post', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '99', username: 'other', displayName: 'Other', email: 'o@test.com' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    mockFetchWorkoutPost.mockResolvedValue(mockPost);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('ベンチプレスの日')).toBeTruthy();
    });
    expect(screen.queryByText('削除する')).toBeNull();
  });

  it('shows error state on fetch failure', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    mockFetchWorkoutPost.mockRejectedValue(new Error('Not found'));

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText(/投稿の取得に失敗しました/)).toBeTruthy();
    });
  });
});
