import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeSwitch from './ThemeSwitch';
import { ThemeProvider } from '../../context/ThemeContext';

describe('ThemeSwitch Component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders theme switch button with accessible aria-label', () => {
    render(
      <ThemeProvider>
        <ThemeSwitch />
      </ThemeProvider>
    );
    const button = screen.getByRole('button', { name: /переключить на/i });
    expect(button).toBeInTheDocument();
  });

  it('renders optional label when showLabel is true', () => {
    render(
      <ThemeProvider>
        <ThemeSwitch showLabel />
      </ThemeProvider>
    );
    expect(screen.getByText(/светлая тема|тёмная тема/i)).toBeInTheDocument();
  });

  it('toggles theme from light to dark and updates data-theme attribute', () => {
    localStorage.setItem('theme', 'light');
    render(
      <ThemeProvider>
        <ThemeSwitch />
      </ThemeProvider>
    );
    const button = screen.getByRole('button');

    fireEvent.click(button);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');

    // Click again to toggle back
    fireEvent.click(button);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
