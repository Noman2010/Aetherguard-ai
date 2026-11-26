import type {
  AirQualitySnapshot,
  GenAIPlan,
  HouseholdProfile,
  LocationProfile,
} from '../types/airQuality';

export interface ImpactSummary {
  adoptedCount: number;
  totalCount: number;
  combinedExposureDropPct: number;
  householdDailyPm25AvoidedMg: number;
  avoidedCigarettesPerDay: number;
  weeklyCo2SavedKg: number;
  community100Co2TonnesWinter: number;
}

const MAX_EXPOSURE_DROP_PCT = 86;
const DAILY_INHALATION_M3 = 14;
const BERKELEY_EARTH_CIG_UG_PER_DAY = 308; // ~22 ug/m3 * 14 m3/day

/**
 * Calculates realistic compounding exposure reduction and community emission
 * savings for the user's committed action recommendations.
 */
export function calculateHouseholdImpact(
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile,
  plan: GenAIPlan,
  adoptedIds: string[]
): ImpactSummary {
  const adoptedRecs = plan.recommendations.filter((r) =>
    adoptedIds.includes(r.id)
  );

  // Multiplicative attenuation avoids impossible >100% exposure reductions.
  const residualFraction = adoptedRecs.reduce(
    (acc, r) =>
      acc * (1 - Math.min(0.75, Math.max(0, r.impact.personalExposureDropPct) / 100)),
    1
  );

  const combinedExposureDropPct =
    adoptedRecs.length === 0
      ? 0
      : Math.min(MAX_EXPOSURE_DROP_PCT, Math.round((1 - residualFraction) * 100));

  const dailyPm25AvoidedPerPerson = adoptedRecs.reduce(
    (sum, r) => sum + Math.max(0, r.impact.pm25AvoidedUgPerDay),
    0
  );

  const householdSize = Math.max(1, profile.householdSize);
  const householdDailyPm25AvoidedMg = Number(
    ((dailyPm25AvoidedPerPerson * householdSize) / 1000).toFixed(2)
  );

  const weeklyCo2SavedKg = Number(
    adoptedRecs
      .reduce((sum, r) => sum + Math.max(0, r.impact.co2SavedKgPerWeek), 0)
      .toFixed(1)
  );

  const baselineDailyDoseUg = Math.max(0, snapshot.pm25) * DAILY_INHALATION_M3;
  const avoidedCigarettesPerDay = Number(
    (
      (baselineDailyDoseUg * (combinedExposureDropPct / 100)) /
      BERKELEY_EARTH_CIG_UG_PER_DAY
    ).toFixed(1)
  );

  const community100Co2TonnesWinter = Number(
    ((weeklyCo2SavedKg * 12 * 100) / 1000).toFixed(1)
  );

  return {
    adoptedCount: adoptedRecs.length,
    totalCount: plan.recommendations.length,
    combinedExposureDropPct,
    householdDailyPm25AvoidedMg,
    avoidedCigarettesPerDay,
    weeklyCo2SavedKg,
    community100Co2TonnesWinter,
  };
}

/**
 * Formats a concise neighborhood bulletin suitable for WhatsApp, SMS, or HOA
 * clean-air alerts based on live telemetry and committed household actions.
 */
export function buildCommunityBulletinText(
  location: LocationProfile,
  snapshot: AirQualitySnapshot,
  plan: GenAIPlan,
  summary: ImpactSummary
): string {
  const adoptedTitles = plan.recommendations
    .slice(0, 3)
    .map((r) => `• ${r.title} (${r.timingWindow})`)
    .join('\n');

  return [
    `AetherGuard Clean-Air Alert — ${location.name}, ${location.country}`,
    `Current Air: US AQI ${snapshot.usAqi} | PM2.5 ${snapshot.pm25} µg/m³ | Inversion: ${snapshot.inversionSeverity}`,
    `Best Outdoor & Ventilation Window: ${plan.bestOutdoorWindow.startLabel}–${plan.bestOutdoorWindow.endLabel} (Avg AQI ${plan.bestOutdoorWindow.avgAqi})`,
    '',
    'Recommended Family & Block Actions:',
    adoptedTitles,
    '',
    `Direct Impact: -${summary.combinedExposureDropPct}% personal PM2.5 exposure, ${summary.weeklyCo2SavedKg} kg CO₂/week cut per household (${summary.community100Co2TonnesWinter}t saved across 100 homes this winter).`,
  ].join('\n');
}
