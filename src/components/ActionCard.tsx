import {
  CheckCircle2,
  Circle,
  Clock,
  Info,
  Leaf,
  ShieldCheck,
  Users,
  Wind,
  Wrench,
} from 'lucide-react';
import type { ActionCategory, ActionRecommendation } from '../types/airQuality';

interface ActionCardProps {
  recommendation: ActionRecommendation;
  isAdopted: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleAdopt: () => void;
  onOpenDiyGuide?: () => void;
}

function getCategoryMeta(cat: ActionCategory) {
  switch (cat) {
    case 'routine':
      return {
        label: 'Daily Routine',
        badge: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-200',
        Icon: Clock,
      };
    case 'indoor-hack':
      return {
        label: 'Indoor Air Hack',
        badge: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200',
        Icon: Wind,
      };
    case 'sustainable-alt':
      return {
        label: 'Sustainable Alternative',
        badge: 'border-lime-500/30 bg-lime-500/15 text-lime-200',
        Icon: Leaf,
      };
    case 'community':
      return {
        label: 'Community Multiplier',
        badge: 'border-indigo-500/30 bg-indigo-500/15 text-indigo-200',
        Icon: Users,
      };
  }
}

/**
 * Displays a single tailored recommendation card with quantified exposure,
 * CO2e, INR savings, science mechanism toggle, and commit action control.
 */
export function ActionCard({
  recommendation: rec,
  isAdopted,
  isExpanded,
  onToggleExpand,
  onToggleAdopt,
  onOpenDiyGuide,
}: ActionCardProps) {
  const catMeta = getCategoryMeta(rec.category);
  const CatIcon = catMeta.Icon;

  return (
    <article
      className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
        isAdopted
          ? 'border-emerald-500/50 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
          : 'border-slate-800/90 bg-slate-900/65 hover:border-slate-700'
      }`}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${catMeta.badge}`}
          >
            <CatIcon className="h-3 w-3" aria-hidden="true" />
            {catMeta.label}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            {typeof rec.impact.monthlySavingsInr === 'number' &&
              rec.impact.monthlySavingsInr > 0 && (
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-amber-200">
                  Saves ₹{rec.impact.monthlySavingsInr.toLocaleString('en-IN')}/mo
                </span>
              )}
            <span className="rounded-md border border-slate-700/80 bg-slate-950/70 px-2 py-0.5">
              {rec.costLevel}
            </span>
            <span className="rounded-md border border-slate-700/80 bg-slate-950/70 px-2 py-0.5">
              {rec.effort}
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white sm:text-base">
            {rec.title}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            {rec.summary}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-300">
          <span className="font-semibold text-cyan-300">
            Why tailored to you:{' '}
          </span>
          {rec.tailoredReason}
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800/80 bg-slate-950/80 p-2.5 text-center">
          <div>
            <div className="font-mono text-sm font-bold text-emerald-300">
              -{rec.impact.personalExposureDropPct}%
            </div>
            <div className="text-[10px] text-slate-400">Exposure Drop</div>
          </div>
          <div className="border-x border-slate-800">
            <div className="font-mono text-sm font-bold text-cyan-300">
              {rec.impact.pm25AvoidedUgPerDay} µg
            </div>
            <div className="text-[10px] text-slate-400">PM2.5 Avoided/d</div>
          </div>
          <div>
            <div className="font-mono text-sm font-bold text-lime-300">
              {rec.impact.co2SavedKgPerWeek} kg
            </div>
            <div className="text-[10px] text-slate-400">CO₂ Cut/week</div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Direct Impact Explained
            </div>
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={onToggleExpand}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-300 hover:text-cyan-200"
            >
              <Info className="h-3 w-3" aria-hidden="true" />
              {isExpanded ? 'Hide Science' : 'Science Mechanism'}
            </button>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-200">
            {rec.impact.plainExplanation}
          </p>
          {isExpanded && (
            <p className="mt-2 border-t border-emerald-500/20 pt-2 text-[11px] leading-relaxed text-slate-400">
              <span className="font-semibold text-slate-300">Mechanism: </span>
              {rec.impact.mechanism}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-3">
        <span className="text-[11px] font-medium text-slate-400">
          Window: <span className="text-slate-200">{rec.timingWindow}</span>
        </span>
        <div className="flex items-center gap-2">
          {onOpenDiyGuide && (
            <button
              type="button"
              onClick={onOpenDiyGuide}
              className="inline-flex items-center gap-1 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
            >
              <Wrench className="h-3 w-3" aria-hidden="true" />
              Build Guide
            </button>
          )}
          <button
            type="button"
            aria-pressed={isAdopted}
            onClick={onToggleAdopt}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              isAdopted
                ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30 hover:bg-emerald-400'
                : 'border border-slate-700 bg-slate-950 text-slate-200 hover:border-emerald-400/50 hover:text-emerald-200'
            }`}
          >
            {isAdopted ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Committed
              </>
            ) : (
              <>
                <Circle className="h-3.5 w-3.5" aria-hidden="true" />
                Commit Action
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
