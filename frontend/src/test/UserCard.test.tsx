import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import UserCard from '../components/UserCard';
import * as AuthContextModule from '../contexts/AuthContext';
import * as followsApi from '../api/follows';

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal<typeof AuthContextModule>();
  return { ...mod, useAuth: vi.fn() };
});

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
const mockFollowUser = vi.mocked(followsApi.followUser);
const mockUnfollowUser = vi.mocked(followsApi.unfollowUser);

const axiosError = (status: number) =>
  Object.assign(new Error('axios error'), { isAxiosError: true, response: { status } });

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  username: 'alice',
  displayName: 'Alice',
  avatarUrl: null,
  isFollowing: false,
  ...overrides,
});

const renderCard = (userOverrides: Record<string, unknown> = {}) =>
  render(
    <MemoryRouter>
      <UserCard user={makeUser(userOverrides)} />
    </MemoryRouter>,
  );

// Route-aware wrapper for navigation tests
const LocationDisplay = () => {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
};

const renderCardWithRouter = (userOverrides: Record<string, unknown> = {}) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <UserCard user={makeUser(userOverrides)} />
              <LocationDisplay />
            </>
          }
        />
        <Route path="/users/:id" element={<div data-testid="profile-page">Profile</div>} />
      </Routes>
    </MemoryRouter>,
  );

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

describe('UserCard', () => {
  describe('表示', () => {
    it('avatarUrl ありの場合に画像を表示する', () => {
      renderCard({ avatarUrl: 'http://s3/avatar.jpg' });
      const img = screen.getByTestId('user-card-avatar-image') as HTMLImageElement;
      expect(img.src).toContain('http://s3/avatar.jpg');
      expect(screen.queryByTestId('user-card-avatar-initial')).toBeNull();
    });

    it('avatarUrl なしの場合にイニシャルを表示する', () => {
      renderCard({ avatarUrl: null, displayName: 'Alice' });
      const initial = screen.getByTestId('user-card-avatar-initial');
      expect(initial.textContent).toBe('A');
      expect(screen.queryByTestId('user-card-avatar-image')).toBeNull();
    });

    it('displayName が空の場合は ? を表示する', () => {
      renderCard({ avatarUrl: null, displayName: '' });
      expect(screen.getByTestId('user-card-avatar-initial').textContent).toBe('?');
    });

    it('カードのリンクが /users/:id を指す', () => {
      renderCard({ id: 'user-1' });
      const link = screen.getAllByRole('link')[0] as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/users/user-1');
    });

    it('自分のカードにはフォローボタンを表示しない', () => {
      renderCard({ id: 'me' });
      expect(screen.queryByTestId('follow-button')).toBeNull();
    });
  });

  describe('フォロー操作', () => {
    it('フォロー成功 → ボタンが「フォロー中」になる（状態は API 成功後に変わる）', async () => {
      mockFollowUser.mockResolvedValue(undefined);
      renderCard({ isFollowing: false });

      fireEvent.click(screen.getByTestId('follow-button'));

      await waitFor(() => {
        expect(screen.getByTestId('follow-button').textContent).toBe('フォロー中');
      });
      expect(mockFollowUser).toHaveBeenCalledWith('user-1');
    });

    it('フォロー解除成功 → ボタンが「フォロー」になる', async () => {
      mockUnfollowUser.mockResolvedValue(undefined);
      renderCard({ isFollowing: true });

      fireEvent.click(screen.getByTestId('follow-button'));

      await waitFor(() => {
        expect(screen.getByTestId('follow-button').textContent).toBe('フォロー');
      });
      expect(mockUnfollowUser).toHaveBeenCalledWith('user-1');
    });

    it('処理中はボタンを disabled にする（連打防止）', async () => {
      mockFollowUser.mockReturnValue(new Promise(() => {}));
      renderCard({ isFollowing: false });

      fireEvent.click(screen.getByTestId('follow-button'));

      await waitFor(() => {
        const btn = screen.getByTestId('follow-button') as HTMLButtonElement;
        expect(btn.disabled).toBe(true);
      });
    });

    it('フォロー 409 → isFollowing=true に寄せる（エラー表示なし）', async () => {
      mockFollowUser.mockRejectedValue(axiosError(409));
      renderCard({ isFollowing: false });

      fireEvent.click(screen.getByTestId('follow-button'));

      await waitFor(() => {
        expect(screen.getByTestId('follow-button').textContent).toBe('フォロー中');
      });
      expect(screen.queryByTestId('follow-error')).toBeNull();
    });

    it('フォロー解除 404 → isFollowing=false に寄せる（エラー表示なし）', async () => {
      mockUnfollowUser.mockRejectedValue(axiosError(404));
      renderCard({ isFollowing: true });

      fireEvent.click(screen.getByTestId('follow-button'));

      await waitFor(() => {
        expect(screen.getByTestId('follow-button').textContent).toBe('フォロー');
      });
      expect(screen.queryByTestId('follow-error')).toBeNull();
    });

    it('フォロー API 失敗（その他）→ 元の状態を維持しエラーメッセージを表示する', async () => {
      mockFollowUser.mockRejectedValue(new Error('network error'));
      renderCard({ isFollowing: false });

      fireEvent.click(screen.getByTestId('follow-button'));

      await waitFor(() => {
        expect(screen.getByTestId('follow-error')).toBeTruthy();
      });
      // 状態は変化しない（「フォロー」のまま）
      expect(screen.getByTestId('follow-button').textContent).toBe('フォロー');
    });

    it('フォローボタンクリックではプロフィールへ遷移しない', async () => {
      mockFollowUser.mockResolvedValue(undefined);
      renderCardWithRouter({ id: 'user-1', isFollowing: false });

      expect(screen.getByTestId('location').textContent).toBe('/');

      fireEvent.click(screen.getByTestId('follow-button'));

      await waitFor(() => {
        expect(mockFollowUser).toHaveBeenCalled();
      });
      // フォロー操作後も現在のパスは変わらない
      expect(screen.getByTestId('location').textContent).toBe('/');
      expect(screen.queryByTestId('profile-page')).toBeNull();
    });
  });
});
