import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
const mockAddLike = vi.mocked(likesApi.addLike);
const mockRemoveLike = vi.mocked(likesApi.removeLike);

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
      exercise: { id: '1', name: 'ベンチプレス', category: '胸', description: null, userId: null },
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

  describe('like initial state (Bug 1)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: '99', username: 'other', displayName: 'Other', email: 'o@test.com', avatarUrl: null, bio: null },
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        updateCurrentUser: vi.fn(),
      });
      mockFetchComments.mockResolvedValue([]);
    });

    it('LikeSection is not mounted while post is loading', async () => {
      let resolvePost!: (p: WorkoutPost) => void;
      mockFetchWorkoutPost.mockReturnValue(new Promise<WorkoutPost>((r) => { resolvePost = r; }));

      renderDetail();

      expect(screen.getByText('読み込み中...')).toBeTruthy();
      expect(screen.queryByRole('button', { name: /ナイス！/ })).toBeNull();

      await act(async () => { resolvePost(mockPost); });
    });

    it('shows likeCount=5 and aria-pressed="true" after API resolves with isLiked=true (Bug 1 regression)', async () => {
      let resolvePost!: (p: WorkoutPost) => void;
      const deferredPost = new Promise<WorkoutPost>((r) => { resolvePost = r; });
      mockFetchWorkoutPost.mockReturnValue(deferredPost);

      renderDetail();

      expect(screen.queryByRole('button', { name: /ナイス！/ })).toBeNull();

      await act(async () => {
        resolvePost({ ...mockPost, isLiked: true, likeCount: 5 });
      });

      const likeBtn = await screen.findByRole('button', { name: /ナイス！ 5/ });
      expect(likeBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('first click calls removeLike when initial isLiked=true (Bug 1 regression)', async () => {
      let resolvePost!: (p: WorkoutPost) => void;
      mockFetchWorkoutPost.mockReturnValue(new Promise<WorkoutPost>((r) => { resolvePost = r; }));
      mockRemoveLike.mockResolvedValue(undefined);

      renderDetail();

      await act(async () => {
        resolvePost({ ...mockPost, isLiked: true, likeCount: 3 });
      });

      const likeBtn = await screen.findByRole('button', { name: /ナイス！ 3/ });
      expect(likeBtn).toHaveAttribute('aria-pressed', 'true');

      await userEvent.click(likeBtn);

      expect(mockRemoveLike).toHaveBeenCalledWith(mockPost.id);
      expect(mockAddLike).not.toHaveBeenCalled();
    });

    it('first click calls addLike when initial isLiked=false', async () => {
      mockFetchWorkoutPost.mockResolvedValue({ ...mockPost, isLiked: false, likeCount: 0 });
      mockAddLike.mockResolvedValue(undefined);

      renderDetail();

      const likeBtn = await screen.findByRole('button', { name: /ナイス！ 0/ });
      expect(likeBtn).toHaveAttribute('aria-pressed', 'false');

      await userEvent.click(likeBtn);

      expect(mockAddLike).toHaveBeenCalledWith(mockPost.id);
      expect(mockRemoveLike).not.toHaveBeenCalled();
    });
  });

  describe('navigation during comment submission (Bug 2)', () => {
    const mockCreateComment = vi.mocked(commentsApi.createComment);

    const newComment: WorkoutComment = {
      id: '999',
      workoutPostId: '1',
      userId: '99',
      content: 'テストコメント',
      createdAt: '2026-06-26T00:00:00Z',
      user: { id: '99', username: 'other', displayName: 'Other' },
    };

    beforeEach(() => {
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
      mockFetchComments.mockResolvedValue([]);
    });

    it('back button is disabled while comment is submitting (Bug 2 fix)', async () => {
      let resolveCreate!: (c: WorkoutComment) => void;
      mockCreateComment.mockReturnValue(new Promise<WorkoutComment>((r) => { resolveCreate = r; }));

      renderDetail();
      await waitFor(() => { expect(screen.getByText('ベンチプレスの日')).toBeTruthy(); });

      await userEvent.type(screen.getByPlaceholderText(/コメントを入力/), 'テストコメント');
      await userEvent.click(screen.getByRole('button', { name: '送信' }));

      // 修正前: <Link> は role=link のため getByRole('button') が throw → FAIL
      // 修正後: <button disabled={commentSubmitting}> → disabled 確認 PASS
      const backBtn = screen.getByRole('button', { name: /← タイムラインへ/ });
      expect(backBtn).toBeDisabled();

      // disabled のためクリックしても navigate されない
      await userEvent.click(backBtn);
      expect(screen.queryByText('timeline')).toBeNull();

      await act(async () => { resolveCreate(newComment); });
    });

    it('back button re-enables and navigates after successful submission (Bug 2 fix)', async () => {
      let resolveCreate!: (c: WorkoutComment) => void;
      mockCreateComment.mockReturnValue(new Promise<WorkoutComment>((r) => { resolveCreate = r; }));

      renderDetail();
      await waitFor(() => { expect(screen.getByText('ベンチプレスの日')).toBeTruthy(); });

      await userEvent.type(screen.getByPlaceholderText(/コメントを入力/), 'テストコメント');
      await userEvent.click(screen.getByRole('button', { name: '送信' }));

      // 修正前: getByRole('button') が throw → FAIL
      expect(screen.getByRole('button', { name: /← タイムラインへ/ })).toBeDisabled();

      await act(async () => { resolveCreate(newComment); });

      const backBtn = await screen.findByRole('button', { name: /← タイムラインへ/ });
      expect(backBtn).not.toBeDisabled();

      await userEvent.click(backBtn);
      await screen.findByText('timeline');
    });

    it('back button re-enables and navigates after failed submission (Bug 2 fix)', async () => {
      mockCreateComment.mockRejectedValue(new Error('network error'));

      renderDetail();
      await waitFor(() => { expect(screen.getByText('ベンチプレスの日')).toBeTruthy(); });

      await userEvent.type(screen.getByPlaceholderText(/コメントを入力/), 'テストコメント');
      await userEvent.click(screen.getByRole('button', { name: '送信' }));

      await waitFor(() => { expect(screen.getByText(/コメントの投稿に失敗しました/)).toBeTruthy(); });

      // 修正前: getByRole('button') が throw → FAIL
      const backBtn = screen.getByRole('button', { name: /← タイムラインへ/ });
      expect(backBtn).not.toBeDisabled();

      await userEvent.click(backBtn);
      await screen.findByText('timeline');
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
