import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRESET_CITIES, buildSimulatedSevereSmog } from './airQualityService';
import {
  askAetherGuardAdvisor,
  buildStructuredPrompt,
  generatePersonalizedPlan,
} from './genAiService';
import type { HouseholdProfile } from '../types/airQuality';

const BASE_PROFILE: HouseholdProfile = {
  householdType: 'young-family',
  sensitivities: ['asthma', 'infants'],
  commuteMode: 'car-solo',
  heatingCooking: 'gas-stove-no-hood',
  purifierAccess: 'none',
  homeVentilation: 'leaky-windows',
  householdSize: 4,
};

describe('genAiService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a telemetry-grounded structured prompt and JSON context payload', () => {
    const snap = buildSimulatedSevereSmog(PRESET_CITIES[0]);
    const { systemPrompt, contextPayload } = buildStructuredPrompt(
      PRESET_CITIES[0],
      snap,
      BASE_PROFILE
    );

    expect(systemPrompt).toContain('AetherGuard AI');
    expect(systemPrompt).toContain('Low-Emission Daily Routines');
    const parsed = JSON.parse(contextPayload) as {
      city: string;
      telemetry: { usAqi: number };
      household: HouseholdProfile;
    };
    expect(parsed.city).toBe('New Delhi, India');
    expect(parsed.telemetry.usAqi).toBe(snap.usAqi);
    expect(parsed.household.purifierAccess).toBe('none');
  });

  it('tailors recommendations to purifier access, commute, and cooking setup', async () => {
    const snap = buildSimulatedSevereSmog(PRESET_CITIES[0]);

    const noPurifierPlan = await generatePersonalizedPlan(
      PRESET_CITIES[0],
      snap,
      BASE_PROFILE
    );
    expect(noPurifierPlan.recommendations).toHaveLength(6);
    expect(
      noPurifierPlan.recommendations.some((r) =>
        r.title.includes('Corsi-Rosenthal')
      )
    ).toBe(true);
    expect(
      noPurifierPlan.recommendations.some((r) =>
        r.title.includes('Cooking & Heating')
      )
    ).toBe(true);

    const hepaInductionPlan = await generatePersonalizedPlan(
      PRESET_CITIES[0],
      snap,
      {
        ...BASE_PROFILE,
        purifierAccess: 'hepa-unit',
        heatingCooking: 'electric-induction',
        commuteMode: 'walk-cycle',
      }
    );
    expect(
      hepaInductionPlan.recommendations.some((r) =>
        r.title.includes('Clean Sleep Sanctuary')
      )
    ).toBe(true);
    expect(
      hepaInductionPlan.recommendations.some((r) =>
        r.title.includes('Mixing Window')
      )
    ).toBe(true);
  });

  it('uses Google Gemini API when valid key and structured JSON response are returned', async () => {
    const snap = buildSimulatedSevereSmog(PRESET_CITIES[0]);
    const mockRecs = (
      await generatePersonalizedPlan(PRESET_CITIES[0], snap, BASE_PROFILE)
    ).recommendations;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      headlineGuidance: 'Gemini Live Severe Smog Protocol',
                      smogBriefing: 'Live Gemini briefing.',
                      indoorVsOutdoorRatioNote: 'Keep rooms sealed.',
                      communityMultiplierNote: 'Block pact cuts peaks.',
                      recommendations: mockRecs,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      })
    );

    const livePlan = await generatePersonalizedPlan(
      PRESET_CITIES[0],
      snap,
      BASE_PROFILE,
      'AIzaSyMockedKey123456'
    );

    expect(livePlan.promptArtifact.mode).toBe('gemini-live');
    expect(livePlan.headlineGuidance).toBe('Gemini Live Severe Smog Protocol');
  });

  it('answers advisor questions across ventilation, kids/school, DIY purifier, and community topics', async () => {
    const snap = buildSimulatedSevereSmog(PRESET_CITIES[0]);
    const plan = await generatePersonalizedPlan(
      PRESET_CITIES[0],
      snap,
      BASE_PROFILE
    );

    const windowReply = await askAetherGuardAdvisor(
      'Should we open windows today?',
      PRESET_CITIES[0],
      snap,
      BASE_PROFILE,
      plan
    );
    expect(windowReply.content).toContain(plan.bestOutdoorWindow.startLabel);
    expect(windowReply.impactSummary).toBeTruthy();

    const diyReply = await askAetherGuardAdvisor(
      'How to build a DIY purifier?',
      PRESET_CITIES[0],
      snap,
      BASE_PROFILE,
      plan
    );
    expect(diyReply.content).toContain('Corsi-Rosenthal');

    const schoolReply = await askAetherGuardAdvisor(
      'Can kids walk to school?',
      PRESET_CITIES[0],
      snap,
      BASE_PROFILE,
      plan
    );
    expect(schoolReply.content).toContain('N95');
  });
});
