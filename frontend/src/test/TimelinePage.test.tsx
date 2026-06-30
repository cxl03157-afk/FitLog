import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
  uploadPostImages: vi.fn(),
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
      exercise: { id: '1', name: 'ベンチプレス', category: '胸', description: null, userId: null },
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

/** タブ切替後のローディング完了を待つ */
const waitForLoad = () =>
  waitFor(() => expect(screen.queryByText('読み込み中...')).toBeNull());

describe('TimelinePage', () => {
  describe('基本表示', () => {
    it('初期表示で feed=all で API が呼ばれる', async () => {
      mockFetchWorkoutPosts.mockResolvedValue({ data: [mockPost], total: 1 });
      renderTimeline();

      await waitFor(() => {
        expect(mockFetchWorkoutPosts).toHaveBeenCalledWith(
          expect.objectContaining({ feed: 'all' }),
        );
      });
    });

    it('投稿一覧を表示する', async () => {
      mockFetchWorkoutPosts.mockResolvedValue({ data: [mockPost], total: 1 });
      renderTimeline();
      await waitFor(() => {
        expect(screen.getByText('テスト投稿')).toBeTruthy();
      });
      expect(screen.getByText('テストユーザー')).toBeTruthy();
    });

    it('投稿 0件 → 「まだ投稿がありません」メッセージを表示する', async () => {
      mockFetchWorkoutPosts.mockResolvedValue({ data: [], total: 0 });
      renderTimeline();
      await waitFor(() => {
        expect(screen.getByText(/まだ投稿がありません/)).toBeTruthy();
      });
    });

    it('初期表示で読み込み中スピナーを表示する', () => {
      mockFetchWorkoutPosts.mockReturnValue(new Promise(() => {}));
      renderTimeline();
      expect(screen.getByText('読み込み中...')).toBeTruthy();
    });

    it('API 失敗 → エラーメッセージを表示する', async () => {
      mockFetchWorkoutPosts.mockRejectedValue(new Error('Network error'));
      renderTimeline();
      await waitFor(() => {
        expect(screen.getByText(/投稿の取得に失敗しました/)).toBeTruthy();
      });
    });
  });

  describe('タブ切替', () => {
    it('「フォロー中」タブクリック → feed=following で API が呼ばれる', async () => {
      mockFetchWorkoutPosts.mockResolvedValue({ data: [], total: 0 });
      renderTimeline();
      await waitForLoad();

      mockFetchWorkoutPosts.mockClear();
      mockFetchWorkoutPosts.mockResolvedValue({ data: [], total: 0 });

      fireEvent.click(screen.getByText('フォロー中'));

      await waitFor(() => {
        expect(mockFetchWorkoutPosts).toHaveBeenCalledWith(
          expect.objectContaining({ feed: 'following' }),
        );
      });
    });

    it('「全体」タブへ戻すと feed=all で API が呼ばれる', async () => {
      mockFetchWorkoutPosts.mockResolvedValue({ data: [], total: 0 });
      renderTimeline();
      await waitForLoad();

      // following タブへ
      mockFetchWorkoutPosts.mockResolvedValue({ data: [], total: 0 });
      fireEvent.click(screen.getByText('フォロー中'));
      await waitForLoad();

      // all タブへ戻す
      mockFetchWorkoutPosts.mockClear();
      mockFetchWorkoutPosts.mockResolvedValue({ data: [], total: 0 });
      fireEvent.click(screen.getByText('全体'));

      await waitFor(() => {
        expect(mockFetchWorkoutPosts).toHaveBeenCalledWith(
          expect.objectContaining({ feed: 'all' }),
        );
      });
    });

    it('フォロー中タブが空 → 専用メッセージ「フォロー中のユーザーの投稿はありません」を表示する', async () => {
      mockFetchWorkoutPosts.mockResolvedValue({ data: [], total: 0 });
      renderTimeline();
      await waitForLoad();

      mockFetchWorkoutPosts.mockResolvedValue({ data: [], total: 0 });
      fireEvent.click(screen.getByText('フォロー中'));

      await waitFor(() => {
        expect(screen.getByText('フォロー中のユーザーの投稿はありません。')).toBeTruthy();
      });
    });

    it('タブ切替で古いリクエスト結果が新しいタブを上書きしない', async () => {
      let resolveAll!: (v: { data: WorkoutPost[]; total: number }) => void;
      const allPromise = new Promise<{ data: WorkoutPost[]; total: number }>(
        (res) => { resolveAll = res; },
      );

      // 最初の all リクエストは pending
      mockFetchWorkoutPosts
        .mockReturnValueOnce(allPromise)
        // following リクエストは空で即解決
        .mockResolvedValue({ data: [], total: 0 });

      renderTimeline();

      // フォロー中タブへ切替
      fireEvent.click(screen.getByText('フォロー中'));
      await waitForLoad();

      // フォロー中の空メッセージが表示されていることを確認
      expect(screen.getByText('フォロー中のユーザーの投稿はありません。')).toBeTruthy();

      // 遅れて all の結果が到達してもキャンセル済みなので上書きしない
      await waitFor(async () => {
        resolveAll({ data: [mockPost], total: 1 });
        await new Promise((r) => setTimeout(r, 0));
      });

      // フォロー中の表示が維持される
      expect(screen.queryByText('テスト投稿')).toBeNull();
      expect(screen.getByText('フォロー中のユーザーの投稿はありません。')).toBeTruthy();
    });

    it('タブ切替で API が二重呼び出しにならない（1回のみ）', async () => {
      mockFetchWorkoutPosts.mockResolvedValue({ data: [], total: 0 });
      renderTimeline();
      await waitForLoad();

      mockFetchWorkoutPosts.mockClear();
      mockFetchWorkoutPosts.mockResolvedValue({ data: [], total: 0 });

      fireEvent.click(screen.getByText('フォロー中'));
      await waitForLoad();

      // フォロー中タブへの切替で fetchWorkoutPosts は正確に 1 回だけ呼ばれる
      expect(mockFetchWorkoutPosts).toHaveBeenCalledTimes(1);
    });
  });
});
