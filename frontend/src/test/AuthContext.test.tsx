import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import * as authApi from '../api/auth';
import * as usersApi from '../api/users';
import { setAccessToken } from '../api/client';

vi.mock('../api/auth', () => ({
  refresh: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../api/users', () => ({
  getProfile: vi.fn(),
}));

const TestConsumer = () => {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  if (isLoading) return <div>loading</div>;
  return (
    <div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="user">{user ? user.username : 'none'}</div>
      <button onClick={() => void login('a@b.com', 'password1')}>login</button>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
};

const mockProfile = {
  id: '1',
  username: 'taro',
  displayName: 'Taro',
  bio: null,
  avatarUrl: null,
  postCount: 0,
  followerCount: 0,
  followingCount: 0,
  isFollowing: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  setAccessToken(null);
  vi.mocked(usersApi.getProfile).mockResolvedValue(mockProfile);
});

describe('AuthContext', () => {
  it('starts as guest when refresh fails', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('no cookie'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
    });
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('restores session when refresh succeeds', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({
      accessToken: 'tok',
      user: { id: '1', username: 'taro', displayName: 'Taro', email: 'a@b.com' },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('taro');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
  });

  it('sets user after login', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('no cookie'));
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'tok2',
      user: { id: '2', username: 'jiro', displayName: 'Jiro', email: 'j@b.com' },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
    });

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'login' }));
    });

    expect(screen.getByTestId('user').textContent).toBe('jiro');
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
  });

  it('clears user after logout', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({
      accessToken: 'tok',
      user: { id: '1', username: 'taro', displayName: 'Taro', email: 'a@b.com' },
    });
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'logout' }));
    });

    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });
});
