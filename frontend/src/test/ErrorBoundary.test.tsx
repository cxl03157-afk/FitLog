import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const ThrowingComponent = () => {
  throw new Error('Test render error: secret stack details here');
};

// ErrorBoundary in minimal Router context
const withRouter = (children: ReactNode, onReload = vi.fn()) =>
  render(
    <MemoryRouter>
      <ErrorBoundary onReload={onReload}>{children}</ErrorBoundary>
    </MemoryRouter>,
  );

// Mirror production structure: ErrorBoundary wraps Routes
const withRoutes = (onReload = vi.fn()) =>
  render(
    <MemoryRouter initialEntries={['/error']}>
      <ErrorBoundary onReload={onReload}>
        <Routes>
          <Route path="/" element={<div>タイムライン</div>} />
          <Route path="/error" element={<ThrowingComponent />} />
        </Routes>
      </ErrorBoundary>
    </MemoryRouter>,
  );

describe('ErrorBoundary', () => {
  // ── 通常表示 ────────────────────────────────────────────────────────
  it('1. 子コンポーネントが正常なら、そのまま表示される', () => {
    withRouter(<div>Normal content</div>);
    expect(screen.getByText('Normal content')).toBeTruthy();
  });

  it('2. 正常時はフォールバック画面が表示されない', () => {
    withRouter(<div>Normal content</div>);
    expect(screen.queryByText('予期しないエラーが発生しました')).toBeNull();
  });

  // ── 例外発生 ────────────────────────────────────────────────────────
  it('3-4. 子がレンダリング中に例外を投げると「予期しないエラーが発生しました」が表示される', () => {
    withRouter(<ThrowingComponent />);
    expect(screen.getByText('予期しないエラーが発生しました')).toBeTruthy();
  });

  it('5. 説明文が表示される', () => {
    withRouter(<ThrowingComponent />);
    expect(
      screen.getByText('ページを再読み込みして、もう一度お試しください。'),
    ).toBeTruthy();
  });

  it('6. 例外発生時に元の子コンポーネントは表示されない', () => {
    withRouter(
      <>
        <ThrowingComponent />
        <div>Child content should disappear</div>
      </>,
    );
    expect(screen.queryByText('Child content should disappear')).toBeNull();
    expect(screen.getByText('予期しないエラーが発生しました')).toBeTruthy();
  });

  it('7. 生の例外メッセージを利用者画面へ表示しない', () => {
    withRouter(<ThrowingComponent />);
    expect(screen.queryByText(/Test render error/)).toBeNull();
    expect(screen.queryByText(/secret stack/)).toBeNull();
  });

  it('8. stack trace を利用者画面へ表示しない', () => {
    withRouter(<ThrowingComponent />);
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).not.toMatch(/Error: Test render error/);
    expect(bodyText).not.toMatch(/at ThrowingComponent/);
  });

  it('9. componentDidCatch で console.error が呼ばれる', () => {
    withRouter(<ThrowingComponent />);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Unhandled React render error',
      expect.any(Error),
      expect.anything(),
    );
  });

  // ── 再読み込み ──────────────────────────────────────────────────────
  it('10. 「ページを再読み込み」ボタンが存在する', () => {
    withRouter(<ThrowingComponent />);
    expect(screen.getByRole('button', { name: 'ページを再読み込み' })).toBeTruthy();
  });

  it('11. 「ページを再読み込み」ボタンを押すと onReload が呼ばれる', async () => {
    const onReload = vi.fn();
    withRouter(<ThrowingComponent />, onReload);
    await userEvent.click(screen.getByRole('button', { name: 'ページを再読み込み' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  // ── タイムラインへ戻る ───────────────────────────────────────────────
  it('12. 「タイムラインへ戻る」ボタンが存在する', () => {
    withRouter(<ThrowingComponent />);
    expect(screen.getByRole('button', { name: 'タイムラインへ戻る' })).toBeTruthy();
  });

  it('13-15. 「タイムラインへ戻る」でErrorBoundaryがリセットされ / へ遷移する', async () => {
    withRoutes();
    // /error → ThrowingComponent → フォールバック表示
    expect(screen.getByText('予期しないエラーが発生しました')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'タイムラインへ戻る' }));

    // ErrorBoundary state がリセットされ / のコンテンツが表示される
    await waitFor(() => {
      expect(screen.getByText('タイムライン')).toBeTruthy();
    });
    expect(screen.queryByText('予期しないエラーが発生しました')).toBeNull();
  });

  // ── 再発 ────────────────────────────────────────────────────────────
  it('16. reset後に子が再び例外を投げると再度フォールバック画面が表示される', async () => {
    let throwCount = 0;
    const AlwaysThrow = () => {
      throwCount++;
      throw new Error(`render error #${throwCount}`);
    };

    render(
      <MemoryRouter initialEntries={['/']}>
        <ErrorBoundary onReload={vi.fn()}>
          <Routes>
            <Route path="/" element={<AlwaysThrow />} />
          </Routes>
        </ErrorBoundary>
      </MemoryRouter>,
    );

    // 1回目: フォールバック表示
    expect(screen.getByText('予期しないエラーが発生しました')).toBeTruthy();
    const firstCount = throwCount;

    // タイムラインへ戻る → reset + / へ遷移 → AlwaysThrow が再び投げる
    await userEvent.click(screen.getByRole('button', { name: 'タイムラインへ戻る' }));

    // 再度フォールバック表示
    await waitFor(() => {
      expect(screen.getByText('予期しないエラーが発生しました')).toBeTruthy();
    });
    expect(throwCount).toBeGreaterThan(firstCount);
  });

  // ── App 配置 ────────────────────────────────────────────────────────
  it('17. ErrorBoundary が Routes の外側に配置されることで Route 内の例外を捕捉できる', () => {
    const CrashingPage = () => {
      throw new Error('page crash');
    };

    render(
      <MemoryRouter initialEntries={['/']}>
        <ErrorBoundary onReload={vi.fn()}>
          {/* AuthProvider / ToastProvider を模す wrapper */}
          <div data-testid="providers">
            <Routes>
              <Route path="/" element={<CrashingPage />} />
            </Routes>
          </div>
        </ErrorBoundary>
      </MemoryRouter>,
    );

    // ErrorBoundary が Routes 内例外を捕捉してフォールバックを表示する
    expect(screen.getByText('予期しないエラーが発生しました')).toBeTruthy();
    // 生のエラー内容が画面に出ない
    expect(screen.queryByText(/page crash/)).toBeNull();
    // providers ラッパーは fallback に置き換わり非表示
    expect(screen.queryByTestId('providers')).toBeNull();
  });
});
