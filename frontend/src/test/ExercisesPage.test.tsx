import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import ExercisesPage from '../pages/ExercisesPage';
import * as AuthContextModule from '../contexts/AuthContext';
import * as exercisesApi from '../api/exercises';
import type { Exercise } from '../types/workout';
import axios from 'axios';

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal<typeof AuthContextModule>();
  return { ...mod, useAuth: vi.fn() };
});

vi.mock('../api/exercises', () => ({
  fetchExercises: vi.fn(),
  createExercise: vi.fn(),
  updateExercise: vi.fn(),
  deleteExercise: vi.fn(),
}));

vi.mock('../components/NavBar', () => ({
  default: () => <div data-testid="navbar" />,
}));

const mockUseAuth = vi.mocked(AuthContextModule.useAuth);
const mockFetchExercises = vi.mocked(exercisesApi.fetchExercises);
const mockCreateExercise = vi.mocked(exercisesApi.createExercise);
const mockUpdateExercise = vi.mocked(exercisesApi.updateExercise);
const mockDeleteExercise = vi.mocked(exercisesApi.deleteExercise);

const standardExercise: Exercise = {
  id: 'std1',
  userId: null,
  name: 'ベンチプレス',
  category: '胸',
  description: null,
};

const customExercise1: Exercise = {
  id: 'cus1',
  userId: 'u1',
  name: 'ケーブルフライ変形',
  category: '胸',
  description: 'ケーブルを使ったバリエーション',
};

const customExercise2: Exercise = {
  id: 'cus2',
  userId: 'u1',
  name: 'マシンロウ',
  category: '背中',
  description: null,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <ExercisesPage />
      </ToastProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { id: 'u1', username: 'testuser', displayName: 'Test User', email: 't@test.com', avatarUrl: null, bio: null },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateCurrentUser: vi.fn(),
  });
});

describe('ExercisesPage', () => {
  it('ローディング中は読み込み中テキストを表示する', () => {
    mockFetchExercises.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('読み込み中...')).toBeTruthy();
  });

  it('独自種目のみカード表示し、標準種目は除外する', async () => {
    mockFetchExercises.mockResolvedValue([standardExercise, customExercise1, customExercise2]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('ケーブルフライ変形')).toBeTruthy();
      expect(screen.getByText('マシンロウ')).toBeTruthy();
    });
    expect(screen.queryByText('ベンチプレス')).toBeNull();
  });

  it('独自種目が0件のときエンプティステートを表示する', async () => {
    mockFetchExercises.mockResolvedValue([standardExercise]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/独自種目はまだありません/)).toBeTruthy();
    });
  });

  it('取得エラー時はエラーメッセージを表示する', async () => {
    mockFetchExercises.mockRejectedValue(new Error('network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText('種目の取得に失敗しました')).toBeTruthy();
    });
  });

  it('「+ 新しい種目を作成」ボタン押下でモーダルを開く', async () => {
    mockFetchExercises.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.queryByText('読み込み中...')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /新しい種目を作成/ }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByText('新しい種目を作成')).toBeTruthy();
  });

  it('作成成功 → モーダルが閉じ、リストに追加され、成功トーストが表示される', async () => {
    mockFetchExercises
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([customExercise1]);
    mockCreateExercise.mockResolvedValue(customExercise1);

    renderPage();
    await waitFor(() => expect(screen.queryByText('読み込み中...')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /新しい種目を作成/ }));
    await screen.findByRole('dialog');

    await userEvent.type(screen.getByPlaceholderText(/ケーブルフライ変形/), 'ケーブルフライ変形');
    await userEvent.selectOptions(
      screen.getByRole('combobox'),
      '胸',
    );
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByText('ケーブルフライ変形')).toBeTruthy();
    });
    expect(screen.getByText('種目を作成しました')).toBeTruthy();
  });

  it('作成409 → モーダルがインラインエラーを表示する', async () => {
    mockFetchExercises.mockResolvedValue([]);
    const err = Object.assign(new Error(), {
      isAxiosError: true,
      response: { status: 409, data: { message: '同じ名前の種目がすでに存在します' } },
    });
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    mockCreateExercise.mockRejectedValue(err);

    renderPage();
    await waitFor(() => expect(screen.queryByText('読み込み中...')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /新しい種目を作成/ }));
    await screen.findByRole('dialog');

    await userEvent.type(screen.getByPlaceholderText(/ケーブルフライ変形/), '重複種目');
    await userEvent.selectOptions(screen.getByRole('combobox'), '胸');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText('同じ名前の種目がすでに存在します')).toBeTruthy();
    });
  });

  it('作成500 → モーダルがインラインエラーを表示する', async () => {
    mockFetchExercises.mockResolvedValue([]);
    const err = Object.assign(new Error(), {
      isAxiosError: true,
      response: { status: 500, data: {} },
    });
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    mockCreateExercise.mockRejectedValue(err);

    renderPage();
    await waitFor(() => expect(screen.queryByText('読み込み中...')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /新しい種目を作成/ }));
    await screen.findByRole('dialog');

    await userEvent.type(screen.getByPlaceholderText(/ケーブルフライ変形/), 'テスト種目');
    await userEvent.selectOptions(screen.getByRole('combobox'), '胸');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText('作成に失敗しました')).toBeTruthy();
    });
  });

  it('編集ボタン押下でモーダルが開き、既存値がセットされる', async () => {
    mockFetchExercises.mockResolvedValue([customExercise1]);
    renderPage();
    await waitFor(() => expect(screen.getByText('ケーブルフライ変形')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    await screen.findByRole('dialog');

    expect(screen.getByText('種目を編集')).toBeTruthy();
    const nameInput = screen.getByPlaceholderText(/ケーブルフライ変形/) as HTMLInputElement;
    expect(nameInput.value).toBe('ケーブルフライ変形');
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('胸');
  });

  it('編集成功 → モーダルが閉じ、リストが更新され、成功トーストが表示される', async () => {
    const updated: Exercise = { ...customExercise1, name: '名前変更後' };
    mockFetchExercises
      .mockResolvedValueOnce([customExercise1])
      .mockResolvedValueOnce([updated]);
    mockUpdateExercise.mockResolvedValue(updated);

    renderPage();
    await waitFor(() => expect(screen.getByText('ケーブルフライ変形')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    await screen.findByRole('dialog');

    const nameInput = screen.getByPlaceholderText(/ケーブルフライ変形/) as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, '名前変更後');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByText('名前変更後')).toBeTruthy();
    });
    expect(screen.getByText('種目を更新しました')).toBeTruthy();
  });

  it('編集409 → モーダルがインラインエラーを表示する', async () => {
    mockFetchExercises.mockResolvedValue([customExercise1]);
    const err = Object.assign(new Error(), {
      isAxiosError: true,
      response: { status: 409, data: { message: '同じ名前の種目がすでに存在します' } },
    });
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    mockUpdateExercise.mockRejectedValue(err);

    renderPage();
    await waitFor(() => expect(screen.getByText('ケーブルフライ変形')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText('同じ名前の種目がすでに存在します')).toBeTruthy();
    });
  });

  it('削除ボタン押下 → カード内に確認表示。はいで削除し成功トーストを表示', async () => {
    mockFetchExercises
      .mockResolvedValueOnce([customExercise1])
      .mockResolvedValueOnce([]);
    mockDeleteExercise.mockResolvedValue(undefined);

    renderPage();
    await waitFor(() => expect(screen.getByText('ケーブルフライ変形')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    expect(screen.getByText('本当に削除しますか？')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'はい' }));

    await waitFor(() => {
      expect(screen.queryByText('ケーブルフライ変形')).toBeNull();
    });
    expect(screen.getByText('種目を削除しました')).toBeTruthy();
  });

  it('削除409（使用中）→ 削除失敗トーストを表示する', async () => {
    mockFetchExercises.mockResolvedValue([customExercise1]);
    const err = Object.assign(new Error(), {
      isAxiosError: true,
      response: { status: 409, data: {} },
    });
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    mockDeleteExercise.mockRejectedValue(err);

    renderPage();
    await waitFor(() => expect(screen.getByText('ケーブルフライ変形')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    fireEvent.click(screen.getByRole('button', { name: 'はい' }));

    await waitFor(() => {
      expect(screen.getByText('この種目は使用中のため削除できません')).toBeTruthy();
    });
  });

  it('削除500 → 削除失敗トーストを表示する', async () => {
    mockFetchExercises.mockResolvedValue([customExercise1]);
    const err = Object.assign(new Error(), {
      isAxiosError: true,
      response: { status: 500, data: {} },
    });
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    mockDeleteExercise.mockRejectedValue(err);

    renderPage();
    await waitFor(() => expect(screen.getByText('ケーブルフライ変形')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    fireEvent.click(screen.getByRole('button', { name: 'はい' }));

    await waitFor(() => {
      expect(screen.getByText('削除に失敗しました')).toBeTruthy();
    });
  });
});
