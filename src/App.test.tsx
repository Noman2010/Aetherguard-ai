import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

describe('AetherGuard AI Integration', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network disabled in unit test'))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders telemetry, toggles Severe Smog Simulation, updates HEPA profile, commits actions, and answers advisor questions', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for initial plan synthesis to appear
    expect(
      await screen.findByText(/Personalized GenAI Action Plan/i)
    ).toBeInTheDocument();

    // 1. Toggle Simulate Winter Smog
    const simButton = screen.getByRole('button', {
      name: /Simulate Winter Smog/i,
    });
    await user.click(simButton);

    expect(
      await screen.findByRole('button', { name: /Severe Smog Sim: ON/i })
    ).toBeInTheDocument();
    expect(screen.getByText('338')).toBeInTheDocument();

    // 2. Switch Indoor Air Filtration to HEPA Purifier
    await user.click(screen.getByRole('button', { name: 'HEPA Purifier' }));
    await waitFor(() => {
      expect(
        screen.getByText(/Clean Sleep Sanctuary/i)
      ).toBeInTheDocument();
    });

    // 3. Filter tabs (role="tab")
    await user.click(
      screen.getByRole('tab', { name: 'Low-Emission Routines' })
    );
    expect(screen.getAllByRole('article')).toHaveLength(2);

    await user.click(
      screen.getByRole('tab', { name: 'All Recommendations' })
    );
    expect(screen.getAllByRole('article')).toHaveLength(6);

    // 4. Commit an additional action and verify count increments
    expect(
      screen.getByText(/Direct Impact Simulator \(1 of 6 Actions Committed\)/i)
    ).toBeInTheDocument();
    const commitButtons = screen.getAllByRole('button', {
      name: 'Commit Action',
    });
    await user.click(commitButtons[0]);
    expect(
      screen.getByText(/Direct Impact Simulator \(2 of 6 Actions Committed\)/i)
    ).toBeInTheDocument();

    // Verify Share Neighborhood Alert button works
    await user.click(
      screen.getByRole('button', { name: /Share Neighborhood Alert/i })
    );
    expect(
      screen.getByRole('button', { name: /Neighborhood Alert Copied/i })
    ).toBeInTheDocument();

    // 5. Ask AetherGuard AI Advisor via starter chip
    await user.click(
      screen.getByRole('button', { name: 'Should we open windows today?' })
    );
    expect(
      await screen.findByText(/Prevents ~45% indoor PM2\.5 surge/i)
    ).toBeInTheDocument();

    // 6. Open Prompt & Gemini API modal and close with Escape
    await user.click(
      screen.getByRole('button', { name: /Prompt & Gemini API/i })
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
