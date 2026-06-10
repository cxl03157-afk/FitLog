import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it('displays Vite-related content', () => {
    render(<App />);
    expect(screen.getAllByText(/vite/i).length).toBeGreaterThan(0);
  });
});
