import { Award, CigaretteOff, Leaf, Shield, Users } from 'lucide-react';
import type {
  AirQualitySnapshot,
  GenAIPlan,
  HouseholdProfile,
  LocationProfile,
} from '../types/airQuality';

interface ImpactSimulatorPanelProps {
  location: LocationProfile;
  snapshot: AirQualitySnapshot;
  profile: HouseholdProfile;
  plan: GenAIPlan;
  adoptedIds: string[];
}

export function ImpactSimulatorPanel({
  location,
  snapshot,
  profile,
  plan,
  adoptedIds,
}: ImpactSimulatorPanelProps) {
  const adoptedRecs = plan.recommendations.filter((r) =>
    adoptedIds.includes(r.id)
  );

  // Compounding exposure reduction: 1 - Π(1 - drop_i), capped at 86%
  const residualFraction = adoptedRecs.reduce(
    (acc, r) => acc * (1 - Math.min(0.75, r.impact.personalExposureDropPct / 100)),
    1
  );
  const combinedExposureDropPct =
    adoptedRecs.length === 0
      ? 0
      : Math.min(86, Math.round((1 - residualFraction) * 100));

  const dailyPm25AvoidedPerPerson = adoptedRecs.reduce(
    (sum, r) => sum + r.impact.pm25AvoidedUgPerDay,
    0
  );
  const householdDailyPm25AvoidedMg = Number(
    ((dailyPm25AvoidedPerPerson * profile.householdSize) / 1000).toFixed(2)
  );

  const weeklyCo2SavedKg = Number(
    adoptedRecs
      .reduce((sum, r) => sum + r.impact.co2SavedKgPerWeek, 0)
      .toFixed(1)
  );

  // Berkeley Earth approximation: ~22 ug/m3 PM2.5 over 24h (~14 m3 inhaled) ~ 308 ug/day ~ 1 cigarette/day
  const baselineDailyDoseUg = snapshot.pm25 * 14;
  const avoidedCigarettesPerDay = Number(
    ((baselineDailyDoseUg * (combinedExposureDropPct / 100)) / 308).toFixed(1)
  );

  const community100Co2TonnesWinter = Number(
    ((weeklyCo2SavedKg * 12 * 100) / 1000).toFixed(1)
  );

  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/35 via-slate-900/90 to-slate-950 p-5 shadow-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white sm:text-base">
              Direct Impact Simulator ({adoptedRecs.length} of{' '}
              {plan.recommendations.length} Actions Committed)
            </h2>
            <p className="text-xs text-slate-400">
              Real-time health &amp; emissions projection for your{' '}
              {profile.householdSize}-person household in {location.name}
            </p>
          </div>
        </div>
      </div>

      {/* 4 Impact Metric Tiles */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Personal PM2.5 Drop</span>
            <Shield className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-extrabold text-emerald-300">
            -{combinedExposureDropPct}%
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Household avoids{' '}
            <span className="font-semibold text-slate-200">
              {householdDailyPm25AvoidedMg} mg
            </span>{' '}
            of fine soot daily
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Lung Load Equiv. Avoided</span>
            <CigaretteOff className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-extrabold text-cyan-300">
            {avoidedCigarettesPerDay} / day
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Passive cigarette-equivalent soot spared per person (Berkeley Earth
            metric)
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Weekly Emissions Cut</span>
            <Leaf className="h-4 w-4 text-lime-400" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-extrabold text-lime-300">
            {weeklyCo2SavedKg} kg
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            CO₂e eliminated weekly from transport, heating &amp; clean cooking
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>100-Home Ward Scale</span>
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-extrabold text-indigo-300">
            {community100Co2TonnesWinter} t
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            CO₂e saved over a 12-week winter if 100 local families adopt your
            habits
          </p>
        </div>
      </div>

      {/* Community Narrative */}
      <div className="mt-3 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3.5 py-2.5 text-xs text-indigo-100">
        <span className="font-semibold text-indigo-300">
          Why Your Choices Matter Locally:{' '}
        </span>
        {plan.communityMultiplierNote}
      </div>
    </section>
  );
}
