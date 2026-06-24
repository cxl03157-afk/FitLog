import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SearchPage from '../pages/stubs/SearchPage';
import * as AuthContextModule from '../contexts/AuthContext';
import * as usersApi from '../api/users';

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal<typeof AuthContextModule>();
  return { ...mod, useAuth: vi.fn() };
});

vi.mock('../api/users', () => ({
  getProfile: vi.fn(),
  searchUsers: vi.fn(),
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
}));

vi.mock('../api/follows', () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  getFollowers: vi.fn(),
  getFollowing: vi.fn(),
}));

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    isAxiosError: (e: unknown) =>
      (e as { isAxiosError?: boolean }).isAxiosError === true,
    isCancel: () => false,
  };
});

const mockUseAuth = vi.mocked(AuthContextModule.useAuth);
const mockSearchUsers = vi.mocked(usersApi.searchUsers);

const makeSearchUser = (id: string, isMe = false) => ({
  id: isMe ? 'me' : id,
  username: isMe ? 'me' : `user${id}`,
  displayName: isMe ? 'Me' : `User ${id}`,
  avatarUrl: null,
  isFollowing: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: {
      id: 'me',
      username: 'me',
      displayName: 'Me',
      email: 'me@test.com',
      avatarUrl: null,
      bio: null,
    },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateCurrentUser: vi.fn(),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

const renderSearch = () =>
  render(
    <MemoryRouter>
      <SearchPage />
    </MemoryRouter>,
  );

const typeInSearch = (value: string) =>
  fireEvent.change(screen.getByTestId('search-input'), { target: { value } });

/** fake timer で 300ms 進め、promise を flush し、その後 real timer に戻す */
const fireDebounce = async () => {
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
  vi.useRealTimers();
};

describe('SearchPage', () => {
  describe('デバウンス・入力制御', () => {
    it('2文字未満ではリクエストを送らない', async () => {
      vi.useFakeTimers();
      mockSearchUsers.mockResolvedValue([]);
      renderSearch();

      typeInSearch('a');
      await act(async () => { vi.advanceTimersByTime(300); });

      expect(mockSearchUsers).not.toHaveBeenCalled();
    });

    it('300ms デバウンス後に trim 済みの検索語でリクエストを送信する', async () => {
      vi.useFakeTimers();
      mockSearchUsers.mockResolvedValue([]);
      renderSearch();

      typeInSearch('  ab  '); // trim → 'ab'
      expect(mockSearchUsers).not.toHaveBeenCalled();

      await fireDebounce();

      expect(mockSearchUsers).toHaveBeenCalledWith('ab', undefined, expect.any(AbortSignal));
    });

    it('2文字未満に戻したとき検索結果・ローディングをクリアする', async () => {
      vi.useFakeTimers();
      mockSearchUsers.mockResolvedValue([makeSearchUser('1')]);
      renderSearch();

      typeInSearch('ab');
      await fireDebounce(); // real timer restored

      await waitFor(() => expect(screen.getByText('User 1')).toBeTruthy());

      // 1文字に戻す → cleanup で結果リセット
      typeInSearch('a');

      await waitFor(() => {
        expect(screen.queryByText('User 1')).toBeNull();
      });
    });
  });

  describe('AbortController / 競合防止', () => {
    it('新しいリクエストが来たとき AbortController で旧リクエストをキャンセルする', async () => {
      vi.useFakeTimers();
      let capturedSignal: AbortSignal | undefined;
      mockSearchUsers.mockImplementation((_q, _l, signal) => {
        capturedSignal = signal;
        return new Promise(() => {});
      });

      renderSearch();

      typeInSearch('ab');
      await act(async () => { vi.advanceTimersByTime(300); });

      expect(capturedSignal?.aborted).toBe(false);

      // 新しいクエリ → cleanup が旧コントローラーを abort する
      typeInSearch('abc');

      expect(capturedSignal?.aborted).toBe(true);
    });

    it('2文字未満へ戻した際、進行中リクエストをキャンセルする', async () => {
      vi.useFakeTimers();
      let capturedSignal: AbortSignal | undefined;
      mockSearchUsers.mockImplementation((_q, _l, signal) => {
        capturedSignal = signal;
        return new Promise(() => {}); // 永遠に pending
      });

      renderSearch();

      typeInSearch('ab');
      await act(async () => { vi.advanceTimersByTime(300); });

      expect(capturedSignal?.aborted).toBe(false);

      // 1文字に戻す → cleanup が abort
      typeInSearch('a');

      expect(capturedSignal?.aborted).toBe(true);
    });

    it('キャンセルされたリクエストではエラーメッセージを表示しない', async () => {
      vi.useFakeTimers();
      mockSearchUsers.mockImplementation((_q, _l, signal) => {
        return new Promise<never>((_, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
        });
      });

      renderSearch();

      typeInSearch('ab');
      await act(async () => { vi.advanceTimersByTime(300); });

      // 中断 → cleanup が cancelled=true をセット
      typeInSearch('a');

      vi.useRealTimers();

      // 少し待ってエラーが出ないことを確認
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.queryByText('検索に失敗しました。')).toBeNull();
    });

    it('古いレスポンスが新しい検索結果を上書きしない', async () => {
      vi.useFakeTimers();
      let resolveAb!: (v: typeof makeSearchUser extends (...a: never[]) => infer R ? R[] : never) => void;
      const abPromise = new Promise<ReturnType<typeof makeSearchUser>[]>((res) => { resolveAb = res; });

      mockSearchUsers
        .mockReturnValueOnce(abPromise)
        .mockResolvedValueOnce([makeSearchUser('2')]);

      renderSearch();

      // 'ab' 検索開始（pending）
      typeInSearch('ab');
      await act(async () => { vi.advanceTimersByTime(300); });

      // 'abc' に変更 → 'ab' リクエストがキャンセルされ 'abc' 検索開始
      typeInSearch('abc');
      await act(async () => { vi.advanceTimersByTime(300); });

      vi.useRealTimers();

      // 'abc' の結果が表示される
      await waitFor(() => expect(screen.getByText('User 2')).toBeTruthy());

      // 遅れて 'ab' のレスポンスが来ても無視される（cancelled=true）
      await act(async () => { resolveAb([makeSearchUser('1')]); });

      expect(screen.queryByText('User 1')).toBeNull();
      expect(screen.getByText('User 2')).toBeTruthy();
    });
  });

  describe('検索結果の表示', () => {
    it('検索成功 → UserCard リストを表示する', async () => {
      vi.useFakeTimers();
      mockSearchUsers.mockResolvedValue([makeSearchUser('1'), makeSearchUser('2')]);
      renderSearch();

      typeInSearch('ab');
      await fireDebounce();

      await waitFor(() => {
        expect(screen.getByText('User 1')).toBeTruthy();
        expect(screen.getByText('User 2')).toBeTruthy();
      });
    });

    it('検索結果 0件 → 「一致するユーザーが見つかりません」を表示する', async () => {
      vi.useFakeTimers();
      mockSearchUsers.mockResolvedValue([]);
      renderSearch();

      typeInSearch('ab');
      await fireDebounce();

      await waitFor(() => {
        expect(screen.getByText('一致するユーザーが見つかりません。')).toBeTruthy();
      });
    });

    it('自分自身の検索結果にはフォローボタンを表示しない', async () => {
      vi.useFakeTimers();
      mockSearchUsers.mockResolvedValue([makeSearchUser('1'), makeSearchUser('me', true)]);
      renderSearch();

      typeInSearch('ab');
      await fireDebounce();

      await waitFor(() => {
        expect(screen.getByText('User 1')).toBeTruthy();
        expect(screen.getByText('Me')).toBeTruthy();
      });

      // 他ユーザー(user1)にはフォローボタンがある
      const buttons = screen.getAllByTestId('follow-button');
      expect(buttons.length).toBe(1);
    });
  });
});
