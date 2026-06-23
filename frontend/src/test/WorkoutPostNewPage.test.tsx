import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WorkoutPostNewPage from '../pages/WorkoutPostNewPage';
import * as AuthContextModule from '../contexts/AuthContext';
import * as exercisesApi from '../api/exercises';
import type { Exercise } from '../types/workout';

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal<typeof AuthContextModule>();
  return { ...mod, useAuth: vi.fn() };
});

vi.mock('../api/exercises', () => ({
  fetchExercises: vi.fn(),
}));

const mockUseAuth = vi.mocked(AuthContextModule.useAuth);
const mockFetchExercises = vi.mocked(exercisesApi.fetchExercises);

const mockExercises: Exercise[] = [
  { id: '1', name: 'ベンチプレス', category: '胸', description: null },
  { id: '2', name: 'スクワット', category: '脚', description: null },
];

beforeEach(() => {
  vi.clearAllMocks();
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
});

const renderNewPage = () =>
  render(
    <MemoryRouter initialEntries={['/workout-posts/new']}>
      <Routes>
        <Route path="/workout-posts/new" element={<WorkoutPostNewPage />} />
        <Route path="/" element={<div>timeline</div>} />
      </Routes>
    </MemoryRouter>,
  );

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
