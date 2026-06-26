import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NavBar from '../components/NavBar';
import LoginPage from '../pages/LoginPage';
import * as AuthContextModule from '../contexts/AuthContext';
import type { User } from '../types/auth';

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal<typeof AuthContextModule>();
  return { ...mod, useAuth: vi.fn() };
});

const mockUseAuth = vi.mocked(AuthContextModule.useAuth);
const mockLogout = vi.fn();

const baseUser: User = {
  id: '1',
  username: 'user',
  displayName: 'User',
  email: 'u@test.com',
  avatarUrl: null,
  bio: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: baseUser,
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
  // ── logout 系（既存 3 件）──────────────────────────────────────────────
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

  // ── アバター・プロフィールリンク系（新規 5 件）────────────────────────
  it('avatarUrl あり → <img> を表示し /users/1 へのリンクがある', () => {
    mockUseAuth.mockReturnValue({
      user: { ...baseUser, avatarUrl: 'http://localhost:4566/fitlog/images/avatars/1/test.png' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
      updateCurrentUser: vi.fn(),
    });
    renderNavBar();

    const img = screen.getByAltText('User');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe(
      'http://localhost:4566/fitlog/images/avatars/1/test.png',
    );
    const link = screen.getByRole('link', { name: 'プロフィール' });
    expect(link.getAttribute('href')).toBe('/users/1');
  });

  it('avatarUrl なし → イニシャル（U）を表示し /users/1 へのリンクがある', () => {
    renderNavBar(); // baseUser は avatarUrl: null

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('U')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'プロフィール' });
    expect(link.getAttribute('href')).toBe('/users/1');
  });

  it('displayName が空文字 → ? を表示する', () => {
    mockUseAuth.mockReturnValue({
      user: { ...baseUser, displayName: '' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
      updateCurrentUser: vi.fn(),
    });
    renderNavBar();

    expect(screen.getByText('?')).toBeTruthy();
  });

  it('updateCurrentUser で avatarUrl を更新すると <img> に切り替わる', async () => {
    const { rerender } = renderNavBar();

    // avatarUrl なし → イニシャル表示
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('U')).toBeTruthy();

    // avatarUrl あり に更新
    mockUseAuth.mockReturnValue({
      user: { ...baseUser, avatarUrl: 'http://localhost:4566/fitlog/images/avatars/1/new.png' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
      updateCurrentUser: vi.fn(),
    });

    await act(async () => {
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<><NavBar /><div>timeline</div></>} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    expect(screen.getByAltText('User').getAttribute('src')).toBe(
      'http://localhost:4566/fitlog/images/avatars/1/new.png',
    );
    expect(screen.queryByText('U')).toBeNull();
  });

  it('user が null → プロフィールリンクを表示しない', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
      updateCurrentUser: vi.fn(),
    });
    renderNavBar();

    expect(screen.queryByRole('link', { name: 'プロフィール' })).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  // ── 新規投稿リンク ─────────────────────────────────────────────────
  it('NavBar に「新規投稿」リンクが表示される', () => {
    renderNavBar();
    // 修正前: '投稿する' テキストのリンクのみ → '新規投稿' が存在しない → FAIL
    // 修正後: '新規投稿' リンクが存在する → PASS
    expect(screen.getByRole('link', { name: '新規投稿' })).toBeTruthy();
  });

  it('「新規投稿」リンクの href が /workout-posts/new', () => {
    renderNavBar();
    const link = screen.getByRole('link', { name: '新規投稿' });
    expect(link.getAttribute('href')).toBe('/workout-posts/new');
  });

  it('NavBar 内に「投稿する」リンクが表示されない（文言変更確認）', () => {
    renderNavBar();
    // 修正前: '投稿する' リンクが存在する → FAIL
    // 修正後: '投稿する' リンクが存在しない → PASS
    expect(screen.queryByRole('link', { name: '投稿する' })).toBeNull();
  });
});
