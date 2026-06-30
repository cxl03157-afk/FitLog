import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExerciseSelect from '../components/ExerciseSelect';
import * as exercisesApi from '../api/exercises';
import * as useToastHook from '../hooks/useToast';
import type { Exercise } from '../types/workout';

vi.mock('../api/exercises', () => ({
  fetchExercises: vi.fn(),
  createExercise: vi.fn(),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: vi.fn(),
}));

const mockCreateExercise = vi.mocked(exercisesApi.createExercise);
const mockShowToast = vi.fn();

const stdEx: Exercise[] = [
  { id: '1', name: 'ベンチプレス', category: '胸', description: null, userId: null },
  { id: '2', name: 'スクワット', category: '脚', description: null, userId: null },
  { id: '3', name: '懸垂', category: '背中', description: null, userId: null },
];

const customEx: Exercise[] = [
  {
    id: '100',
    name: 'ケーブルフライ変形',
    category: '胸',
    description: null,
    userId: 'u1',
  },
];

const allExercises = [...stdEx, ...customEx];

const onChange = vi.fn();
const onExerciseCreated = vi.fn();

const defaultProps = {
  exercises: allExercises,
  value: '',
  onChange,
  onExerciseCreated,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useToastHook.useToast).mockReturnValue({ showToast: mockShowToast });
});

describe('ExerciseSelect', () => {
  it('renders standard exercises grouped by category', () => {
    const { container } = render(<ExerciseSelect {...defaultProps} />);
    const optgroups = container.querySelectorAll('optgroup');
    const labels = Array.from(optgroups).map((g) => g.getAttribute('label'));
    expect(labels).toContain('胸');
    expect(labels).toContain('脚');
    expect(labels).toContain('背中');
  });

  it('renders custom exercises in "独自種目" group with (category) label', () => {
    const { container } = render(<ExerciseSelect {...defaultProps} />);
    const customGroup = container.querySelector('optgroup[label="独自種目"]');
    expect(customGroup).not.toBeNull();
    const option = customGroup!.querySelector('option');
    expect(option?.textContent).toBe('ケーブルフライ変形（胸）');
  });

  it('does not show "独自種目" group when no custom exercises', () => {
    const { container } = render(
      <ExerciseSelect {...defaultProps} exercises={stdEx} />,
    );
    const customGroup = container.querySelector('optgroup[label="独自種目"]');
    expect(customGroup).toBeNull();
  });

  it('hides create UI when showCreate is false', () => {
    render(<ExerciseSelect {...defaultProps} showCreate={false} />);
    expect(screen.queryByText('＋ 新しい種目を作成')).toBeNull();
  });

  it('opens create form on button click', () => {
    render(<ExerciseSelect {...defaultProps} />);
    fireEvent.click(screen.getByText('＋ 新しい種目を作成'));
    expect(screen.getByRole('textbox', { name: '種目名' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'カテゴリ' })).toBeInTheDocument();
  });

  it('shows inline error and does not call API when name is empty', () => {
    render(<ExerciseSelect {...defaultProps} />);
    fireEvent.click(screen.getByText('＋ 新しい種目を作成'));
    fireEvent.change(screen.getByRole('combobox', { name: 'カテゴリ' }), {
      target: { value: '胸' },
    });
    fireEvent.click(screen.getByText('作成'));
    expect(mockCreateExercise).not.toHaveBeenCalled();
    expect(screen.getByText('種目名を入力してください')).toBeInTheDocument();
  });

  it('shows inline error and does not call API when category is not selected', () => {
    render(<ExerciseSelect {...defaultProps} />);
    fireEvent.click(screen.getByText('＋ 新しい種目を作成'));
    fireEvent.change(screen.getByRole('textbox', { name: '種目名' }), {
      target: { value: 'テスト種目' },
    });
    fireEvent.click(screen.getByText('作成'));
    expect(mockCreateExercise).not.toHaveBeenCalled();
    expect(screen.getByText('カテゴリを選択してください')).toBeInTheDocument();
  });

  it('calls onExerciseCreated and onChange, closes form on success', async () => {
    const newExercise: Exercise = {
      id: '200',
      name: 'テスト種目',
      category: '肩',
      description: null,
      userId: 'u1',
    };
    mockCreateExercise.mockResolvedValueOnce(newExercise);

    render(<ExerciseSelect {...defaultProps} />);
    fireEvent.click(screen.getByText('＋ 新しい種目を作成'));
    fireEvent.change(screen.getByRole('textbox', { name: '種目名' }), {
      target: { value: 'テスト種目' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'カテゴリ' }), {
      target: { value: '肩' },
    });
    fireEvent.click(screen.getByText('作成'));

    await waitFor(() => {
      expect(onExerciseCreated).toHaveBeenCalledWith(newExercise);
      expect(onChange).toHaveBeenCalledWith('200');
      expect(screen.queryByText('作成')).toBeNull();
    });
  });

  it('keeps form open and shows backend message on 409', async () => {
    const error409 = {
      isAxiosError: true,
      response: {
        status: 409,
        data: { message: '標準種目と同じ名前は使用できません' },
      },
    };
    mockCreateExercise.mockRejectedValueOnce(error409);

    render(<ExerciseSelect {...defaultProps} />);
    fireEvent.click(screen.getByText('＋ 新しい種目を作成'));
    fireEvent.change(screen.getByRole('textbox', { name: '種目名' }), {
      target: { value: 'ベンチプレス' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'カテゴリ' }), {
      target: { value: '胸' },
    });
    fireEvent.click(screen.getByText('作成'));

    await waitFor(() => {
      expect(
        screen.getByText('標準種目と同じ名前は使用できません'),
      ).toBeInTheDocument();
      expect(screen.getByText('作成')).toBeInTheDocument();
    });
    expect(screen.getByRole('textbox', { name: '種目名' })).toHaveValue(
      'ベンチプレス',
    );
  });

  it('calls showToast on 500 / network error', async () => {
    mockCreateExercise.mockRejectedValueOnce(new Error('Network error'));

    render(<ExerciseSelect {...defaultProps} />);
    fireEvent.click(screen.getByText('＋ 新しい種目を作成'));
    fireEvent.change(screen.getByRole('textbox', { name: '種目名' }), {
      target: { value: 'テスト種目' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'カテゴリ' }), {
      target: { value: '胸' },
    });
    fireEvent.click(screen.getByText('作成'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'error',
        '種目の作成に失敗しました',
      );
    });
  });

  it('closes form and resets inputs on cancel', () => {
    render(<ExerciseSelect {...defaultProps} />);
    fireEvent.click(screen.getByText('＋ 新しい種目を作成'));
    fireEvent.change(screen.getByRole('textbox', { name: '種目名' }), {
      target: { value: '入力中のテキスト' },
    });
    fireEvent.click(screen.getByText('キャンセル'));
    expect(screen.queryByText('作成')).toBeNull();
    // フォームが閉じてボタンが戻っている
    expect(screen.getByText('＋ 新しい種目を作成')).toBeInTheDocument();
  });
});
