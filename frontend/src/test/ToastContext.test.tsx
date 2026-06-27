import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../contexts/ToastContext';
import { useToast } from '../hooks/useToast';

// ── Test Consumer ────────────────────────────────────────────────────────────

const ToastTestConsumer = () => {
  const { showToast } = useToast();
  return (
    <>
      <button type="button" onClick={() => showToast('success', '保存しました')}>
        success
      </button>
      <button type="button" onClick={() => showToast('error', '保存に失敗しました')}>
        error
      </button>
      <button type="button" onClick={() => showToast('success', '')}>
        empty
      </button>
      <button type="button" onClick={() => showToast('success', '   ')}>
        whitespace
      </button>
    </>
  );
};

const renderWithProvider = () =>
  render(
    <ToastProvider>
      <ToastTestConsumer />
    </ToastProvider>,
  );

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ToastContext', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // ─── 表示 ─────────────────────────────────────────────────────────────────

  it('success Toastを表示できる（role="status"・message表示）', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'success' }));

    expect(screen.getByText('保存しました')).toBeTruthy();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('error Toastを表示できる（role="alert"・message表示）', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'error' }));

    expect(screen.getByText('保存に失敗しました')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('初期状態ではToast UIが存在しない', () => {
    renderWithProvider();

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  // ─── 時間 ─────────────────────────────────────────────────────────────────

  it('4999ms時点ではToastが表示されたまま', async () => {
    vi.useFakeTimers();
    renderWithProvider();

    fireEvent.click(screen.getByRole('button', { name: 'success' }));
    expect(screen.getByRole('status')).toBeTruthy();

    await act(async () => { await vi.advanceTimersByTimeAsync(4999); });
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('5000ms経過後にToastが自動消去される', async () => {
    vi.useFakeTimers();
    renderWithProvider();

    fireEvent.click(screen.getByRole('button', { name: 'success' }));
    expect(screen.getByRole('status')).toBeTruthy();

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.queryByRole('status')).toBeNull();
  });

  // ─── 置き換え ──────────────────────────────────────────────────────────────

  it('新しいToastが表示されると旧Toastは即座に消える', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'success' }));
    expect(screen.getByText('保存しました')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'error' }));
    expect(screen.queryByText('保存しました')).toBeNull();
    expect(screen.getByText('保存に失敗しました')).toBeTruthy();
  });

  it('旧タイマーが後から発火しても2件目のToastが早く消えない', async () => {
    vi.useFakeTimers();
    renderWithProvider();

    // t=0: 1件目（T1: t=5000 に発火予定）
    fireEvent.click(screen.getByRole('button', { name: 'success' }));
    expect(screen.getByRole('status')).toBeTruthy();

    // t=3000 へ進める
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });

    // t=3000: 2件目（T1 キャンセル → T2: t=8000 に発火予定）
    fireEvent.click(screen.getByRole('button', { name: 'error' }));
    expect(screen.getByRole('alert')).toBeTruthy();

    // t=5000: T1 が発火するはずだったが cancel 済み → 2件目はまだ残る
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(screen.getByRole('alert')).toBeTruthy();

    // t=8000: T2 発火 → 2件目が消える
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  // ─── 閉じる操作 ────────────────────────────────────────────────────────────

  it('閉じるボタンでToastが即時消去される', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'success' }));
    expect(screen.getByRole('status')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /通知を閉じる/ }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('閉じるボタン後にタイマーが発火してもstate更新警告がない', async () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProvider();

    fireEvent.click(screen.getByRole('button', { name: 'success' }));
    fireEvent.click(screen.getByRole('button', { name: /通知を閉じる/ }));

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

    expect(screen.queryByRole('status')).toBeNull();
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Warning'),
    );
    consoleSpy.mockRestore();
  });

  // ─── unmount ───────────────────────────────────────────────────────────────

  it('タイマー残存状態でunmountしてもact警告がない', async () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderWithProvider();
    fireEvent.click(screen.getByRole('button', { name: 'success' }));
    unmount();

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('unmount後にタイマーを進めてもstate更新警告がない', async () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderWithProvider();
    fireEvent.click(screen.getByRole('button', { name: 'success' }));
    unmount();

    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // ─── Context利用 ───────────────────────────────────────────────────────────

  it('Provider外でuseToast()を呼ぶとエラーをthrowする', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ConsumerOutside = () => { useToast(); return null; };
    expect(() => render(<ConsumerOutside />)).toThrow(
      'useToast must be used within ToastProvider',
    );
    consoleSpy.mockRestore();
  });

  // ─── 境界値 ────────────────────────────────────────────────────────────────

  it('空文字messageはToastを表示しない', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'empty' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('空白のみmessageはToastを表示しない', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'whitespace' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  // ─── 連続呼び出し ──────────────────────────────────────────────────────────

  it('3回連続showToastで最後の1件だけが表示される', async () => {
    const ThreeCallConsumer = () => {
      const { showToast } = useToast();
      return (
        <button
          type="button"
          onClick={() => {
            showToast('success', '1件目');
            showToast('error', '2件目');
            showToast('success', '3件目');
          }}
        >
          三連続
        </button>
      );
    };
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ThreeCallConsumer />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: '三連続' }));
    expect(screen.queryByText('1件目')).toBeNull();
    expect(screen.queryByText('2件目')).toBeNull();
    expect(screen.getByText('3件目')).toBeTruthy();
  });
});
