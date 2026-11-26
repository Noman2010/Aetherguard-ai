import {
  Baby,
  Car,
  Flame,
  HeartPulse,
  Home,
  SlidersHorizontal,
  Wind,
} from 'lucide-react';
import type {
  CommuteMode,
  HeatingCookingType,
  HouseholdProfile,
  HouseholdType,
  PurifierAccess,
  SensitivityTag,
  VentilationType,
} from '../types/airQuality';

interface LifestyleConfiguratorProps {
  profile: HouseholdProfile;
  onChange: (next: HouseholdProfile) => void;
}

const HOUSEHOLD_TYPES: { id: HouseholdType; label: string }[] = [
  { id: 'young-family', label: 'Family w/ Kids' },
  { id: 'elderly-care', label: 'Senior Care' },
  { id: 'solo-commuter', label: 'Urban Commuter' },
  { id: 'community-organizer', label: 'Community Lead' },
];

const SENSITIVITIES: { id: SensitivityTag; label: string }[] = [
  { id: 'asthma', label: 'Asthma / Respiratory' },
  { id: 'infants', label: 'Infants / Toddlers' },
  { id: 'seniors', label: 'Seniors (65+)' },
  { id: 'outdoor-workers', label: 'Outdoor Workers' },
  { id: 'none', label: 'No Specific Risk' },
];

const COMMUTE_MODES: { id: CommuteMode; label: string }[] = [
  { id: 'car-solo', label: 'Solo Car' },
  { id: 'two-wheeler', label: 'Scooter / Moto' },
  { id: 'public-transit', label: 'Metro / Bus' },
  { id: 'walk-cycle', label: 'Walk / Cycle' },
  { id: 'remote-hybrid', label: 'Work From Home' },
];

const HEATING_COOKING: { id: HeatingCookingType; label: string }[] = [
  { id: 'gas-stove-no-hood', label: 'Gas Stove (No Hood)' },
  { id: 'electric-induction', label: 'Electric / Induction' },
  { id: 'biomass-coal', label: 'Wood / Charcoal / Coal' },
  { id: 'district-central', label: 'Central / Heat Pump' },
];

const PURIFIER_OPTIONS: { id: PurifierAccess; label: string }[] = [
  { id: 'none', label: 'No Purifier' },
  { id: 'diy-corsirosenthal', label: 'DIY Box Filter' },
  { id: 'hepa-unit', label: 'HEPA Purifier' },
];

const VENTILATION_OPTIONS: { id: VentilationType; label: string }[] = [
  { id: 'leaky-windows', label: 'Drafty Windows' },
  { id: 'sealed-ac', label: 'Sealed / Weatherstripped' },
  { id: 'cross-ventilation', label: 'Open Cross-Breeze' },
];

export function LifestyleConfigurator({
  profile,
  onChange,
}: LifestyleConfiguratorProps) {
  function toggleSensitivity(tag: SensitivityTag) {
    if (tag === 'none') {
      onChange({ ...profile, sensitivities: ['none'] });
      return;
    }
    const filtered = profile.sensitivities.filter((s) => s !== 'none');
    const exists = filtered.includes(tag);
    const next = exists
      ? filtered.filter((s) => s !== tag)
      : [...filtered, tag];
    onChange({
      ...profile,
      sensitivities: next.length > 0 ? next : ['none'],
    });
  }

  return (
    <aside className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              Household &amp; Lifestyle Context
            </h2>
            <p className="text-[11px] text-slate-400">
              Tailors GenAI prompts &amp; impact math live
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950/70 px-2.5 py-1 text-xs">
          <span className="text-slate-400">Size:</span>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...profile,
                householdSize: Math.max(1, profile.householdSize - 1),
              })
            }
            className="px-1 text-slate-300 hover:text-white"
          >
            -
          </button>
          <span className="font-mono font-bold text-cyan-300">
            {profile.householdSize}
          </span>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...profile,
                householdSize: Math.min(12, profile.householdSize + 1),
              })
            }
            className="px-1 text-slate-300 hover:text-white"
          >
            +
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Household Type */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Home className="h-3.5 w-3.5 text-cyan-400" />
            Household Role
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {HOUSEHOLD_TYPES.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ ...profile, householdType: opt.id })}
                className={`rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition ${
                  profile.householdType === opt.id
                    ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sensitivities */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <HeartPulse className="h-3.5 w-3.5 text-rose-400" />
            Health Sensitivities
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SENSITIVITIES.map((opt) => {
              const active = profile.sensitivities.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleSensitivity(opt.id)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    active
                      ? 'border-rose-400/60 bg-rose-500/15 text-rose-200'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Commute */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Car className="h-3.5 w-3.5 text-amber-400" />
            Daily Mobility
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COMMUTE_MODES.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ ...profile, commuteMode: opt.id })}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                  profile.commuteMode === opt.id
                    ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cooking & Heating */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            Cooking &amp; Heating Source
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {HEATING_COOKING.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ ...profile, heatingCooking: opt.id })}
                className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-medium transition ${
                  profile.heatingCooking === opt.id
                    ? 'border-orange-400/60 bg-orange-500/15 text-orange-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtration + Ventilation */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Baby className="h-3.5 w-3.5 text-emerald-400" />
              Indoor Air Filtration
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {PURIFIER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onChange({ ...profile, purifierAccess: opt.id })
                  }
                  className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-medium transition ${
                    profile.purifierAccess === opt.id
                      ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Wind className="h-3.5 w-3.5 text-sky-400" />
              Home Envelope
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {VENTILATION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onChange({ ...profile, homeVentilation: opt.id })
                  }
                  className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-medium transition ${
                    profile.homeVentilation === opt.id
                      ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
