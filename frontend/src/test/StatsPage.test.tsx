import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import StatsPage from '../pages/StatsPage';
import * as AuthContextModule from '../contexts/AuthContext';
import * as statsApi from '../api/stats';
import * as exercisesApi from '../api/exercises';
import type { ExerciseStatResponse, PeriodStat } from '../types/stats';
import type { Exercise } from '../types/workout';
import React from 'react';

// Recharts を DOM でレンダリングせずにテスト可能な形でモック
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  BarChart: ({ data, children }: { data: PeriodStat[]; children: React.ReactNode }) => (
    <div data-testid="bar-chart" data-count={String(data.length)}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, name }: { dataKey: string; name: string }) => (
    <div data-testid="bar" data-key={dataKey} data-name={name} />
  ),
  LineChart: ({ data, children }: { data: unknown[]; children: React.ReactNode }) => (
    <div data-testid="line-chart" data-count={String(data.length)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, name }: { dataKey: string; name: string }) => (
    <div data-testid="line" data-key={dataKey} data-name={name} />
  ),
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}));

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal<typeof AuthContextModule>();
  return { ...mod, useAuth: vi.fn() };
});

vi.mock('../api/stats', () => ({
  getWeeklyStats: vi.fn(),
  getMonthlyStats: vi.fn(),
  getExerciseStats: vi.fn(),
}));

vi.mock('../api/exercises', () => ({
  fetchExercises: vi.fn(),
  createExercise: vi.fn(),
}));

vi.mock('../components/NavBar', () => ({
  default: () => <div data-testid="navbar" />,
}));

const mockUseAuth = vi.mocked(AuthContextModule.useAuth);
const mockGetWeeklyStats = vi.mocked(statsApi.getWeeklyStats);
const mockGetMonthlyStats = vi.mocked(statsApi.getMonthlyStats);
const mockGetExerciseStats = vi.mocked(statsApi.getExerciseStats);
const mockFetchExercises = vi.mocked(exercisesApi.fetchExercises);

const makeWeeklyStats = (): PeriodStat[] =>
  Array.from({ length: 12 }, (_, i) => ({
    period: `2026-04-${String(6 + i * 7).padStart(2, '0')}`,
    postCount: i === 11 ? 3 : 0,
    totalVolume: i === 11 ? 9000 : 0,
  }));

const makeAllZeroStats = (): PeriodStat[] =>
  Array.from({ length: 12 }, (_, i) => ({
    period: `2026-04-${String(6 + i * 7).padStart(2, '0')}`,
    postCount: 0,
    totalVolume: 0,
  }));

const makeMonthlyStats = (): PeriodStat[] =>
  Array.from({ length: 12 }, (_, i) => ({
    period: `2025-${String(7 + i).padStart(2, '0')}`,
    postCount: i < 6 ? 0 : 2,
    totalVolume: i < 6 ? 0 : 5000,
  }));

const mockExercises: Exercise[] = [
  { id: '1', name: 'ベンチプレス', category: '胸', description: null, userId: null },
  { id: '2', name: '懸垂', category: '背中', description: null, userId: null },
];

const makeWeightExercise = (): ExerciseStatResponse => ({
  exerciseId: '1',
  exerciseName: 'ベンチプレス',
  metric: 'weight',
  unit: 'kg',
  records: [
    { date: '2026-06-15', value: 80 },
    { date: '2026-06-22', value: 82.5 },
  ],
});

const makeRepsExercise = (): ExerciseStatResponse => ({
  exerciseId: '2',
  exerciseName: '懸垂',
  metric: 'reps',
  unit: 'reps',
  records: [
    { date: '2026-06-15', value: 8 },
    { date: '2026-06-22', value: 10 },
  ],
});

const makeNoneExercise = (): ExerciseStatResponse => ({
  exerciseId: '2',
  exerciseName: '懸垂',
  metric: 'none',
  unit: null,
  records: [],
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <StatsPage />
      </ToastProvider>
    </MemoryRouter>,
  );

describe('StatsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: '10', username: 'testuser', displayName: 'テスト', email: 'test@example.com', avatarUrl: null, bio: null },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateCurrentUser: vi.fn(),
    });
    mockFetchExercises.mockResolvedValue(mockExercises);
    mockGetWeeklyStats.mockResolvedValue(makeWeeklyStats());
    mockGetMonthlyStats.mockResolvedValue(makeMonthlyStats());
  });

  // ──────────────────────────────────────
  // タブ初期表示
  // ──────────────────────────────────────
  it('デフォルトで週間タブが選択され getWeeklyStats を呼ぶ', async () => {
    renderPage();
    await waitFor(() => expect(mockGetWeeklyStats).toHaveBeenCalledTimes(1));
    expect(mockGetMonthlyStats).not.toHaveBeenCalled();
  });

  it('週間タブが aria-selected=true で表示される', async () => {
    renderPage();
    const tab = await screen.findByRole('tab', { name: '週間' });
    expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  // ──────────────────────────────────────
  // 棒グラフ・データ件数
  // ──────────────────────────────────────
  it('BarChart に 12 件のデータが渡される', async () => {
    renderPage();
    await waitFor(() => {
      const charts = screen.getAllByTestId('bar-chart');
      expect(charts[0]).toHaveAttribute('data-count', '12');
    });
  });

  it('投稿回数グラフが dataKey="postCount"', async () => {
    renderPage();
    await waitFor(() => {
      const bars = screen.getAllByTestId('bar');
      expect(bars.some((b) => b.getAttribute('data-key') === 'postCount')).toBe(true);
    });
  });

  it('総ボリュームグラフが dataKey="totalVolume"', async () => {
    renderPage();
    await waitFor(() => {
      const bars = screen.getAllByTestId('bar');
      expect(bars.some((b) => b.getAttribute('data-key') === 'totalVolume')).toBe(true);
    });
  });

  it('一部 0 を含む 12 件でも BarChart が表示される', async () => {
    renderPage();
    await waitFor(() => {
      const charts = screen.getAllByTestId('bar-chart');
      expect(charts[0]).toHaveAttribute('data-count', '12');
    });
  });

  // ──────────────────────────────────────
  // サマリーテキスト
  // ──────────────────────────────────────
  it('投稿回数・総ボリュームのサマリーテキストが表示される', async () => {
    renderPage();
    await waitFor(() => {
      const summaries = screen.getAllByText(/合計:/);
      // 投稿回数と総ボリュームの2件が表示される
      expect(summaries).toHaveLength(2);
    });
  });

  // ──────────────────────────────────────
  // 全 0 件の場合
  // ──────────────────────────────────────
  it('全 12 期間が 0 のとき BarChart が表示されず「まだトレーニング記録がありません」が表示される', async () => {
    mockGetWeeklyStats.mockResolvedValue(makeAllZeroStats());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('まだトレーニング記録がありません')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('bar-chart')).toBeNull();
  });

  // ──────────────────────────────────────
  // タブ切り替え
  // ──────────────────────────────────────
  it('月間タブをクリックすると getMonthlyStats が呼ばれる', async () => {
    renderPage();
    await waitFor(() => expect(mockGetWeeklyStats).toHaveBeenCalledTimes(1));

    const monthlyTab = screen.getByRole('tab', { name: '月間' });
    fireEvent.click(monthlyTab);

    await waitFor(() => expect(mockGetMonthlyStats).toHaveBeenCalledTimes(1));
  });

  it('月間タブ切り替え後に BarChart に 12 件のデータが渡される', async () => {
    renderPage();
    await waitFor(() => expect(mockGetWeeklyStats).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('tab', { name: '月間' }));

    await waitFor(() => {
      const charts = screen.getAllByTestId('bar-chart');
      expect(charts[0]).toHaveAttribute('data-count', '12');
    });
  });

  // ──────────────────────────────────────
  // エラー状態
  // ──────────────────────────────────────
  it('getWeeklyStats エラー時に「データ取得に失敗しました」を表示する', async () => {
    mockGetWeeklyStats.mockRejectedValue(new Error('network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('データ取得に失敗しました');
    });
    expect(screen.queryByTestId('bar-chart')).toBeNull();
  });

  it('fetchExercises エラー時に「種目の取得に失敗しました」を表示する', async () => {
    mockFetchExercises.mockRejectedValue(new Error('network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('種目の取得に失敗しました');
    });
  });

  // ──────────────────────────────────────
  // ローディング状態
  // ──────────────────────────────────────
  it('ローディング中に「読み込み中...」が表示される', async () => {
    // 解決しない Promise でローディング状態を維持
    mockGetWeeklyStats.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  // ──────────────────────────────────────
  // 種目ドロップダウン
  // ──────────────────────────────────────
  it('種目ドロップダウンに exercises が表示される', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'ベンチプレス' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '懸垂' })).toBeInTheDocument();
    });
  });

  // ──────────────────────────────────────
  // 種目別グラフ（weight）
  // ──────────────────────────────────────
  it('種目選択後に getExerciseStats が呼ばれる', async () => {
    mockGetExerciseStats.mockResolvedValue(makeWeightExercise());
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: 'ベンチプレス' })).toBeInTheDocument());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });

    await waitFor(() => expect(mockGetExerciseStats).toHaveBeenCalledWith('1'));
  });

  it('metric=weight のとき「最大重量の推移」タイトルと LineChart が表示される', async () => {
    mockGetExerciseStats.mockResolvedValue(makeWeightExercise());
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: 'ベンチプレス' })).toBeInTheDocument());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('最大重量の推移')).toBeInTheDocument();
      const chart = screen.getByTestId('line-chart');
      expect(chart).toHaveAttribute('data-count', '2');
    });
  });

  it('種目別 LineChart が dataKey="value"', async () => {
    mockGetExerciseStats.mockResolvedValue(makeWeightExercise());
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: 'ベンチプレス' })).toBeInTheDocument());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });

    await waitFor(() => {
      const line = screen.getByTestId('line');
      expect(line).toHaveAttribute('data-key', 'value');
    });
  });

  it('metric=reps のとき「最大回数の推移」タイトルと LineChart が表示される', async () => {
    mockGetExerciseStats.mockResolvedValue(makeRepsExercise());
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: '懸垂' })).toBeInTheDocument());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });

    await waitFor(() => {
      expect(screen.getByText('最大回数の推移')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  it('metric=none のとき LineChart が表示されず「この種目には表示できる記録がありません」が表示される', async () => {
    mockGetExerciseStats.mockResolvedValue(makeNoneExercise());
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: '懸垂' })).toBeInTheDocument());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });

    await waitFor(() => {
      expect(
        screen.getByText('この種目には表示できる記録がありません'),
      ).toBeInTheDocument();
    });
    expect(screen.queryByTestId('line-chart')).toBeNull();
  });

  it('getExerciseStats エラー時に「データ取得に失敗しました」を表示する', async () => {
    mockGetExerciseStats.mockRejectedValue(new Error('network error'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: 'ベンチプレス' })).toBeInTheDocument());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.some((a) => a.textContent === 'データ取得に失敗しました')).toBe(true);
    });
    expect(screen.queryByTestId('line-chart')).toBeNull();
  });

  // ──────────────────────────────────────
  // 旧 stubs パスを参照していないこと
  // ──────────────────────────────────────
  it('App.tsx が stubs/StatsPage を参照していないこと', async () => {
    const appModule = await import('../App');
    expect(JSON.stringify(appModule)).not.toContain('stubs/StatsPage');
  });
});
