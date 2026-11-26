import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function ThrowingChild(): never {
  throw new Error('Telemetry widget crashed');
}

describe('ErrorBoundary', () => {
  it('renders children normally when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <div>Healthy Dashboard</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Healthy Dashboard')).toBeInTheDocument();
  });

  it('catches rendering errors and displays accessible recovery alert', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText(/Unable to render AetherGuard dashboard/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Telemetry widget crashed/i)).toBeInTheDocument();

    spy.mockRestore();
  });
});
