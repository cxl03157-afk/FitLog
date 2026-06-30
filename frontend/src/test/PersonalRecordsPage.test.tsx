import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PersonalRecordsPage from '../pages/PersonalRecordsPage';
import { ToastProvider } from '../contexts/ToastContext';
import * as AuthContextModule from '../contexts/AuthContext';
import * as prApi from '../api/personalRecords';
import * as exercisesApi from '../api/exercises';
import type { PersonalRecord } from '../types/personalRecord';

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal<typeof AuthContextModule>();
  return { ...mod, useAuth: vi.fn() };
});

vi.mock('../api/personalRecords', () => ({
  fetchPersonalRecords: vi.fn(),
  createPersonalRecord: vi.fn(),
  updatePersonalRecord: vi.fn(),
  deletePersonalRecord: vi.fn(),
  fetchPersonalRecord: vi.fn(),
}));

vi.mock('../api/exercises', () => ({
  fetchExercises: vi.fn(),
  createExercise: vi.fn(),
}));

vi.mock('../components/NavBar', () => ({
  default: () => <div data-testid="navbar" />,
}));

const mockUseAuth = vi.mocked(AuthContextModule.useAuth);
const mockFetchPersonalRecords = vi.mocked(prApi.fetchPersonalRecords);
const mockCreatePersonalRecord = vi.mocked(prApi.createPersonalRecord);
const mockUpdatePersonalRecord = vi.mocked(prApi.updatePersonalRecord);
const mockDeletePersonalRecord = vi.mocked(prApi.deletePersonalRecord);
const mockFetchExercises = vi.mocked(exercisesApi.fetchExercises);

const mockExercise = { id: 'ex-1', name: 'ベンチプレス', category: '胸', description: null, userId: null };

const makeRecord = (overrides?: Partial<PersonalRecord>): PersonalRecord => ({
  id: '1',
  userId: 'u-1',
  exerciseId: 'ex-1',
  recordType: 'MAX_WEIGHT',
  weightKg: 100,
  reps: null,
  achievedAt: '2026-01-15',
  note: null,
  sourceExerciseSetId: null,
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-01-15T00:00:00Z',
  exercise: { id: 'ex-1', name: 'ベンチプレス', category: '胸' },
  ...overrides,
});

// POST レスポンスは exercise リレーションを含まない
const mockCreatedRecord = {
  id: '2',
  userId: 'u-1',
  exerciseId: 'ex-1',
  recordType: 'MAX_WEIGHT' as const,
  weightKg: 80,
  reps: null,
  achievedAt: '2026-06-01',
  note: null,
  sourceExerciseSetId: null,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <PersonalRecordsPage />
      </ToastProvider>
    </MemoryRouter>,
  );

// モーダルを開くヘルパー（新規登録）
const openCreateModal = async () => {
  fireEvent.click(screen.getByRole('button', { name: '新規登録' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
};

// 達成日を設定するヘルパー（type="date" input）
const setAchievedAt = (value: string) => {
  const dateInputs = document.querySelectorAll('input[type="date"]');
  fireEvent.change(dateInputs[0], { target: { value } });
};

// 新規登録モーダル内の種目コンボボックスを選択するヘルパー
const selectFirstExercise = () => {
  const exerciseSelect = screen.getAllByRole('combobox').find((el) =>
    Array.from(el.querySelectorAll('option')).some(
      (o) => (o as HTMLOptionElement).value === '',
    ),
  )!;
  fireEvent.change(exerciseSelect, { target: { value: 'ex-1' } });
};

describe('PersonalRecordsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 'u-1',
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
    mockFetchPersonalRecords.mockResolvedValue([]);
    mockFetchExercises.mockResolvedValue([mockExercise]);
    mockCreatePersonalRecord.mockResolvedValue(mockCreatedRecord);
    mockUpdatePersonalRecord.mockResolvedValue(makeRecord({ weightKg: 120 }));
    mockDeletePersonalRecord.mockResolvedValue(undefined);
  });

  // ─── 初期表示 ─────────────────────────────────────────────────────────────────

  it('一覧取得中は「読み込み中...」が表示される', () => {
    mockFetchPersonalRecords.mockReturnValue(new Promise(() => {})); // 解決しない
    renderPage();
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('データ 0件のとき「まだパーソナルレコードがありません」が表示される', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('まだパーソナルレコードがありません')).toBeInTheDocument(),
    );
  });

  it('データありのとき種目名・重量・達成日が表示される', async () => {
    mockFetchPersonalRecords.mockResolvedValue([makeRecord()]);
    renderPage();
    await waitFor(() => expect(screen.getByText('ベンチプレス')).toBeInTheDocument());
    expect(screen.getByText('100 kg')).toBeInTheDocument();
    expect(screen.getByText('達成日: 2026/01/15')).toBeInTheDocument();
  });

  it('一覧取得失敗時にページ内エラーメッセージが表示される', async () => {
    mockFetchPersonalRecords.mockRejectedValue(new Error('network error'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('一覧の取得に失敗しました'),
    );
  });

  // ─── 種目取得エラー制御 ───────────────────────────────────────────────────────

  it('種目取得失敗時は「新規登録」ボタンが disabled になる', async () => {
    mockFetchExercises.mockRejectedValue(new Error('fetch error'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).toBeDisabled(),
    );
  });

  it('種目 0件のとき「新規登録」ボタンが disabled になる', async () => {
    mockFetchExercises.mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).toBeDisabled(),
    );
  });

  // ─── フォーム: recordType 切り替え ───────────────────────────────────────────

  it('MAX_WEIGHT 選択時「重量（kg）」欄が表示され「回数（回）」欄は表示されない', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();
    // デフォルト MAX_WEIGHT
    expect(screen.getByPlaceholderText('例: 100')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('例: 15')).not.toBeInTheDocument();
  });

  it('MAX_REPS 選択時「回数（回）」欄が表示され「重量（kg）」欄は表示されない', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();
    // recordType を MAX_REPS に変更
    fireEvent.change(
      screen.getAllByRole('combobox').find((el) => {
        const options = el.querySelectorAll('option');
        return Array.from(options).some((o) => o.value === 'MAX_WEIGHT');
      })!,
      { target: { value: 'MAX_REPS' } },
    );
    expect(screen.getByPlaceholderText('例: 15')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('例: 100')).not.toBeInTheDocument();
  });

  // ─── バリデーション ───────────────────────────────────────────────────────────

  it('達成日未入力で「保存」押下 → API が呼ばれない + エラーメッセージ表示', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();
    selectFirstExercise();
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '100' } });
    // 達成日は空のまま
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('達成日を入力してください'),
    );
    expect(mockCreatePersonalRecord).not.toHaveBeenCalled();
  });

  it('weightKg 空欄で送信 → API が呼ばれない（空欄は undefined 扱い）', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();
    selectFirstExercise();
    // 重量は空のまま
    setAchievedAt('2026-06-01');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('重量は0より大きい数値を入力してください'),
    );
    expect(mockCreatePersonalRecord).not.toHaveBeenCalled();
  });

  it('reps に小数（1.5）を入力して送信 → API が呼ばれない', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();
    selectFirstExercise();
    // MAX_REPS に切り替え
    fireEvent.change(
      screen.getAllByRole('combobox').find((el) => {
        const options = el.querySelectorAll('option');
        return Array.from(options).some((o) => o.value === 'MAX_WEIGHT');
      })!,
      { target: { value: 'MAX_REPS' } },
    );
    fireEvent.change(screen.getByPlaceholderText('例: 15'), { target: { value: '1.5' } });
    setAchievedAt('2026-06-01');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('回数を1以上の整数で入力してください'),
    );
    expect(mockCreatePersonalRecord).not.toHaveBeenCalled();
  });

  it('reps に 0 を入力して送信 → API が呼ばれない', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();
    selectFirstExercise();
    fireEvent.change(
      screen.getAllByRole('combobox').find((el) => {
        const options = el.querySelectorAll('option');
        return Array.from(options).some((o) => o.value === 'MAX_WEIGHT');
      })!,
      { target: { value: 'MAX_REPS' } },
    );
    fireEvent.change(screen.getByPlaceholderText('例: 15'), { target: { value: '0' } });
    setAchievedAt('2026-06-01');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('回数を1以上の整数で入力してください'),
    );
    expect(mockCreatePersonalRecord).not.toHaveBeenCalled();
  });

  it('weightKg に負数（-1）を入力して送信 → API が呼ばれない', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();
    selectFirstExercise();
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '-1' } });
    setAchievedAt('2026-06-01');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('重量は0より大きい数値を入力してください'),
    );
    expect(mockCreatePersonalRecord).not.toHaveBeenCalled();
  });

  it('note が 200 文字超でエラーを表示し API が呼ばれない', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();
    selectFirstExercise();
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '100' } });
    setAchievedAt('2026-06-01');
    fireEvent.change(screen.getByPlaceholderText('200文字以内'), {
      target: { value: 'a'.repeat(201) },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('メモは200文字以内で入力してください'),
    );
    expect(mockCreatePersonalRecord).not.toHaveBeenCalled();
  });

  it('新規モーダルを開いた直後は種目が未選択状態（コンボボックスの値が空）', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();

    const exerciseSelect = screen.getAllByRole('combobox').find((el) =>
      Array.from(el.querySelectorAll('option')).some(
        (o) => (o as HTMLOptionElement).value === '',
      ),
    )!;
    // 修正前: exercises[0].id が auto-select → value='ex-1' → FAIL
    // 修正後: 未選択 → value='' → PASS
    expect(exerciseSelect).toHaveValue('');
  });

  it('種目未選択のまま保存 → API が呼ばれない + 種目を選択してくださいエラー', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();
    // 種目は選択しない
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '100' } });
    setAchievedAt('2026-06-01');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    // 修正前: exerciseId が auto-select されているため API が呼ばれてしまい FAIL
    // 修正後: 種目未選択エラーが出て API は呼ばれない → PASS
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('種目を選択してください'),
    );
    expect(mockCreatePersonalRecord).not.toHaveBeenCalled();
  });

  it('weightKg に 0 を入力して保存 → API が呼ばれない', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();
    selectFirstExercise();
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '0' } });
    setAchievedAt('2026-06-01');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    // 修正前: parseWeight('0') が 0（有効）を返すため API が呼ばれてしまい FAIL
    // 修正後: parseWeight('0') が undefined を返しエラーとなり API は呼ばれない → PASS
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('重量は0より大きい数値を入力してください'),
    );
    expect(mockCreatePersonalRecord).not.toHaveBeenCalled();
  });

  // ─── 登録 ─────────────────────────────────────────────────────────────────────

  it('保存処理中は「保存中...」が表示されボタンが disabled になる', async () => {
    mockCreatePersonalRecord.mockReturnValue(new Promise(() => {})); // 解決しない
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();
    selectFirstExercise();
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '100' } });
    setAchievedAt('2026-06-01');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '保存中...' })).toBeDisabled(),
    );
  });

  it('登録成功後にモーダルが閉じ fetchPersonalRecords が再度呼ばれ成功トーストが表示される', async () => {
    const newRecord = makeRecord({ id: '10', weightKg: 80, achievedAt: '2026-06-01' });
    mockFetchPersonalRecords
      .mockResolvedValueOnce([])        // 初回
      .mockResolvedValueOnce([newRecord]); // 登録後 refetch
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();
    selectFirstExercise();
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '80' } });
    setAchievedAt('2026-06-01');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(mockFetchPersonalRecords).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('パーソナルレコードを登録しました'),
    );
  });

  it('登録 API 失敗時にモーダル内エラーが表示され、モーダルが閉じない', async () => {
    mockCreatePersonalRecord.mockRejectedValue(new Error('server error'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();
    selectFirstExercise();
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '100' } });
    setAchievedAt('2026-06-01');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('登録に失敗しました'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('MAX_WEIGHT 登録時に reps を payload に含めない', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();
    selectFirstExercise();
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '100' } });
    setAchievedAt('2026-06-01');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => expect(mockCreatePersonalRecord).toHaveBeenCalled());
    const payload = mockCreatePersonalRecord.mock.calls[0][0];
    expect(payload.weightKg).toBe(100);
    expect(payload).not.toHaveProperty('reps');
    expect(payload.recordType).toBe('MAX_WEIGHT');
  });

  it('MAX_REPS 登録時に weightKg を payload に含めない', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '新規登録' })).not.toBeDisabled(),
    );
    await openCreateModal();
    selectFirstExercise();
    fireEvent.change(
      screen.getAllByRole('combobox').find((el) => {
        const options = el.querySelectorAll('option');
        return Array.from(options).some((o) => o.value === 'MAX_WEIGHT');
      })!,
      { target: { value: 'MAX_REPS' } },
    );
    fireEvent.change(screen.getByPlaceholderText('例: 15'), { target: { value: '15' } });
    setAchievedAt('2026-06-01');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => expect(mockCreatePersonalRecord).toHaveBeenCalled());
    const payload = mockCreatePersonalRecord.mock.calls[0][0];
    expect(payload.reps).toBe(15);
    expect(payload).not.toHaveProperty('weightKg');
    expect(payload.recordType).toBe('MAX_REPS');
  });

  it('登録成功後の一覧再取得失敗時に既存一覧が残り再取得失敗トーストが表示される', async () => {
    const existing = makeRecord();
    mockFetchPersonalRecords
      .mockResolvedValueOnce([existing])   // 初回
      .mockRejectedValueOnce(new Error('refetch error')); // 登録後 refetch 失敗
    renderPage();
    await waitFor(() => expect(screen.getByText('ベンチプレス')).toBeInTheDocument());

    await openCreateModal();
    selectFirstExercise();
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '80' } });
    setAchievedAt('2026-06-01');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() =>
      expect(screen.getByText('登録しましたが、一覧の再取得に失敗しました')).toBeInTheDocument(),
    );
    // 既存一覧は残っている
    expect(screen.getByText('ベンチプレス')).toBeInTheDocument();
  });

  // ─── 編集 ─────────────────────────────────────────────────────────────────────

  it('編集モーダルで種目名が readOnly で表示され recordType が変更不可と表示される', async () => {
    mockFetchPersonalRecords.mockResolvedValue([makeRecord()]);
    renderPage();
    await waitFor(() => expect(screen.getByText('ベンチプレス')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // 種目は readOnly input で表示
    const exerciseInput = screen.getByDisplayValue('ベンチプレス');
    expect(exerciseInput).toHaveAttribute('readonly');

    // recordType は「（変更不可）」と表示
    expect(screen.getByText('最大重量（変更不可）')).toBeInTheDocument();
  });

  it('更新成功後に fetchPersonalRecords が再度呼ばれ更新後の値が表示される', async () => {
    const updated = makeRecord({ weightKg: 120 });
    mockFetchPersonalRecords
      .mockResolvedValueOnce([makeRecord()])   // 初回
      .mockResolvedValueOnce([updated]);        // 更新後 refetch
    renderPage();
    await waitFor(() => expect(screen.getByText('100 kg')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(mockFetchPersonalRecords).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByText('パーソナルレコードを更新しました')).toBeInTheDocument(),
    );
  });

  it('更新 API 失敗時にモーダル内エラーが表示され、モーダルが閉じない', async () => {
    mockFetchPersonalRecords.mockResolvedValue([makeRecord()]);
    mockUpdatePersonalRecord.mockRejectedValue(new Error('error'));
    renderPage();
    await waitFor(() => expect(screen.getByText('ベンチプレス')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('更新に失敗しました'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('更新 payload に recordType と exerciseId を含まない', async () => {
    mockFetchPersonalRecords.mockResolvedValue([makeRecord()]);
    renderPage();
    await waitFor(() => expect(screen.getByText('ベンチプレス')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => expect(mockUpdatePersonalRecord).toHaveBeenCalled());
    const payload = mockUpdatePersonalRecord.mock.calls[0][1];
    expect(payload).not.toHaveProperty('recordType');
    expect(payload).not.toHaveProperty('exerciseId');
    expect(payload.weightKg).toBe(120);
  });

  it('更新時 note 空欄で null が送られる', async () => {
    mockFetchPersonalRecords.mockResolvedValue([makeRecord({ note: '既存メモ' })]);
    renderPage();
    await waitFor(() => expect(screen.getByText('既存メモ')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    await screen.findByRole('dialog');

    // note をクリア
    fireEvent.change(screen.getByPlaceholderText('200文字以内'), { target: { value: '' } });
    fireEvent.change(screen.getByPlaceholderText('例: 100'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => expect(mockUpdatePersonalRecord).toHaveBeenCalled());
    const payload = mockUpdatePersonalRecord.mock.calls[0][1];
    expect(payload.note).toBeNull();
  });

  // ─── 削除 ─────────────────────────────────────────────────────────────────────

  it('「削除」→「いいえ」押下で deletePersonalRecord が呼ばれない', async () => {
    mockFetchPersonalRecords.mockResolvedValue([makeRecord()]);
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    expect(screen.getByText('本当に削除しますか？')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'いいえ' }));

    expect(screen.queryByText('本当に削除しますか？')).not.toBeInTheDocument();
    expect(mockDeletePersonalRecord).not.toHaveBeenCalled();
  });

  it('削除処理中は「削除」ボタンが disabled になる（確認UI は即座に閉じる）', async () => {
    mockFetchPersonalRecords.mockResolvedValue([makeRecord()]);
    mockDeletePersonalRecord.mockReturnValue(new Promise(() => {})); // 解決しない
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    fireEvent.click(screen.getByRole('button', { name: 'はい' }));
    // handleDelete は setDeleteConfirmId(null) → 確認UIが閉じ「削除」ボタンが disabled になる
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '削除' })).toBeDisabled(),
    );
    expect(screen.queryByText('本当に削除しますか？')).not.toBeInTheDocument();
  });

  it('「削除」→「はい」押下後に成功トーストが表示され一覧から消える', async () => {
    mockFetchPersonalRecords
      .mockResolvedValueOnce([makeRecord()])  // 初回
      .mockResolvedValueOnce([]);              // 削除後 refetch
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    fireEvent.click(screen.getByRole('button', { name: 'はい' }));

    await waitFor(() => expect(mockDeletePersonalRecord).toHaveBeenCalledWith('1'));
    await waitFor(() => expect(mockFetchPersonalRecords).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByText('パーソナルレコードを削除しました')).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByText('まだパーソナルレコードがありません')).toBeInTheDocument(),
    );
  });

  it('削除 API 失敗時にエラートーストが表示される', async () => {
    mockFetchPersonalRecords.mockResolvedValue([makeRecord()]);
    mockDeletePersonalRecord.mockRejectedValue(new Error('error'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    fireEvent.click(screen.getByRole('button', { name: 'はい' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('削除に失敗しました'),
    );
    // ページ内の既存一覧は残っている
    await waitFor(() => expect(screen.getByText('ベンチプレス')).toBeInTheDocument());
  });
});
