import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SessionsPage from '../pages/stubs/SessionsPage';
import LoginPage from '../pages/LoginPage';
import * as AuthContextModule from '../contexts/AuthContext';
import * as sessionsApi from '../api/sessions';

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal<typeof AuthContextModule>();
  return { ...mod, useAuth: vi.fn() };
});

vi.mock('../api/sessions', () => ({
  getSessions: vi.fn(),
  revokeSession: vi.fn(),
  revokeAllOtherSessions: vi.fn(),
}));

const mockUseAuth = vi.mocked(AuthContextModule.useAuth);
const mockGetSessions = vi.mocked(sessionsApi.getSessions);
const mockRevokeSession = vi.mocked(sessionsApi.revokeSession);
const mockRevokeAllOtherSessions = vi.mocked(sessionsApi.revokeAllOtherSessions);
const mockLogout = vi.fn();

const makeSession = (
  id: string,
  isCurrent = false,
  extra: Partial<sessionsApi.SessionInfo> = {},
): sessionsApi.SessionInfo => ({
  sessionId: id,
  deviceName: `Device ${id}`,
  userAgent: `Mozilla/5.0 (${id})`,
  ipAddress: `192.168.1.${id}`,
  lastUsedAt: '2026-06-23T10:00:00Z',
  isCurrent,
  ...extra,
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
    logout: mockLogout,
    updateCurrentUser: vi.fn(),
  });
});

const renderSessions = () =>
  render(
    <MemoryRouter initialEntries={['/settings/sessions']}>
      <Routes>
        <Route path="/settings/sessions" element={<SessionsPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>,
  );

const waitForLoad = () =>
  waitFor(() => expect(screen.queryByText('読み込み中...')).toBeNull());

// ─── 一覧表示 ──────────────────────────────────────────────────────────────

describe('一覧表示', () => {
  it('ローディング中はスピナーを表示する', () => {
    mockGetSessions.mockReturnValue(new Promise(() => {}));
    renderSessions();
    expect(screen.getByText('読み込み中...')).toBeTruthy();
  });

  it('セッション一覧を userAgent・IP・最終利用時刻とともに表示する', async () => {
    mockGetSessions.mockResolvedValue([
      makeSession('s1', true),
      makeSession('s2', false),
    ]);
    renderSessions();
    await waitForLoad();
    expect(screen.getByText('Mozilla/5.0 (s1)')).toBeTruthy();
    expect(screen.getByText('192.168.1.s1')).toBeTruthy();
    expect(screen.getByText('Mozilla/5.0 (s2)')).toBeTruthy();
  });

  it('isCurrent=true の行に「現在の端末」バッジを表示する', async () => {
    mockGetSessions.mockResolvedValue([makeSession('s1', true), makeSession('s2', false)]);
    renderSessions();
    await waitForLoad();
    const badges = screen.getAllByTestId('current-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0].textContent).toBe('現在の端末');
  });

  it('0件のとき「セッションはありません」を表示する', async () => {
    mockGetSessions.mockResolvedValue([]);
    renderSessions();
    await waitForLoad();
    expect(screen.getByText('セッションはありません。')).toBeTruthy();
  });

  it('一覧取得失敗 → エラーメッセージを表示する', async () => {
    mockGetSessions.mockRejectedValue(new Error('fetch error'));
    renderSessions();
    await waitForLoad();
    expect(screen.getByText('セッション一覧の取得に失敗しました。')).toBeTruthy();
  });
});

// ─── 他端末ログアウト ──────────────────────────────────────────────────────

describe('他端末ログアウト', () => {
  it('削除成功 → 対象行のみリストから削除される', async () => {
    mockGetSessions.mockResolvedValue([makeSession('s1', true), makeSession('s2', false)]);
    mockRevokeSession.mockResolvedValue(undefined);
    renderSessions();
    await waitForLoad();

    await userEvent.click(screen.getByTestId('logout-button-s2'));
    await waitFor(() => {
      expect(screen.queryByTestId('session-item-s2')).toBeNull();
    });
    expect(screen.getByTestId('session-item-s1')).toBeTruthy();
  });

  it('処理中は対象ボタンのみ disabled になる', async () => {
    mockGetSessions.mockResolvedValue([makeSession('s1', true), makeSession('s2', false)]);
    mockRevokeSession.mockReturnValue(new Promise(() => {}));
    renderSessions();
    await waitForLoad();

    await userEvent.click(screen.getByTestId('logout-button-s2'));

    await waitFor(() => {
      expect(screen.getByTestId('logout-button-s2')).toBeDisabled();
    });
    // 現在端末のボタンは disabled にならない
    expect(screen.getByTestId('logout-button-s1')).not.toBeDisabled();
  });

  it('連打しても revokeSession は重複実行されない', async () => {
    mockGetSessions.mockResolvedValue([makeSession('s1', true), makeSession('s2', false)]);
    mockRevokeSession.mockReturnValue(new Promise(() => {}));
    renderSessions();
    await waitForLoad();

    await userEvent.click(screen.getByTestId('logout-button-s2'));
    await userEvent.click(screen.getByTestId('logout-button-s2'));
    await userEvent.click(screen.getByTestId('logout-button-s2'));

    expect(mockRevokeSession).toHaveBeenCalledTimes(1);
  });

  it('削除失敗 → エラートーストを表示しリストはそのまま', async () => {
    mockGetSessions.mockResolvedValue([makeSession('s1', true), makeSession('s2', false)]);
    mockRevokeSession.mockRejectedValue(new Error('fail'));
    renderSessions();
    await waitForLoad();

    await userEvent.click(screen.getByTestId('logout-button-s2'));
    await waitFor(() => {
      expect(screen.getByTestId('toast-error')).toBeTruthy();
    });
    expect(screen.getByTestId('session-item-s2')).toBeTruthy();
  });
});

// ─── 現在端末ログアウト ────────────────────────────────────────────────────

describe('現在端末ログアウト', () => {
  it('成功時に logout() が呼ばれ /login へ遷移する', async () => {
    mockGetSessions.mockResolvedValue([makeSession('s1', true)]);
    mockLogout.mockResolvedValue(undefined);
    renderSessions();
    await waitForLoad();

    await userEvent.click(screen.getByTestId('logout-button-s1'));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByText('FitLog にログイン')).toBeTruthy();
    });
  });

  it('成功時はエラートーストを表示しない', async () => {
    mockGetSessions.mockResolvedValue([makeSession('s1', true)]);
    mockLogout.mockResolvedValue(undefined);
    renderSessions();
    await waitForLoad();

    await userEvent.click(screen.getByTestId('logout-button-s1'));

    await waitFor(() => {
      expect(screen.getByText('FitLog にログイン')).toBeTruthy();
    });
    expect(screen.queryByTestId('toast-error')).toBeNull();
  });

  it('失敗時にも /login へ遷移する（finally）', async () => {
    mockGetSessions.mockResolvedValue([makeSession('s1', true)]);
    mockLogout.mockRejectedValue(new Error('network error'));
    renderSessions();
    await waitForLoad();

    await userEvent.click(screen.getByTestId('logout-button-s1'));

    await waitFor(() => {
      expect(screen.getByText('FitLog にログイン')).toBeTruthy();
    });
  });

  it('失敗時のエラーが navigate state 経由で LoginPage に表示される', async () => {
    mockGetSessions.mockResolvedValue([makeSession('s1', true)]);
    mockLogout.mockRejectedValue(new Error('network error'));
    renderSessions();
    await waitForLoad();

    await userEvent.click(screen.getByTestId('logout-button-s1'));

    await waitFor(() => {
      expect(
        screen.getByText(/サーバーとの通信に失敗しました/),
      ).toBeTruthy();
    });
  });

  it('未処理 Promise rejection が発生しない（catch で処理される）', async () => {
    mockGetSessions.mockResolvedValue([makeSession('s1', true)]);
    mockLogout.mockRejectedValue(new Error('network error'));

    const unhandledErrors: unknown[] = [];
    const handler = (e: PromiseRejectionEvent) => unhandledErrors.push(e.reason);
    window.addEventListener('unhandledrejection', handler);

    renderSessions();
    await waitForLoad();

    await userEvent.click(screen.getByTestId('logout-button-s1'));
    await waitFor(() => {
      expect(screen.getByText('FitLog にログイン')).toBeTruthy();
    });

    window.removeEventListener('unhandledrejection', handler);
    expect(unhandledErrors).toHaveLength(0);
  });

  it('現在端末では revokeSession を呼ばない', async () => {
    mockGetSessions.mockResolvedValue([makeSession('s1', true)]);
    mockLogout.mockResolvedValue(undefined);
    renderSessions();
    await waitForLoad();

    await userEvent.click(screen.getByTestId('logout-button-s1'));

    expect(mockRevokeSession).not.toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

// ─── 全他端末ログアウト ────────────────────────────────────────────────────

describe('全他端末ログアウト', () => {
  it('成功後の再取得成功 → 現在端末のみ残る', async () => {
    mockGetSessions
      .mockResolvedValueOnce([makeSession('s1', true), makeSession('s2', false)])
      .mockResolvedValueOnce([makeSession('s1', true)]);
    mockRevokeAllOtherSessions.mockResolvedValue(undefined);
    renderSessions();
    await waitForLoad();

    await userEvent.click(screen.getByTestId('revoke-all-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('session-item-s2')).toBeNull();
    });
    expect(screen.getByTestId('session-item-s1')).toBeTruthy();
  });

  it('処理中はボタンが disabled になる', async () => {
    mockGetSessions.mockResolvedValue([makeSession('s1', true), makeSession('s2', false)]);
    mockRevokeAllOtherSessions.mockReturnValue(new Promise(() => {}));
    renderSessions();
    await waitForLoad();

    await userEvent.click(screen.getByTestId('revoke-all-button'));

    await waitFor(() => {
      expect(screen.getByTestId('revoke-all-button')).toBeDisabled();
    });
  });

  it('連打しても revokeAllOtherSessions は重複実行されない', async () => {
    mockGetSessions.mockResolvedValue([makeSession('s1', true), makeSession('s2', false)]);
    mockRevokeAllOtherSessions.mockReturnValue(new Promise(() => {}));
    renderSessions();
    await waitForLoad();

    await userEvent.click(screen.getByTestId('revoke-all-button'));
    await userEvent.click(screen.getByTestId('revoke-all-button'));
    await userEvent.click(screen.getByTestId('revoke-all-button'));

    expect(mockRevokeAllOtherSessions).toHaveBeenCalledTimes(1);
  });

  it('revokeAll 失敗 → エラートーストを表示しリストはそのまま', async () => {
    mockGetSessions.mockResolvedValue([makeSession('s1', true), makeSession('s2', false)]);
    mockRevokeAllOtherSessions.mockRejectedValue(new Error('fail'));
    renderSessions();
    await waitForLoad();

    await userEvent.click(screen.getByTestId('revoke-all-button'));

    await waitFor(() => {
      expect(screen.getByTestId('toast-error')).toBeTruthy();
    });
    expect(screen.getByTestId('session-item-s2')).toBeTruthy();
  });

  it('revokeAll 成功後の再取得失敗 → 警告メッセージを表示し既存一覧を維持する', async () => {
    mockGetSessions
      .mockResolvedValueOnce([makeSession('s1', true), makeSession('s2', false)])
      .mockRejectedValueOnce(new Error('refetch fail'));
    mockRevokeAllOtherSessions.mockResolvedValue(undefined);
    renderSessions();
    await waitForLoad();

    await userEvent.click(screen.getByTestId('revoke-all-button'));

    await waitFor(() => {
      expect(screen.getByTestId('refetch-error')).toBeTruthy();
    });
    // 既存一覧は変更されない（s2 がまだ表示されている）
    expect(screen.getByTestId('session-item-s2')).toBeTruthy();
    // revokeAll 自体は成功なのでエラートーストは表示されない
    expect(screen.queryByTestId('toast-error')).toBeNull();
  });
});
