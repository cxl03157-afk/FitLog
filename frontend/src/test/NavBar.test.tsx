import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NavBar from '../components/NavBar';
import LoginPage from '../pages/LoginPage';
import * as AuthContextModule from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal<typeof AuthContextModule>();
  return { ...mod, useAuth: vi.fn() };
});

const mockUseAuth = vi.mocked(AuthContextModule.useAuth);
const mockLogout = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { id: '1', username: 'user', displayName: 'User', email: 'u@test.com', avatarUrl: null, bio: null },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: mockLogout,
    updateCurrentUser: vi.fn(),
  });
});

const renderNavBar = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <NavBar />
              <div>timeline</div>
            </>
          }
        />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('NavBar', () => {
  it('logout 成功 → /login へ遷移しエラーメッセージを表示しない', async () => {
    mockLogout.mockResolvedValue(undefined);
    renderNavBar();

    await userEvent.click(screen.getByText('ログアウト'));

    await waitFor(() => {
      expect(screen.getByText('FitLog にログイン')).toBeTruthy();
    });
    expect(screen.queryByText(/セッションの失効/)).toBeNull();
  });

  it('logout 失敗 → 未処理 Promise rejection が発生せず /login へ遷移する', async () => {
    mockLogout.mockRejectedValue(new Error('network error'));

    const unhandledErrors: unknown[] = [];
    const handler = (e: PromiseRejectionEvent) => unhandledErrors.push(e.reason);
    window.addEventListener('unhandledrejection', handler);

    renderNavBar();

    await userEvent.click(screen.getByText('ログアウト'));

    await waitFor(() => {
      expect(screen.getByText('FitLog にログイン')).toBeTruthy();
    });

    window.removeEventListener('unhandledrejection', handler);
    expect(unhandledErrors).toHaveLength(0);
  });

  it('logout 失敗 → logoutError を navigate state 経由で LoginPage に渡す', async () => {
    mockLogout.mockRejectedValue(new Error('network error'));
    renderNavBar();

    await userEvent.click(screen.getByText('ログアウト'));

    await waitFor(() => {
      expect(screen.getByText(/サーバーとの通信に失敗しました/)).toBeTruthy();
    });
  });
});
