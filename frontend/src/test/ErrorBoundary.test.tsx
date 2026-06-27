import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';

// ThrowingComponent が投げる固定メッセージ
const THROW_MSG = 'Test render error: secret stack details here';

let consoleSpy: ReturnType<typeof vi.spyOn>;
// このテストで意図的に発生させる window error メッセージの許可リスト
// テストごとに beforeEach でリセットし、ThrowingComponent を render する直前に登録する
let expectedWindowErrors: string[] = [];
let errorEventHandler: (event: ErrorEvent) => void;

beforeEach(() => {
  expectedWindowErrors = [];
  consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  // React 19 concurrent mode は ErrorBoundary が捕捉したエラーを window 'error'
  // イベントとして追加発火する。許可リストに登録された意図的なエラーだけを
  // capture phase で preventDefault() して Vitest に未処理エラーとして
  // 記録させないようにする。
  // - event.error.message: React 19 が生成するラッパーエラーのメッセージ
  // - event.error.cause.message: 元のコンポーネントエラーのメッセージ
  // どちらかが許可リストの文字列と完全一致する場合のみ抑制する。
  errorEventHandler = (event: ErrorEvent) => {
    if (!(event.error instanceof Error)) return;

    const directMessage = event.error.message;
    const causeMessage =
      event.error.cause instanceof Error ? event.error.cause.message : undefined;

    const isExpected = expectedWindowErrors.some(
      (expected) =>
        directMessage === expected ||
        (causeMessage !== undefined && causeMessage === expected),
    );

    if (isExpected) {
      event.preventDefault();
    }
  };

  window.addEventListener('error', errorEventHandler, true);
});

afterEach(() => {
  window.removeEventListener('error', errorEventHandler, true);
  expectedWindowErrors = [];
  vi.restoreAllMocks();
});

const ThrowingComponent = () => {
  throw new Error(THROW_MSG);
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
  // expectedWindowErrors は空のまま（beforeEach でリセット済み）。
  // 通常レンダリングでは window error が発生しないため、ハンドラも何も抑制しない。
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
    expectedWindowErrors = [THROW_MSG];
    withRouter(<ThrowingComponent />);
    expect(screen.getByText('予期しないエラーが発生しました')).toBeTruthy();
  });

  it('5. 説明文が表示される', () => {
    expectedWindowErrors = [THROW_MSG];
    withRouter(<ThrowingComponent />);
    expect(
      screen.getByText('ページを再読み込みして、もう一度お試しください。'),
    ).toBeTruthy();
  });

  it('6. 例外発生時に元の子コンポーネントは表示されない', () => {
    expectedWindowErrors = [THROW_MSG];
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
    expectedWindowErrors = [THROW_MSG];
    withRouter(<ThrowingComponent />);
    expect(screen.queryByText(/Test render error/)).toBeNull();
    expect(screen.queryByText(/secret stack/)).toBeNull();
  });

  it('8. stack trace を利用者画面へ表示しない', () => {
    expectedWindowErrors = [THROW_MSG];
    withRouter(<ThrowingComponent />);
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).not.toMatch(/Error: Test render error/);
    expect(bodyText).not.toMatch(/at ThrowingComponent/);
  });

  it('9. componentDidCatch で console.error が呼ばれる', () => {
    expectedWindowErrors = [THROW_MSG];
    withRouter(<ThrowingComponent />);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Unhandled React render error',
      expect.any(Error),
      expect.anything(),
    );
  });

  // ── 再読み込み ──────────────────────────────────────────────────────
  it('10. 「ページを再読み込み」ボタンが存在する', () => {
    expectedWindowErrors = [THROW_MSG];
    withRouter(<ThrowingComponent />);
    expect(screen.getByRole('button', { name: 'ページを再読み込み' })).toBeTruthy();
  });

  it('11. 「ページを再読み込み」ボタンを押すと onReload が呼ばれる', async () => {
    expectedWindowErrors = [THROW_MSG];
    const onReload = vi.fn();
    withRouter(<ThrowingComponent />, onReload);
    await userEvent.click(screen.getByRole('button', { name: 'ページを再読み込み' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  // ── タイムラインへ戻る ───────────────────────────────────────────────
  it('12. 「タイムラインへ戻る」ボタンが存在する', () => {
    expectedWindowErrors = [THROW_MSG];
    withRouter(<ThrowingComponent />);
    expect(screen.getByRole('button', { name: 'タイムラインへ戻る' })).toBeTruthy();
  });

  it('13-15. 「タイムラインへ戻る」でErrorBoundaryがリセットされ / へ遷移する', async () => {
    expectedWindowErrors = [THROW_MSG];
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
    // AlwaysThrow はレンダリングされるたびに動的なメッセージで例外を投げる。
    // 投げる直前にそのメッセージを許可リストへ追加して window error を抑制する。
    const AlwaysThrow = () => {
      throwCount++;
      const msg = `render error #${throwCount}`;
      expectedWindowErrors.push(msg);
      throw new Error(msg);
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
    const PAGE_CRASH_MSG = 'page crash';
    expectedWindowErrors = [PAGE_CRASH_MSG];

    const CrashingPage = () => {
      throw new Error(PAGE_CRASH_MSG);
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
