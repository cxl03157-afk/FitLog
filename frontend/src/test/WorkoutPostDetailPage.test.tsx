import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WorkoutPostDetailPage from '../pages/WorkoutPostDetailPage';
import * as AuthContextModule from '../contexts/AuthContext';
import * as workoutPostsApi from '../api/workoutPosts';
import * as commentsApi from '../api/comments';
import * as likesApi from '../api/likes';
import type { WorkoutPost, WorkoutComment } from '../types/workout';

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

vi.mock('../api/comments', () => ({
  fetchComments: vi.fn(),
  createComment: vi.fn(),
  deleteComment: vi.fn(),
}));

vi.mock('../api/likes', () => ({
  addLike: vi.fn(),
  removeLike: vi.fn(),
}));

const mockUseAuth = vi.mocked(AuthContextModule.useAuth);
const mockFetchWorkoutPost = vi.mocked(workoutPostsApi.fetchWorkoutPost);
const mockFetchComments = vi.mocked(commentsApi.fetchComments);

const POST_OWNER_ID = '10';

const mockPost: WorkoutPost = {
  id: '1',
  userId: POST_OWNER_ID,
  title: 'ベンチプレスの日',
  note: 'よかった',
  trainedOn: '2026-06-18',
  createdAt: '2026-06-18T10:00:00Z',
  likeCount: 3,
  commentCount: 2,
  isLiked: false,
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
  postImages: [],
};

const mockComments: WorkoutComment[] = [
  {
    id: '100',
    workoutPostId: '1',
    userId: '99',
    content: 'すごい！',
    createdAt: '2026-06-18T11:00:00Z',
    user: { id: '99', username: 'other', displayName: 'Others' },
  },
  {
    id: '101',
    workoutPostId: '1',
    userId: POST_OWNER_ID,
    content: '自分のコメント',
    createdAt: '2026-06-18T12:00:00Z',
    user: { id: POST_OWNER_ID, username: 'owner', displayName: 'オーナー' },
  },
];

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
  mockFetchComments.mockResolvedValue([]);
  vi.mocked(likesApi.addLike).mockResolvedValue(undefined);
  vi.mocked(likesApi.removeLike).mockResolvedValue(undefined);
});

describe('WorkoutPostDetailPage', () => {
  it('renders post details after data loads', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '99', username: 'other', displayName: 'Other', email: 'o@test.com', avatarUrl: null, bio: null },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateCurrentUser: vi.fn(),
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
      user: { id: POST_OWNER_ID, username: 'owner', displayName: 'オーナー', email: 'o@test.com', avatarUrl: null, bio: null },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateCurrentUser: vi.fn(),
    });
    mockFetchWorkoutPost.mockResolvedValue(mockPost);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('削除する')).toBeTruthy();
    });
  });

  it('does not show delete button for other users post', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '99', username: 'other', displayName: 'Other', email: 'o@test.com', avatarUrl: null, bio: null },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateCurrentUser: vi.fn(),
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
      updateCurrentUser: vi.fn(),
    });
    mockFetchWorkoutPost.mockRejectedValue(new Error('Not found'));

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText(/投稿の取得に失敗しました/)).toBeTruthy();
    });
  });

  describe('comments', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: POST_OWNER_ID, username: 'owner', displayName: 'オーナー', email: 'o@test.com', avatarUrl: null, bio: null },
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        updateCurrentUser: vi.fn(),
      });
      mockFetchWorkoutPost.mockResolvedValue(mockPost);
      mockFetchComments.mockResolvedValue(mockComments);
    });

    it('renders comment list', async () => {
      renderDetail();

      await waitFor(() => {
        expect(screen.getByText('すごい！')).toBeTruthy();
      });
      expect(screen.getByText('自分のコメント')).toBeTruthy();
    });

    it('shows delete icon only for own comments', async () => {
      renderDetail();

      await waitFor(() => {
        expect(screen.getByText('すごい！')).toBeTruthy();
      });

      // 自分のコメント（comment id=101）には削除ボタン（🗑️）あり
      const deleteButtons = screen.getAllByLabelText('コメントを削除');
      expect(deleteButtons).toHaveLength(1);
    });
  });
});
