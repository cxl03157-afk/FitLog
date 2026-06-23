import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TimelinePage from '../pages/TimelinePage';
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
const mockFetchWorkoutPosts = vi.mocked(workoutPostsApi.fetchWorkoutPosts);

vi.mock('../api/likes', () => ({
  addLike: vi.fn(),
  removeLike: vi.fn(),
}));

const mockPost: WorkoutPost = {
  id: '1',
  userId: '10',
  title: 'テスト投稿',
  note: null,
  trainedOn: '2026-06-17',
  createdAt: '2026-06-17T10:00:00Z',
  likeCount: 0,
  commentCount: 0,
  isLiked: false,
  user: { id: '10', username: 'testuser', displayName: 'テストユーザー' },
  workoutExercises: [
    {
      id: '1',
      exerciseId: '1',
      orderIndex: 0,
      exercise: { id: '1', name: 'ベンチプレス', category: '胸', description: null },
      sets: [{ id: '1', setNumber: 1, weightKg: 60, reps: 10, isPr: false, memo: null }],
    },
  ],
  postImages: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { id: '1', username: 'user', displayName: 'User', email: 'u@test.com', avatarUrl: null, bio: null },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateCurrentUser: vi.fn(),
  });
});

const renderTimeline = () =>
  render(
    <MemoryRouter>
      <TimelinePage />
    </MemoryRouter>,
  );

describe('TimelinePage', () => {
  it('shows loading state initially', () => {
    mockFetchWorkoutPosts.mockReturnValue(new Promise(() => {}));
    renderTimeline();
    expect(screen.getByText('読み込み中...')).toBeTruthy();
  });

  it('renders post list after data loads', async () => {
    mockFetchWorkoutPosts.mockResolvedValue({ data: [mockPost], total: 1 });
    renderTimeline();
    await waitFor(() => {
      expect(screen.getByText('テスト投稿')).toBeTruthy();
    });
    expect(screen.getByText('テストユーザー')).toBeTruthy();
  });

  it('shows empty state when no posts', async () => {
    mockFetchWorkoutPosts.mockResolvedValue({ data: [], total: 0 });
    renderTimeline();
    await waitFor(() => {
      expect(screen.getByText(/まだ投稿がありません/)).toBeTruthy();
    });
  });

  it('shows error state on fetch failure', async () => {
    mockFetchWorkoutPosts.mockRejectedValue(new Error('Network error'));
    renderTimeline();
    await waitFor(() => {
      expect(screen.getByText(/投稿の取得に失敗しました/)).toBeTruthy();
    });
  });
});
