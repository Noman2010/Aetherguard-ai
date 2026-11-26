import { describe, expect, it } from 'vitest';
import {
  PRESET_CITIES,
  buildSimulatedSevereSmog,
} from '../services/airQualityService';
import type { GenAIPlan, HouseholdProfile } from '../types/airQuality';
import {
  buildCommunityBulletinText,
  calculateHouseholdImpact,
  getIndiaGrapAdvisory,
} from './impactCalculations';

const SAMPLE_PROFILE: HouseholdProfile = {
  householdType: 'young-family',
  sensitivities: ['asthma', 'infants'],
  commuteMode: 'car-solo',
  heatingCooking: 'gas-stove-no-hood',
  purifierAccess: 'none',
  homeVentilation: 'leaky-windows',
  householdSize: 4,
};

const SAMPLE_PLAN: GenAIPlan = {
  headlineGuidance: 'Stay indoors during morning inversion',
  smogBriefing: 'High PM2.5 episode',
  bestOutdoorWindow: {
    startLabel: '13:00',
    endLabel: '16:00',
    avgAqi: 190,
    avgPm25: 112,
    guidance: 'Brief window',
  },
  indoorVsOutdoorRatioNote: 'Indoor air is 70% of outdoor without filtration.',
  communityMultiplierNote: '100 homes cut 2.4 tonnes CO2.',
  recommendations: [
    {
      id: 'r1',
      category: 'routine',
      title: 'Shift commute',
      summary: 'Delay drive',
      timingWindow: '13:00–16:00',
      costLevel: 'Free',
      effort: 'Habit shift',
      tailoredReason: 'Cold start reduction',
      impact: {
        personalExposureDropPct: 40,
        pm25AvoidedUgPerDay: 200,
        co2SavedKgPerWeek: 20,
        monthlySavingsInr: 3200,
        mechanism: 'Warm engine emission cut',
        plainExplanation: 'Cuts exhaust dose',
      },
    },
    {
      id: 'r2',
      category: 'indoor-hack',
      title: 'DIY Corsi-Rosenthal Cube',
      summary: 'Filter bedroom air',
      timingWindow: 'Continuous',
      costLevel: 'Low (₹)',
      effort: '15 mins',
      tailoredReason: 'No HEPA purifier',
      impact: {
        personalExposureDropPct: 60,
        pm25AvoidedUgPerDay: 500,
        co2SavedKgPerWeek: 2.5,
        monthlySavingsInr: 1800,
        mechanism: 'MERV-13 CADR scrubbing',
        plainExplanation: 'Cuts bedroom PM2.5',
      },
    },
    {
      id: 'r3',
      category: 'sustainable-alt',
      title: 'Induction Cooking',
      summary: 'Replace gas flame',
      timingWindow: 'Daily',
      costLevel: 'Moderate (₹₹)',
      effort: 'Habit shift',
      tailoredReason: 'Gas stove without hood',
      impact: {
        personalExposureDropPct: 50,
        pm25AvoidedUgPerDay: 300,
        co2SavedKgPerWeek: 10,
        monthlySavingsInr: 1650,
        mechanism: 'Zero indoor combustion',
        plainExplanation: 'Prevents NO2 spikes',
      },
    },
  ],
  promptArtifact: {
    systemPrompt: 'sys',
    contextPayload: '{}',
    modelLabel: 'Test Engine',
    mode: 'contextual-engine',
    latencyMs: 12,
  },
};

describe('impactCalculations', () => {
  it('returns zero impact when no actions are committed', () => {
    const snap = buildSimulatedSevereSmog(PRESET_CITIES[0]);
    const summary = calculateHouseholdImpact(snap, SAMPLE_PROFILE, SAMPLE_PLAN, []);

    expect(summary.adoptedCount).toBe(0);
    expect(summary.combinedExposureDropPct).toBe(0);
    expect(summary.householdDailyPm25AvoidedMg).toBe(0);
    expect(summary.weeklyCo2SavedKg).toBe(0);
    expect(summary.monthlySavingsInr).toBe(0);
    expect(summary.protectedPersonalPm25).toBe(summary.baselinePersonalPm25);
  });

  it('computes compounding exposure drop capped at 86%, INR savings, and custom RWA scaling', () => {
    const snap = buildSimulatedSevereSmog(PRESET_CITIES[0]);
    const summary = calculateHouseholdImpact(
      snap,
      SAMPLE_PROFILE,
      SAMPLE_PLAN,
      ['r1', 'r2', 'r3'],
      200
    );

    expect(summary.adoptedCount).toBe(3);
    expect(summary.combinedExposureDropPct).toBe(86);
    expect(summary.protectedPersonalPm25).toBeLessThan(
      summary.baselinePersonalPm25
    );
    expect(summary.householdDailyPm25AvoidedMg).toBe(4);
    expect(summary.weeklyCo2SavedKg).toBe(32.5);
    expect(summary.monthlySavingsInr).toBe(6650);
    // 32.5 * 12 * 200 / 1000 = 78 tonnes
    expect(summary.communityCo2TonnesWinter).toBe(78);
    expect(summary.avoidedCigarettesPerDay).toBeGreaterThan(5);
  });

  it('maps India CPCB GRAP stages across AQI thresholds', () => {
    expect(getIndiaGrapAdvisory(45, 12).stage).toBe('GRAP Normal Watch');
    expect(getIndiaGrapAdvisory(120, 48).stage).toBe('GRAP Stage I (Poor)');
    expect(getIndiaGrapAdvisory(195, 95).stage).toBe(
      'GRAP Stage II (Very Poor)'
    );
    expect(getIndiaGrapAdvisory(285, 165).stage).toBe(
      'GRAP Stage III (Severe)'
    );
    expect(getIndiaGrapAdvisory(390, 260).stage).toBe(
      'GRAP Stage IV (Severe+)'
    );
  });

  it('builds a shareable neighborhood clean-air alert bulletin with INR and GRAP info', () => {
    const snap = buildSimulatedSevereSmog(PRESET_CITIES[0]);
    const summary = calculateHouseholdImpact(snap, SAMPLE_PROFILE, SAMPLE_PLAN, [
      'r1',
      'r2',
    ]);
    const text = buildCommunityBulletinText(
      PRESET_CITIES[0],
      snap,
      SAMPLE_PLAN,
      summary
    );

    expect(text).toContain('New Delhi, India');
    expect(text).toContain('GRAP Stage');
    expect(text).toContain('₹5,000/mo');
    expect(text).toContain('13:00–16:00');
  });
});
