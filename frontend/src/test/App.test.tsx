import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

vi.mock('../api/auth', () => ({
  refresh: vi.fn().mockRejectedValue(new Error('no session')),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

beforeEach(() => {
  window.history.pushState({}, '', '/login');
});

describe('App', () => {
  it('renders login page at /login', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /fitlog/i })).toBeTruthy();
    });
  });
});
