import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import FollowersPage from '../pages/stubs/FollowersPage';
import FollowingPage from '../pages/stubs/FollowingPage';
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
const mockGetFollowers = vi.mocked(followsApi.getFollowers);
const mockGetFollowing = vi.mocked(followsApi.getFollowing);

const makeFollowUser = (id: string) => ({
  id,
  username: `user${id}`,
  displayName: `User ${id}`,
  avatarUrl: null,
  isFollowing: false,
});

const axiosError = (status: number) =>
  Object.assign(new Error('axios error'), { isAxiosError: true, response: { status } });

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

const renderFollowers = (userId = 'target') =>
  render(
    <MemoryRouter initialEntries={[`/users/${userId}/followers`]}>
      <Routes>
        <Route path="/users/:id/followers" element={<FollowersPage />} />
        <Route path="/users/:id/following" element={<FollowingPage />} />
      </Routes>
    </MemoryRouter>,
  );

const renderFollowing = (userId = 'target') =>
  render(
    <MemoryRouter initialEntries={[`/users/${userId}/following`]}>
      <Routes>
        <Route path="/users/:id/followers" element={<FollowersPage />} />
        <Route path="/users/:id/following" element={<FollowingPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('FollowersPage', () => {
  it('フォロワー一覧を UserCard で表示し getFollowers(userId) が呼ばれる', async () => {
    mockGetFollowers.mockResolvedValue([makeFollowUser('1'), makeFollowUser('2')]);
    renderFollowers('target');

    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeTruthy();
      expect(screen.getByText('User 2')).toBeTruthy();
    });
    expect(mockGetFollowers).toHaveBeenCalledWith('target');
  });

  it('0件 → 「フォロワーはいません」を表示する', async () => {
    mockGetFollowers.mockResolvedValue([]);
    renderFollowers();

    await waitFor(() => {
      expect(screen.getByText('フォロワーはいません。')).toBeTruthy();
    });
  });

  it('404 → 「ユーザーが見つかりません」を表示する', async () => {
    mockGetFollowers.mockRejectedValue(axiosError(404));
    renderFollowers();

    await waitFor(() => {
      expect(screen.getByText('ユーザーが見つかりません。')).toBeTruthy();
    });
  });

  it('API エラー（404以外）→ エラーメッセージを表示する', async () => {
    mockGetFollowers.mockRejectedValue(axiosError(500));
    renderFollowers();

    await waitFor(() => {
      expect(screen.getByText('フォロワーの取得に失敗しました。')).toBeTruthy();
    });
  });

  it('「フォロー中」タブが /users/:id/following を指す', async () => {
    mockGetFollowers.mockResolvedValue([]);
    renderFollowers('user-123');

    await waitFor(() => {
      const link = screen.getByTestId('following-tab-link') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/users/user-123/following');
    });
  });
});

describe('FollowingPage', () => {
  it('フォロー中一覧を UserCard で表示し getFollowing(userId) が呼ばれる', async () => {
    mockGetFollowing.mockResolvedValue([makeFollowUser('3'), makeFollowUser('4')]);
    renderFollowing('target');

    await waitFor(() => {
      expect(screen.getByText('User 3')).toBeTruthy();
      expect(screen.getByText('User 4')).toBeTruthy();
    });
    expect(mockGetFollowing).toHaveBeenCalledWith('target');
  });

  it('0件 → 「フォロー中のユーザーはいません」を表示する', async () => {
    mockGetFollowing.mockResolvedValue([]);
    renderFollowing();

    await waitFor(() => {
      expect(screen.getByText('フォロー中のユーザーはいません。')).toBeTruthy();
    });
  });

  it('404 → 「ユーザーが見つかりません」を表示する', async () => {
    mockGetFollowing.mockRejectedValue(axiosError(404));
    renderFollowing();

    await waitFor(() => {
      expect(screen.getByText('ユーザーが見つかりません。')).toBeTruthy();
    });
  });

  it('API エラー（404以外）→ エラーメッセージを表示する', async () => {
    mockGetFollowing.mockRejectedValue(axiosError(500));
    renderFollowing();

    await waitFor(() => {
      expect(screen.getByText('フォロー中ユーザーの取得に失敗しました。')).toBeTruthy();
    });
  });

  it('「フォロワー」タブが /users/:id/followers を指す', async () => {
    mockGetFollowing.mockResolvedValue([]);
    renderFollowing('user-456');

    await waitFor(() => {
      const link = screen.getByTestId('followers-tab-link') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/users/user-456/followers');
    });
  });

  it('「フォロー中」がアクティブタブとして強調表示される', async () => {
    mockGetFollowing.mockResolvedValue([]);
    renderFollowing();

    await waitFor(() => {
      // FollowingPage では「フォロー中」が <span>（非リンク）として表示される
      const spans = screen.getAllByText('フォロー中');
      const activeSpan = spans.find((el) => el.tagName === 'SPAN');
      expect(activeSpan).toBeTruthy();
    });
  });
});
