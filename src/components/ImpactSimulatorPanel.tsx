import { Award, Check, CigaretteOff, Leaf, Share2, Shield, Users } from 'lucide-react';
import { useState } from 'react';
import type {
  AirQualitySnapshot,
  GenAIPlan,
  HouseholdProfile,
  LocationProfile,
} from '../types/airQuality';
import {
  buildCommunityBulletinText,
  calculateHouseholdImpact,
} from '../utils/impactCalculations';

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
  const [copiedBulletin, setCopiedBulletin] = useState(false);
  const summary = calculateHouseholdImpact(snapshot, profile, plan, adoptedIds);

  function handleCopyBulletin() {
    const bulletin = buildCommunityBulletinText(location, snapshot, plan, summary);
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(bulletin);
    }
    setCopiedBulletin(true);
    setTimeout(() => setCopiedBulletin(false), 2000);
  }

  return (
    <section
      aria-label="Direct Impact Simulator"
      className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/35 via-slate-900/90 to-slate-950 p-5 shadow-xl"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
            <Award className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white sm:text-base">
              Direct Impact Simulator ({summary.adoptedCount} of{' '}
              {summary.totalCount} Actions Committed)
            </h2>
            <p className="text-xs text-slate-400">
              Real-time health &amp; emissions projection for your{' '}
              {profile.householdSize}-person household in {location.name}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyBulletin}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
        >
          {copiedBulletin ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
              Neighborhood Alert Copied
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              Share Neighborhood Alert
            </>
          )}
        </button>
      </div>

      {/* 4 Impact Metric Tiles */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Personal PM2.5 Drop</span>
            <Shield className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-extrabold text-emerald-300">
            -{summary.combinedExposureDropPct}%
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Household avoids{' '}
            <span className="font-semibold text-slate-200">
              {summary.householdDailyPm25AvoidedMg} mg
            </span>{' '}
            of fine soot daily
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Lung Load Equiv. Avoided</span>
            <CigaretteOff className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-extrabold text-cyan-300">
            {summary.avoidedCigarettesPerDay} / day
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Passive cigarette-equivalent soot spared per person (Berkeley Earth
            metric)
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Weekly Emissions Cut</span>
            <Leaf className="h-4 w-4 text-lime-400" aria-hidden="true" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-extrabold text-lime-300">
            {summary.weeklyCo2SavedKg} kg
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            CO₂e eliminated weekly from transport, heating &amp; clean cooking
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-slate-950/75 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>100-Home Ward Scale</span>
            <Users className="h-4 w-4 text-indigo-400" aria-hidden="true" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-extrabold text-indigo-300">
            {summary.community100Co2TonnesWinter} t
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
