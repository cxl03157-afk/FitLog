import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import * as AuthContextModule from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal<typeof AuthContextModule>();
  return { ...mod, useAuth: vi.fn() };
});

const mockUseAuth = vi.mocked(AuthContextModule.useAuth);
const mockLogin = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: mockLogin,
    register: vi.fn(),
    logout: vi.fn(),
  });
});

const renderLoginPage = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>timeline</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('LoginPage', () => {
  it('shows validation error when email is empty', async () => {
    renderLoginPage();
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    expect(screen.getByText('メールアドレスを入力してください')).toBeTruthy();
  });

  it('shows validation error for invalid email format', async () => {
    renderLoginPage();
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'notanemail');
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    expect(screen.getByText('メールアドレスの形式が正しくありません')).toBeTruthy();
  });

  it('shows validation error when password is too short', async () => {
    renderLoginPage();
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    await userEvent.type(screen.getByPlaceholderText('8文字以上'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    expect(screen.getByText('パスワードは8文字以上で入力してください')).toBeTruthy();
  });

  it('calls login with email and password on valid submit', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLoginPage();
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    await userEvent.type(screen.getByPlaceholderText('8文字以上'), 'password1');
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'password1');
    });
  });
});
