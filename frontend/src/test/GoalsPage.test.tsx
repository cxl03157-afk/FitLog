import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GoalsPage from '../pages/GoalsPage';
import * as AuthContextModule from '../contexts/AuthContext';
import * as goalsApi from '../api/goals';
import * as exercisesApi from '../api/exercises';
import type { Goal } from '../types/goal';

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal<typeof AuthContextModule>();
  return { ...mod, useAuth: vi.fn() };
});

vi.mock('../api/goals', () => ({
  getGoals: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
}));

vi.mock('../api/exercises', () => ({
  fetchExercises: vi.fn(),
}));

vi.mock('../components/NavBar', () => ({
  default: () => <div data-testid="navbar" />,
}));

const mockUseAuth = vi.mocked(AuthContextModule.useAuth);
const mockGetGoals = vi.mocked(goalsApi.getGoals);
const mockCreateGoal = vi.mocked(goalsApi.createGoal);
const mockUpdateGoal = vi.mocked(goalsApi.updateGoal);
const mockDeleteGoal = vi.mocked(goalsApi.deleteGoal);
const mockFetchExercises = vi.mocked(exercisesApi.fetchExercises);

const mockExercises = [
  { id: 'e1', name: 'ベンチプレス', category: '胸', description: null },
  { id: 'e2', name: '懸垂', category: '背中', description: null },
];

const makeGoal = (overrides?: Partial<Goal>): Goal => ({
  id: 'g1',
  userId: 'u1',
  exerciseId: 'e1',
  exercise: { id: 'e1', name: 'ベンチプレス', category: '胸' },
  targetWeightKg: 100,
  targetReps: null,
  deadline: '2026-12-31',
  status: 'IN_PROGRESS',
  achievedAt: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <GoalsPage />
    </MemoryRouter>,
  );

const openModal = async () => {
  fireEvent.click(screen.getByRole('button', { name: '目標を追加' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
};


describe('GoalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 'u1',
        username: 'testuser',
        displayName: 'テスト',
        email: 'test@example.com',
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
    mockGetGoals.mockResolvedValue([]);
    mockFetchExercises.mockResolvedValue(mockExercises);
    mockCreateGoal.mockResolvedValue(makeGoal());
    mockUpdateGoal.mockResolvedValue(makeGoal());
    mockDeleteGoal.mockResolvedValue(undefined);
  });

  // ─────────────────────────────────────────
  // 初回一覧取得
  // ─────────────────────────────────────────
  it('初回レンダリングで getGoals が status なしで呼ばれる', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalledWith(undefined));
  });

  it('「すべて」ではstatusを送らない', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalledTimes(1));
    expect(mockGetGoals).toHaveBeenCalledWith(undefined);
    expect(mockGetGoals).not.toHaveBeenCalledWith('IN_PROGRESS');
    expect(mockGetGoals).not.toHaveBeenCalledWith('ACHIEVED');
    expect(mockGetGoals).not.toHaveBeenCalledWith('ABANDONED');
  });

  // ─────────────────────────────────────────
  // 一覧表示とステータスバッジ
  // ─────────────────────────────────────────
  it('一覧にgoalカードが表示される', async () => {
    mockGetGoals.mockResolvedValue([makeGoal()]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('ベンチプレス')).toBeInTheDocument();
    });
    expect(screen.getByText('目標重量: 100 kg')).toBeInTheDocument();
    expect(screen.getByText('期限: 2026-12-31')).toBeInTheDocument();
  });

  it('IN_PROGRESSゴールに「進行中」バッジが表示される', async () => {
    mockGetGoals.mockResolvedValue([makeGoal({ status: 'IN_PROGRESS' })]);
    renderPage();
    await waitFor(() => expect(screen.getByText('進行中')).toBeInTheDocument());
  });

  it('ACHIEVEDゴールに「達成」バッジが表示される', async () => {
    mockGetGoals.mockResolvedValue([makeGoal({ status: 'ACHIEVED', achievedAt: '2026-06-20T10:00:00.000Z' })]);
    renderPage();
    await waitFor(() => expect(screen.getByText('達成')).toBeInTheDocument());
    expect(screen.getByText('達成日: 2026/06/20')).toBeInTheDocument();
  });

  it('ABONDONEDゴールに「放棄」バッジが表示される', async () => {
    mockGetGoals.mockResolvedValue([makeGoal({ status: 'ABANDONED' })]);
    renderPage();
    await waitFor(() => expect(screen.getByText('放棄')).toBeInTheDocument());
  });

  it('targetWeightKg=null のとき「0 kg」を表示しない', async () => {
    mockGetGoals.mockResolvedValue([makeGoal({ targetWeightKg: null, targetReps: 10 })]);
    renderPage();
    await waitFor(() => expect(screen.getByText('目標回数: 10 回')).toBeInTheDocument());
    expect(screen.queryByText(/0 kg/)).not.toBeInTheDocument();
  });

  it('targetReps=null のとき「0 回」を表示しない', async () => {
    mockGetGoals.mockResolvedValue([makeGoal({ targetWeightKg: 100, targetReps: null })]);
    renderPage();
    await waitFor(() => expect(screen.getByText('目標重量: 100 kg')).toBeInTheDocument());
    expect(screen.queryByText(/0 回/)).not.toBeInTheDocument();
  });

  it('deadline=null のとき「期限なし」を表示する', async () => {
    mockGetGoals.mockResolvedValue([makeGoal({ deadline: null })]);
    renderPage();
    await waitFor(() => expect(screen.getByText('期限: 期限なし')).toBeInTheDocument());
  });

  // ─────────────────────────────────────────
  // 0件時の表示
  // ─────────────────────────────────────────
  it('「すべて」タブで0件のとき「目標がありません」を表示する', async () => {
    mockGetGoals.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText('目標がありません')).toBeInTheDocument());
  });

  it('「進行中」タブで0件のとき「進行中の目標がありません」を表示する', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '進行中' }));
    await waitFor(() => expect(screen.getByText('進行中の目標がありません')).toBeInTheDocument());
  });

  it('「達成」タブで0件のとき「達成済みの目標がありません」を表示する', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '達成' }));
    await waitFor(() => expect(screen.getByText('達成済みの目標がありません')).toBeInTheDocument());
  });

  it('「放棄」タブで0件のとき「放棄済みの目標がありません」を表示する', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '放棄' }));
    await waitFor(() => expect(screen.getByText('放棄済みの目標がありません')).toBeInTheDocument());
  });

  // ─────────────────────────────────────────
  // フィルタタブ
  // ─────────────────────────────────────────
  it('「進行中」タブで status=IN_PROGRESS を送る', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalledWith(undefined));
    fireEvent.click(screen.getByRole('tab', { name: '進行中' }));
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalledWith('IN_PROGRESS'));
  });

  it('「達成」タブで status=ACHIEVED を送る', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '達成' }));
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalledWith('ACHIEVED'));
  });

  it('「放棄」タブで status=ABANDONED を送る', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '放棄' }));
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalledWith('ABANDONED'));
  });

  it('タブ切り替え時に前の一覧がクリアされる（ローディング表示になる）', async () => {
    let resolveSecond!: (v: Goal[]) => void;
    const secondDeferred = new Promise<Goal[]>((resolve) => {
      resolveSecond = resolve;
    });

    mockGetGoals
      .mockResolvedValueOnce([makeGoal()])
      .mockReturnValueOnce(secondDeferred);

    renderPage();
    await waitFor(() => expect(screen.getByText('ベンチプレス')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: '進行中' }));

    await waitFor(() => {
      expect(screen.queryByText('ベンチプレス')).not.toBeInTheDocument();
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    resolveSecond([]);
    await waitFor(() => expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument());
  });

  it('古いレスポンスが現在タブの一覧を上書きしない', async () => {
    let resolveFirst!: (v: Goal[]) => void;
    const firstDeferred = new Promise<Goal[]>((resolve) => {
      resolveFirst = resolve;
    });

    const currentGoal = makeGoal({ id: 'g-current', exercise: { id: 'e2', name: '現在のデータ', category: '背中' } });
    const staleGoal = makeGoal({ id: 'g-stale', exercise: { id: 'e1', name: '古いデータ', category: '胸' } });

    mockGetGoals
      .mockReturnValueOnce(firstDeferred)       // all タブ: 遅延
      .mockResolvedValueOnce([currentGoal]);    // 進行中タブ: 即時解決

    renderPage();

    fireEvent.click(screen.getByRole('tab', { name: '進行中' }));

    await waitFor(() => expect(screen.getByText('現在のデータ')).toBeInTheDocument());

    resolveFirst([staleGoal]);
    await new Promise((r) => setTimeout(r, 50));

    expect(screen.queryByText('古いデータ')).not.toBeInTheDocument();
    expect(screen.getByText('現在のデータ')).toBeInTheDocument();
  });

  // ─────────────────────────────────────────
  // モーダルの開閉
  // ─────────────────────────────────────────
  it('「目標を追加」ボタンでモーダルが開く', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '目標を追加' })).toBeInTheDocument();
  });

  it('キャンセルボタンでモーダルが閉じる', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ─────────────────────────────────────────
  // バリデーション
  // ─────────────────────────────────────────
  it('重量・回数がともに未入力でエラーを表示する', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('目標重量または目標回数を入力してください'),
    );
    expect(mockCreateGoal).not.toHaveBeenCalled();
  });

  it('種目未選択でエラーを表示する', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('種目を選択してください'),
    );
    expect(mockCreateGoal).not.toHaveBeenCalled();
  });

  it('重量 0.01 は有効（境界値: 最小値）', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '0.01' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(mockCreateGoal).toHaveBeenCalledWith(
      expect.objectContaining({ targetWeightKg: 0.01 }),
    ));
  });

  it('重量 0 はエラー（境界値: 最小値未満）', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('目標重量は0.01以上1000以下で入力してください'),
    );
    expect(mockCreateGoal).not.toHaveBeenCalled();
  });

  it('重量 1000 は有効（境界値: 最大値）', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(mockCreateGoal).toHaveBeenCalledWith(
      expect.objectContaining({ targetWeightKg: 1000 }),
    ));
  });

  it('重量 1000.01 はエラー（境界値: 最大値超過）', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '1000.01' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('目標重量は0.01以上1000以下で入力してください'),
    );
    expect(mockCreateGoal).not.toHaveBeenCalled();
  });

  it('回数 1 は有効（境界値: 最小値）', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByPlaceholderText('例: 10'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(mockCreateGoal).toHaveBeenCalledWith(
      expect.objectContaining({ targetReps: 1 }),
    ));
  });

  it('回数 0 はエラー（境界値: 最小値未満）', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByPlaceholderText('例: 10'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('目標回数は1以上10000以下の整数で入力してください'),
    );
    expect(mockCreateGoal).not.toHaveBeenCalled();
  });

  it('回数 10000 は有効（境界値: 最大値）', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByPlaceholderText('例: 10'), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(mockCreateGoal).toHaveBeenCalledWith(
      expect.objectContaining({ targetReps: 10000 }),
    ));
  });

  it('回数 10001 はエラー（境界値: 最大値超過）', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByPlaceholderText('例: 10'), { target: { value: '10001' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('目標回数は1以上10000以下の整数で入力してください'),
    );
    expect(mockCreateGoal).not.toHaveBeenCalled();
  });

  it('回数 1.5 はエラー（小数は不可）', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByPlaceholderText('例: 10'), { target: { value: '1.5' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('目標回数は1以上10000以下の整数で入力してください'),
    );
    expect(mockCreateGoal).not.toHaveBeenCalled();
  });

  it('過去の期限はエラーを表示する', async () => {
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(d);
    })();
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '100' } });
    // date input を label テキストで特定
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: yesterday } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('期限は本日以降の日付を指定してください'),
    );
    expect(mockCreateGoal).not.toHaveBeenCalled();
  });

  it('本日または翌日の期限は有効', async () => {
    const tomorrow = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(d);
    })();
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '100' } });
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: tomorrow } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(mockCreateGoal).toHaveBeenCalledWith(
      expect.objectContaining({ deadline: tomorrow }),
    ));
  });

  it('空文字・スペースのみの重量は未入力として扱い payload から除外する', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    // 重量は空、回数のみ入力
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '   ' } });
    fireEvent.change(screen.getByPlaceholderText('例: 10'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(mockCreateGoal).toHaveBeenCalledWith({ exerciseId: 'e1', targetReps: 10 }),
    );
  });

  it('空文字・スペースのみの回数は未入力として扱い payload から除外する', async () => {
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '100' } });
    // 回数は空
    fireEvent.change(screen.getByPlaceholderText('例: 10'), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(mockCreateGoal).toHaveBeenCalledWith({ exerciseId: 'e1', targetWeightKg: 100 }),
    );
  });

  // ─────────────────────────────────────────
  // 作成
  // ─────────────────────────────────────────
  it('保存中は保存ボタンが disabled になる', async () => {
    mockCreateGoal.mockReturnValue(new Promise(() => {})); // 解決しない
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '保存中...' })).toBeDisabled());
  });

  it('POST成功後にモーダルが閉じ、現在タブ条件で再取得する', async () => {
    const updated = makeGoal({ id: 'g-new', exercise: { id: 'e1', name: '新しい目標', category: '胸' } });
    mockGetGoals
      .mockResolvedValueOnce([])      // 初回
      .mockResolvedValueOnce([updated]); // refetch

    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalledTimes(1));
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('新しい目標')).toBeInTheDocument());
  });

  it('POST失敗時にモーダルが閉じず、入力内容が維持される', async () => {
    mockCreateGoal.mockRejectedValue(new Error('server error'));
    renderPage();
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalled());
    await openModal();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('保存に失敗しました'),
    );
    // モーダルは閉じていない
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // 入力値が維持されている（weightの値、selectの表示テキスト）
    expect(screen.getByDisplayValue('80')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ベンチプレス')).toBeInTheDocument();
  });

  // ─────────────────────────────────────────
  // 達成
  // ─────────────────────────────────────────
  it('達成成功後に再取得する', async () => {
    mockGetGoals
      .mockResolvedValueOnce([makeGoal()])
      .mockResolvedValueOnce([makeGoal({ status: 'ACHIEVED', achievedAt: '2026-06-24T00:00:00.000Z' })]);

    renderPage();
    await waitFor(() => expect(screen.getByText('ベンチプレス')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '達成' }));

    await waitFor(() => expect(mockUpdateGoal).toHaveBeenCalledWith('g1', { status: 'ACHIEVED' }));
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalledTimes(2));
  });

  it('達成失敗(400)のとき「この目標はすでに完了しています」を表示する', async () => {
    mockGetGoals.mockResolvedValue([makeGoal()]);
    mockUpdateGoal.mockRejectedValue({ response: { status: 400 } });

    renderPage();
    await waitFor(() => expect(screen.getByText('ベンチプレス')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '達成' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('この目標はすでに完了しています'),
    );
    expect(mockGetGoals).toHaveBeenCalledTimes(1);
  });

  it('達成失敗(500)のとき「操作に失敗しました」を表示する', async () => {
    mockGetGoals.mockResolvedValue([makeGoal()]);
    mockUpdateGoal.mockRejectedValue({ response: { status: 500 } });

    renderPage();
    await waitFor(() => expect(screen.getByText('ベンチプレス')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '達成' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('操作に失敗しました'),
    );
  });

  // ─────────────────────────────────────────
  // 放棄フロー
  // ─────────────────────────────────────────
  it('放棄ボタンでインライン確認が表示される', async () => {
    mockGetGoals.mockResolvedValue([makeGoal()]);
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: '放棄' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '放棄' }));

    expect(screen.getByText('本当に放棄しますか？')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '放棄する' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
  });

  it('放棄確認のキャンセルで確認を閉じる', async () => {
    mockGetGoals.mockResolvedValue([makeGoal()]);
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: '放棄' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '放棄' }));
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(screen.queryByText('本当に放棄しますか？')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '放棄' })).toBeInTheDocument();
  });

  it('「放棄する」で updateGoal が呼ばれ再取得する', async () => {
    mockGetGoals
      .mockResolvedValueOnce([makeGoal()])
      .mockResolvedValueOnce([makeGoal({ status: 'ABANDONED' })]);

    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: '放棄' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '放棄' }));
    fireEvent.click(screen.getByRole('button', { name: '放棄する' }));

    await waitFor(() => expect(mockUpdateGoal).toHaveBeenCalledWith('g1', { status: 'ABANDONED' }));
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalledTimes(2));
  });

  it('放棄失敗のとき一覧を変更せずエラーを表示する', async () => {
    mockGetGoals.mockResolvedValue([makeGoal()]);
    mockUpdateGoal.mockRejectedValue(new Error('error'));

    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: '放棄' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '放棄' }));
    fireEvent.click(screen.getByRole('button', { name: '放棄する' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('操作に失敗しました'),
    );
    expect(mockGetGoals).toHaveBeenCalledTimes(1);
    expect(screen.getByText('ベンチプレス')).toBeInTheDocument();
  });

  // ─────────────────────────────────────────
  // 削除フロー
  // ─────────────────────────────────────────
  it('削除ボタンでインライン確認が表示される', async () => {
    mockGetGoals.mockResolvedValue([makeGoal()]);
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '削除' }));

    expect(screen.getByText('削除しますか？')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '削除する' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
  });

  it('削除確認のキャンセルで確認を閉じる', async () => {
    mockGetGoals.mockResolvedValue([makeGoal()]);
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(screen.queryByText('削除しますか？')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
  });

  it('「削除する」で deleteGoal が呼ばれ再取得する', async () => {
    mockGetGoals
      .mockResolvedValueOnce([makeGoal()])
      .mockResolvedValueOnce([]);

    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    fireEvent.click(screen.getByRole('button', { name: '削除する' }));

    await waitFor(() => expect(mockDeleteGoal).toHaveBeenCalledWith('g1'));
    await waitFor(() => expect(mockGetGoals).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('目標がありません')).toBeInTheDocument());
  });

  it('削除失敗のとき一覧を変更せずエラーを表示する', async () => {
    mockGetGoals.mockResolvedValue([makeGoal()]);
    mockDeleteGoal.mockRejectedValue(new Error('error'));

    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    fireEvent.click(screen.getByRole('button', { name: '削除する' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('削除に失敗しました'),
    );
    expect(mockGetGoals).toHaveBeenCalledTimes(1);
    expect(screen.getByText('ベンチプレス')).toBeInTheDocument();
  });

  // ─────────────────────────────────────────
  // エラーが自動消去されない
  // ─────────────────────────────────────────
  it('一覧取得エラーが自動消去されない', async () => {
    mockGetGoals.mockRejectedValue(new Error('network error'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('一覧の取得に失敗しました'),
    );
    await new Promise((r) => setTimeout(r, 200));
    expect(screen.getByRole('alert')).toHaveTextContent('一覧の取得に失敗しました');
  });

  it('達成/放棄/削除のカードエラーが自動消去されない', async () => {
    mockGetGoals.mockResolvedValue([makeGoal()]);
    mockUpdateGoal.mockRejectedValue(new Error('error'));

    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: '達成' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '達成' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('操作に失敗しました'));
    await new Promise((r) => setTimeout(r, 200));
    expect(screen.getByRole('alert')).toHaveTextContent('操作に失敗しました');
  });

  // ─────────────────────────────────────────
  // 旧 stubs パスを参照していないこと
  // ─────────────────────────────────────────
  it('App.tsx が stubs/GoalsPage を参照していないこと', async () => {
    const appModule = await import('../App');
    expect(JSON.stringify(appModule)).not.toContain('stubs/GoalsPage');
  });
});
