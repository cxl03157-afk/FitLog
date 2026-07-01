import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import WorkoutPostNewPage from '../pages/WorkoutPostNewPage';
import * as AuthContextModule from '../contexts/AuthContext';
import * as exercisesApi from '../api/exercises';
import * as workoutPostsApi from '../api/workoutPosts';
import type { Exercise, WorkoutPost } from '../types/workout';

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal<typeof AuthContextModule>();
  return { ...mod, useAuth: vi.fn() };
});

vi.mock('../api/exercises', () => ({
  fetchExercises: vi.fn(),
  createExercise: vi.fn(),
}));

vi.mock('../api/workoutPosts', () => ({
  createWorkoutPost: vi.fn(),
  uploadPostImages: vi.fn(),
  fetchWorkoutPosts: vi.fn(),
  fetchWorkoutPost: vi.fn(),
  deleteWorkoutPost: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUseAuth = vi.mocked(AuthContextModule.useAuth);
const mockFetchExercises = vi.mocked(exercisesApi.fetchExercises);
const mockCreateWorkoutPost = vi.mocked(workoutPostsApi.createWorkoutPost);
const mockUploadPostImages = vi.mocked(workoutPostsApi.uploadPostImages);

const mockCreateObjectURL = vi.fn((file: Blob) => `blob:mock-${(file as File).name}`);
const mockRevokeObjectURL = vi.fn();

const mockExercises: Exercise[] = [
  { id: '1', name: 'ベンチプレス', category: '胸', description: null, userId: null },
  { id: '2', name: 'スクワット', category: '脚', description: null, userId: null },
];

const mockCreatedPost: WorkoutPost = {
  id: 'post-123',
  userId: '1',
  title: 'テスト',
  note: null,
  trainedOn: '2026-06-23',
  createdAt: '2026-06-23T00:00:00Z',
  likeCount: 0,
  commentCount: 0,
  isLiked: false,
  user: { id: '1', username: 'user', displayName: 'User' },
  workoutExercises: [],
  postImages: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
  mockUseAuth.mockReturnValue({
    user: { id: '1', username: 'user', displayName: 'User', email: 'u@test.com', avatarUrl: null, bio: null },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateCurrentUser: vi.fn(),
  });
  mockFetchExercises.mockResolvedValue(mockExercises);
  Object.defineProperty(globalThis.URL, 'createObjectURL', {
    value: mockCreateObjectURL,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
    value: mockRevokeObjectURL,
    writable: true,
    configurable: true,
  });
});

const renderNewPage = () =>
  render(
    <MemoryRouter initialEntries={['/workout-posts/new']}>
      <ToastProvider>
        <Routes>
          <Route path="/workout-posts/new" element={<WorkoutPostNewPage />} />
          <Route path="/" element={<div>timeline</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );

const makeFile = (name: string, size: number, type = 'image/jpeg', lastModified = 1000): File => {
  const buf = new ArrayBuffer(size);
  return new File([buf], name, { type, lastModified });
};

const selectFiles = (files: File[]) => {
  const input = document.querySelector('[data-testid="image-file-input"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  fireEvent.change(input);
};

const waitForExercisesLoad = async () => {
  await waitFor(() => {
    expect(screen.queryByText('種目マスタを読み込み中...')).toBeNull();
  });
};

const fillMinimalValidForm = async () => {
  await waitForExercisesLoad();
  await userEvent.type(screen.getByPlaceholderText('例：胸の日'), 'テスト投稿');
  await userEvent.selectOptions(screen.getByRole('combobox'), '1');
  const spinbuttons = screen.getAllByRole('spinbutton');
  await userEvent.type(spinbuttons[0], '60');
  await userEvent.type(spinbuttons[1], '10');
};

describe('WorkoutPostNewPage', () => {
  it('renders form fields after exercises load', async () => {
    renderNewPage();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('例：胸の日')).toBeTruthy();
    });
    expect(screen.getByText(/種目追加/)).toBeTruthy();
    expect(screen.getByText(/セット追加/)).toBeTruthy();
  });

  it('shows validation error when title is empty on submit', async () => {
    renderNewPage();

    await waitFor(() => {
      expect(screen.queryByText('種目マスタを読み込み中...')).toBeNull();
    });

    await userEvent.click(screen.getByRole('button', { name: '投稿する' }));

    await waitFor(() => {
      expect(screen.getByText('タイトルを入力してください。')).toBeTruthy();
    });
  });
});

describe('WorkoutPostNewPage — 重量バリデーション', () => {
  // 重量空欄・負数は React バリデーションまたは HTML5 ネイティブバリデーションでブロックされる。
  // min="0" 属性により負数はブラウザ側でフォーム送信がブロックされるため UI テストは空欄で代用する。

  it('重量空欄で投稿 → React バリデーションエラーを表示する', async () => {
    renderNewPage();
    await waitForExercisesLoad();
    await userEvent.type(screen.getByPlaceholderText('例：胸の日'), 'テスト投稿');
    await userEvent.selectOptions(screen.getByRole('combobox'), '1');
    // 重量は空欄のまま、回数のみ入力
    const spinbuttons = screen.getAllByRole('spinbutton');
    await userEvent.type(spinbuttons[1], '10');
    await userEvent.click(screen.getByRole('button', { name: '投稿する' }));
    await waitFor(() => {
      expect(screen.getByText(/重量を正しく入力してください/)).toBeTruthy();
    });
  });

  it('重量0で投稿 → バリデーションを通過して createWorkoutPost が呼ばれる', async () => {
    mockCreateWorkoutPost.mockResolvedValue(mockCreatedPost);
    renderNewPage();
    await waitForExercisesLoad();
    await userEvent.type(screen.getByPlaceholderText('例：胸の日'), 'テスト投稿');
    await userEvent.selectOptions(screen.getByRole('combobox'), '1');
    const spinbuttons = screen.getAllByRole('spinbutton');
    await userEvent.type(spinbuttons[0], '0');
    await userEvent.type(spinbuttons[1], '10');
    await userEvent.click(screen.getByRole('button', { name: '投稿する' }));
    await waitFor(() => {
      expect(mockCreateWorkoutPost).toHaveBeenCalled();
    });
    expect(screen.queryByText(/重量を正しく入力してください/)).toBeNull();
  });
});

describe('WorkoutPostNewPage - 画像バリデーション', () => {
  it('3枚選択済みで3枚追加試みる → 先頭1枚のみ追加・残り2枚除外・エラー表示', async () => {
    renderNewPage();
    await waitForExercisesLoad();

    // 3枚追加 → available=1
    selectFiles([makeFile('a.jpg', 100), makeFile('b.jpg', 200), makeFile('c.jpg', 300)]);
    await waitFor(() => expect(screen.getByTestId('image-preview-2')).toBeTruthy());

    // さらに3枚追加試みる → 1枚だけ追加・2枚除外
    selectFiles([makeFile('d.jpg', 400), makeFile('e.jpg', 500), makeFile('f.jpg', 600)]);

    await waitFor(() => {
      expect(screen.getByText(/最大4枚まで選択できます/)).toBeTruthy();
      expect(screen.getByText(/2枚は除外されました/)).toBeTruthy();
    });

    // プレビューは4枚（3 + 1枚のみ追加）
    expect(screen.getAllByTestId(/^image-preview-/)).toHaveLength(4);
    // 4枚になったので追加ボタンが非表示
    expect(screen.queryByTestId('add-image-button')).toBeNull();
  });

  it('JPEG/PNG/WebP 以外（.gif）→ 除外・エラー表示', async () => {
    renderNewPage();
    await waitForExercisesLoad();

    selectFiles([makeFile('photo.gif', 100, 'image/gif')]);

    await waitFor(() => {
      expect(screen.getByText(/対応していないファイル形式です/)).toBeTruthy();
    });
    expect(screen.queryByTestId('image-preview-0')).toBeNull();
  });

  it('10MB 超過ファイル → 除外・エラー表示', async () => {
    renderNewPage();
    await waitForExercisesLoad();

    selectFiles([makeFile('big.jpg', 10 * 1024 * 1024 + 1)]);

    await waitFor(() => {
      expect(screen.getByText(/ファイルサイズが10MBを超えています/)).toBeTruthy();
    });
    expect(screen.queryByTestId('image-preview-0')).toBeNull();
  });

  it('0バイトファイル → 除外・エラー表示', async () => {
    renderNewPage();
    await waitForExercisesLoad();

    selectFiles([makeFile('empty.jpg', 0)]);

    await waitFor(() => {
      expect(screen.getByText(/空のファイルです/)).toBeTruthy();
    });
    expect(screen.queryByTestId('image-preview-0')).toBeNull();
  });

  it('重複ファイル（同名・同サイズ・同 lastModified）→ 除外・エラー表示', async () => {
    renderNewPage();
    await waitForExercisesLoad();

    selectFiles([makeFile('dup.jpg', 100, 'image/jpeg', 9999)]);
    await waitFor(() => expect(screen.getByTestId('image-preview-0')).toBeTruthy());

    // 同一属性のファイルをもう一度選択
    selectFiles([makeFile('dup.jpg', 100, 'image/jpeg', 9999)]);

    await waitFor(() => {
      expect(screen.getByText(/重複したファイルです/)).toBeTruthy();
    });
    // プレビューは1枚のまま
    expect(screen.getAllByTestId(/^image-preview-/)).toHaveLength(1);
  });

  it('複数不正ファイルを同時選択 → 個別エラー・有効ファイルは残る', async () => {
    renderNewPage();
    await waitForExercisesLoad();

    selectFiles([
      makeFile('ok.jpg', 100),
      makeFile('bad.gif', 100, 'image/gif'),
      makeFile('huge.jpg', 10 * 1024 * 1024 + 1),
    ]);

    await waitFor(() => {
      expect(screen.getByTestId('image-preview-0')).toBeTruthy();
      expect(screen.getByText(/対応していないファイル形式です/)).toBeTruthy();
      expect(screen.getByText(/ファイルサイズが10MBを超えています/)).toBeTruthy();
    });
    expect(screen.getAllByTestId(/^image-preview-/)).toHaveLength(1);
  });
});

describe('WorkoutPostNewPage - URL 管理', () => {
  it('プレビューの「×」ボタン → 削除対象の previewUrl のみ revoke・他の URL は revoke されない', async () => {
    renderNewPage();
    await waitForExercisesLoad();

    selectFiles([makeFile('a.jpg', 100), makeFile('b.jpg', 200)]);
    await waitFor(() => expect(screen.getByTestId('image-preview-1')).toBeTruthy());

    expect(mockRevokeObjectURL).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('remove-image-0'));

    await waitFor(() => {
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-a.jpg');
    });
    expect(mockRevokeObjectURL).not.toHaveBeenCalledWith('blob:mock-b.jpg');
    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('state 更新時に全 URL が一括 revoke されていない', async () => {
    renderNewPage();
    await waitForExercisesLoad();

    selectFiles([makeFile('a.jpg', 100)]);
    await waitFor(() => expect(screen.getByTestId('image-preview-0')).toBeTruthy());

    // 2枚目追加 → state 更新でも revokeObjectURL は呼ばれない
    selectFiles([makeFile('b.jpg', 200)]);
    await waitFor(() => expect(screen.getByTestId('image-preview-1')).toBeTruthy());

    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(0);
  });

  it('アンマウント時に残りの全 previewUrl が解放される（ref 経由で最新値を参照）', async () => {
    const { unmount } = renderNewPage();
    await waitForExercisesLoad();

    selectFiles([makeFile('a.jpg', 100), makeFile('b.jpg', 200)]);
    await waitFor(() => expect(screen.getByTestId('image-preview-1')).toBeTruthy());

    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(0);

    act(() => {
      unmount();
    });

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-a.jpg');
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-b.jpg');
    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(2);
  });
});

describe('WorkoutPostNewPage - 投稿送信', () => {
  it('投稿ボタンの連打防止（処理中 disabled）', async () => {
    mockCreateWorkoutPost.mockReturnValue(new Promise(() => {}));
    renderNewPage();
    await fillMinimalValidForm();

    await userEvent.click(screen.getByRole('button', { name: '投稿する' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '投稿中...' })).toBeTruthy();
    });
    const btn = screen.getByRole('button', { name: '投稿中...' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('投稿 API 失敗 → フォームに留まる・ボタン再有効化', async () => {
    mockCreateWorkoutPost.mockRejectedValue(new Error('Server error'));
    renderNewPage();
    await fillMinimalValidForm();

    await userEvent.click(screen.getByRole('button', { name: '投稿する' }));

    await waitFor(() => {
      expect(screen.getByText('投稿に失敗しました。再度お試しください。')).toBeTruthy();
    });
    const btn = screen.getByRole('button', { name: '投稿する' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('投稿成功後の画像 API 失敗 → トースト + タイムライン遷移', async () => {
    mockCreateWorkoutPost.mockResolvedValue(mockCreatedPost);
    mockUploadPostImages.mockRejectedValue(new Error('S3 error'));
    renderNewPage();
    await fillMinimalValidForm();

    selectFiles([makeFile('photo.jpg', 100)]);
    await waitFor(() => expect(screen.getByTestId('image-preview-0')).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: '投稿する' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', {
        state: { toast: '投稿は保存されましたが、画像のアップロードに失敗しました' },
      });
    });
  });

  it('画像なしで投稿成功 → タイムラインへ遷移', async () => {
    mockCreateWorkoutPost.mockResolvedValue(mockCreatedPost);
    renderNewPage();
    await fillMinimalValidForm();

    await userEvent.click(screen.getByRole('button', { name: '投稿する' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
    expect(mockUploadPostImages).not.toHaveBeenCalled();
  });

  it('画像ありで投稿成功 → uploadPostImages を呼んでタイムラインへ遷移', async () => {
    mockCreateWorkoutPost.mockResolvedValue(mockCreatedPost);
    mockUploadPostImages.mockResolvedValue(undefined);
    renderNewPage();
    await fillMinimalValidForm();

    selectFiles([makeFile('photo.jpg', 100)]);
    await waitFor(() => expect(screen.getByTestId('image-preview-0')).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: '投稿する' }));

    await waitFor(() => {
      expect(mockUploadPostImages).toHaveBeenCalledWith('post-123', expect.any(Array));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
