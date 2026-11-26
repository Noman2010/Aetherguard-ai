import type {
  AirQualitySnapshot,
  GenAIPlan,
  GrapAdvisory,
  HouseholdProfile,
  LocationProfile,
} from '../types/airQuality';

export interface ImpactSummary {
  adoptedCount: number;
  totalCount: number;
  combinedExposureDropPct: number;
  baselinePersonalPm25: number;
  protectedPersonalPm25: number;
  householdDailyPm25AvoidedMg: number;
  avoidedCigarettesPerDay: number;
  weeklyCo2SavedKg: number;
  monthlySavingsInr: number;
  communityHomesCount: number;
  communityCo2TonnesWinter: number;
  communityPm25KgWinter: number;
}

const MAX_EXPOSURE_DROP_PCT = 86;
const DAILY_INHALATION_M3 = 14;
const BERKELEY_EARTH_CIG_UG_PER_DAY = 308; // ~22 ug/m3 * 14 m3/day
const WINTER_WEEKS = 12;

/**
 * Estimates baseline indoor/personal PM2.5 exposure before applying committed
 * interventions, accounting for purifier access and window envelope tightness.
 */
function estimateBaselinePersonalPm25(
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile
): number {
  const envelopeFactor =
    profile.homeVentilation === 'cross-ventilation'
      ? 0.88
      : profile.homeVentilation === 'leaky-windows'
        ? 0.72
        : 0.56;
  const purifierFactor =
    profile.purifierAccess === 'hepa-unit'
      ? 0.65
      : profile.purifierAccess === 'diy-corsirosenthal'
        ? 0.7
        : 1.0;
  const cookingPenalty =
    profile.heatingCooking === 'biomass-coal'
      ? 24
      : profile.heatingCooking === 'gas-stove-no-hood'
        ? 14
        : 0;

  return Number(
    (snapshot.pm25 * envelopeFactor * purifierFactor + cookingPenalty).toFixed(1)
  );
}

/**
 * Calculates realistic compounding exposure reduction, financial savings in INR,
 * and community-scale emission savings for committed household actions.
 */
export function calculateHouseholdImpact(
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile,
  plan: GenAIPlan,
  adoptedIds: string[],
  communityHomesCount = 100
): ImpactSummary {
  const adoptedRecs = plan.recommendations.filter((r) =>
    adoptedIds.includes(r.id)
  );

  // Multiplicative attenuation avoids impossible >100% exposure reductions.
  const residualFraction = adoptedRecs.reduce(
    (acc, r) =>
      acc *
      (1 - Math.min(0.75, Math.max(0, r.impact.personalExposureDropPct) / 100)),
    1
  );

  const combinedExposureDropPct =
    adoptedRecs.length === 0
      ? 0
      : Math.min(MAX_EXPOSURE_DROP_PCT, Math.round((1 - residualFraction) * 100));

  const baselinePersonalPm25 = estimateBaselinePersonalPm25(snapshot, profile);
  const protectedPersonalPm25 = Number(
    (baselinePersonalPm25 * (1 - combinedExposureDropPct / 100)).toFixed(1)
  );

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

  const monthlySavingsInr = Math.round(
    adoptedRecs.reduce(
      (sum, r) => sum + Math.max(0, r.impact.monthlySavingsInr ?? 0),
      0
    )
  );

  const baselineDailyDoseUg = Math.max(0, snapshot.pm25) * DAILY_INHALATION_M3;
  const avoidedCigarettesPerDay = Number(
    (
      (baselineDailyDoseUg * (combinedExposureDropPct / 100)) /
      BERKELEY_EARTH_CIG_UG_PER_DAY
    ).toFixed(1)
  );

  const safeHomes = Math.max(10, communityHomesCount);
  const communityCo2TonnesWinter = Number(
    ((weeklyCo2SavedKg * WINTER_WEEKS * safeHomes) / 1000).toFixed(1)
  );
  // Approximate PM2.5 source + lung exposure avoided across the cluster in kg/winter
  const communityPm25KgWinter = Number(
    (
      (householdDailyPm25AvoidedMg * 84 * safeHomes) /
      1_000_000
    ).toFixed(2)
  );

  return {
    adoptedCount: adoptedRecs.length,
    totalCount: plan.recommendations.length,
    combinedExposureDropPct,
    baselinePersonalPm25,
    protectedPersonalPm25,
    householdDailyPm25AvoidedMg,
    avoidedCigarettesPerDay,
    weeklyCo2SavedKg,
    monthlySavingsInr,
    communityHomesCount: safeHomes,
    communityCo2TonnesWinter,
    communityPm25KgWinter,
  };
}

/**
 * Maps India CPCB Graded Response Action Plan (GRAP) stages to practical
 * household and RWA guidance during severe winter smog episodes.
 */
export function getIndiaGrapAdvisory(
  usAqi: number,
  pm25: number
): GrapAdvisory {
  if (usAqi >= 350 || pm25 >= 250) {
    return {
      stage: 'GRAP Stage IV (Severe+)',
      badgeClass: 'border-red-400/50 bg-red-500/20 text-red-200',
      summary:
        'Emergency winter smog: shift kids/seniors strictly indoors, run bedroom HEPA/DIY filtration continuously, ban diesel generators & open burning.',
    };
  }
  if (usAqi >= 250 || pm25 >= 150) {
    return {
      stage: 'GRAP Stage III (Severe)',
      badgeClass: 'border-rose-400/50 bg-rose-500/15 text-rose-200',
      summary:
        'Severe haze: avoid outdoor morning exercise, use N95/KF94 for essential commutes, and keep RWA construction dust suppressed with wet misting.',
    };
  }
  if (usAqi >= 150 || pm25 >= 75) {
    return {
      stage: 'GRAP Stage II (Very Poor)',
      badgeClass: 'border-orange-400/50 bg-orange-500/15 text-orange-200',
      summary:
        'Very poor dispersion: curb private solo car trips, switch cooking off open flames, and confine outdoor errands to the afternoon mixing window.',
    };
  }
  if (usAqi >= 100 || pm25 >= 40) {
    return {
      stage: 'GRAP Stage I (Poor)',
      badgeClass: 'border-amber-400/50 bg-amber-500/15 text-amber-200',
      summary:
        'Poor winter air: enforce idle-free school/society gates, wet-mop indoor dust, and monitor sensitive respiratory symptoms.',
    };
  }
  return {
    stage: 'GRAP Normal Watch',
    badgeClass: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
    summary:
      'Dispersion favorable: cross-ventilate rooms during midday sun while keeping low-emission transit and clean cooking habits active.',
  };
}

/**
 * Formats a concise neighborhood bulletin suitable for WhatsApp, SMS, or RWA
 * clean-air alerts based on live telemetry and committed household actions.
 */
export function buildCommunityBulletinText(
  location: LocationProfile,
  snapshot: AirQualitySnapshot,
  plan: GenAIPlan,
  summary: ImpactSummary
): string {
  const grap = getIndiaGrapAdvisory(snapshot.usAqi, snapshot.pm25);
  const adoptedTitles = plan.recommendations
    .slice(0, 3)
    .map((r) => `• ${r.title} (${r.timingWindow})`)
    .join('\n');

  return [
    `AetherGuard Clean-Air Alert — ${location.name}, ${location.country}`,
    `Current Air: US AQI ${snapshot.usAqi} | PM2.5 ${snapshot.pm25} µg/m³ | ${grap.stage}`,
    `Best Outdoor & Ventilation Window: ${plan.bestOutdoorWindow.startLabel}–${plan.bestOutdoorWindow.endLabel} (Avg AQI ${plan.bestOutdoorWindow.avgAqi})`,
    '',
    'Recommended Family & RWA Actions:',
    adoptedTitles,
    '',
    `Direct Impact: -${summary.combinedExposureDropPct}% personal PM2.5 (${summary.baselinePersonalPm25} → ${summary.protectedPersonalPm25} µg/m³), ₹${summary.monthlySavingsInr.toLocaleString('en-IN')}/mo saved, ${summary.weeklyCo2SavedKg} kg CO₂/week cut (${summary.communityCo2TonnesWinter}t across ${summary.communityHomesCount} homes this winter).`,
  ].join('\n');
}
