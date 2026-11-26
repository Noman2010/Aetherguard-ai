import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { DiyPurifierModal } from './DiyPurifierModal';

describe('Dashboard Extended Flows & Modals', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Offline test mode'))
    );
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        value: vi.fn(() => 'blob:mock-url'),
        writable: true,
      });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        value: vi.fn(),
        writable: true,
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('supports Indian city quick switching, city search, household size, DIY build guide, and Gemini API key lifecycle', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByText(/Personalized GenAI Action Plan/i)
    ).toBeInTheDocument();

    // 1. Quick-switch to Mumbai via header strip
    await user.click(screen.getByRole('button', { name: 'Mumbai' }));
    await waitFor(() => {
      expect(
        screen.getByText(/Showing air quality plan for Mumbai, India/i)
      ).toBeInTheDocument();
    });

    // 2. Search city combobox & pick Kolkata from dropdown
    const searchInput = screen.getByRole('combobox', {
      name: /Search urban location/i,
    });
    await user.click(searchInput);
    await user.type(searchInput, 'Kolkata');
    const kolkataOption = await screen.findByRole('option', {
      name: /Kolkata/i,
    });
    await user.click(kolkataOption);
    await waitFor(() => {
      expect(
        screen.getByText(/Showing air quality plan for Kolkata, India/i)
      ).toBeInTheDocument();
    });

    // 3. Adjust household size and toggle sensitivity + cooking source
    await user.click(
      screen.getByRole('button', { name: 'Increase household size' })
    );
    expect(
      screen.getByText(/5-person household in Kolkata/i)
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Decrease household size' })
    );
    await user.click(screen.getByRole('button', { name: 'Seniors (65+)' }));
    await user.click(
      screen.getByRole('button', { name: 'Electric / Induction' })
    );
    await user.click(
      screen.getByRole('button', { name: 'Sealed / Weatherstripped' })
    );

    // 4. Open DIY Build Guide modal from the ₹3,200 Corsi-Rosenthal card
    await user.click(screen.getByRole('button', { name: /Build Guide/i }));
    expect(
      screen.getByRole('dialog', {
        name: /₹3,200 DIY Corsi-Rosenthal Clean-Air Cube Blueprint/i,
      })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // 5. Inspect an hour bar on the 24-hour forecast chart
    const hourBars = screen.getAllByRole('button', {
      name: /micrograms per cubic meter/i,
    });
    await user.click(hourBars[0]);
    expect(screen.getByText(/Selected Hour:/i)).toBeInTheDocument();

    // 6. Download RWA clean-air notice
    await user.click(
      screen.getByRole('button', { name: /Download RWA clean-air notice/i })
    );

    // 7. Save, copy, and clear Gemini API key inside PromptInspectorModal
    await user.click(
      screen.getByRole('button', { name: /Prompt & Gemini API/i })
    );
    const keyInput = screen.getByLabelText(
      /Connect Live Google Gemini 2\.5 Flash API/i
    );
    await user.type(keyInput, 'AIzaSyTestKey123456');
    await user.click(screen.getByRole('button', { name: /Copy Prompt/i }));
    await user.click(
      screen.getByRole('button', { name: /Save & Activate Gemini/i })
    );
    expect(localStorage.getItem('aetherguard_gemini_key')).toBe(
      'AIzaSyTestKey123456'
    );

    await user.click(
      screen.getByRole('button', { name: /Prompt & Gemini API/i })
    );
    await user.click(
      screen.getByRole('button', { name: /Clear saved Gemini API key/i })
    );
    expect(localStorage.getItem('aetherguard_gemini_key')).toBeNull();
  });

  it('closes DiyPurifierModal via Escape key', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <DiyPurifierModal open={true} outdoorPm25={180} onClose={onClose} />
    );

    expect(screen.getAllByText(/₹1,800/i).length).toBeGreaterThanOrEqual(1);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
