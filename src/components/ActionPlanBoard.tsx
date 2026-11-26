import {
  CheckCircle2,
  Circle,
  Clock,
  Info,
  Leaf,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Wind,
} from 'lucide-react';
import { useState } from 'react';
import type {
  ActionCategory,
  ActionRecommendation,
  GenAIPlan,
} from '../types/airQuality';

interface ActionPlanBoardProps {
  plan: GenAIPlan;
  adoptedIds: string[];
  onToggleAdopt: (id: string) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

const CATEGORY_TABS: {
  id: 'all' | ActionCategory;
  label: string;
}[] = [
  { id: 'all', label: 'All Recommendations' },
  { id: 'routine', label: 'Low-Emission Routines' },
  { id: 'indoor-hack', label: 'Indoor Air Hacks' },
  { id: 'sustainable-alt', label: 'Sustainable Swaps' },
  { id: 'community', label: 'Community Action' },
];

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

export function ActionPlanBoard({
  plan,
  adoptedIds,
  onToggleAdopt,
  onRegenerate,
  regenerating,
}: ActionPlanBoardProps) {
  const [activeTab, setActiveTab] = useState<'all' | ActionCategory>('all');
  const [expandedWhyId, setExpandedWhyId] = useState<string | null>(
    plan.recommendations[0]?.id ?? null
  );

  const visibleRecs =
    activeTab === 'all'
      ? plan.recommendations
      : plan.recommendations.filter((r) => r.category === activeTab);

  return (
    <section aria-label="Personalized GenAI Action Plan" className="space-y-4">
      {/* Header + Filter Pills */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <h2 className="text-base font-bold text-white sm:text-lg">
              Personalized GenAI Action Plan &amp; Impact Breakdown
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Generated via{' '}
            <span className="font-medium text-slate-300">
              {plan.promptArtifact.modelLabel}
            </span>{' '}
            in {plan.promptArtifact.latencyMs}ms • Click{' '}
            <span className="text-emerald-300">Commit Action</span> to simulate
            cumulative impact.
          </p>
        </div>

        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {regenerating ? 'Synthesizing...' : 'Refresh AI Plan'}
        </button>
      </div>

      {/* Category Tabs */}
      <div
        role="tablist"
        aria-label="Filter recommendations by category"
        className="flex flex-wrap gap-1.5"
      >
        {CATEGORY_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                  : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      <div role="tabpanel" className="grid gap-4 md:grid-cols-2">
        {visibleRecs.map((rec: ActionRecommendation) => {
          const catMeta = getCategoryMeta(rec.category);
          const CatIcon = catMeta.Icon;
          const isAdopted = adoptedIds.includes(rec.id);
          const isExpanded = expandedWhyId === rec.id;

          return (
            <article
              key={rec.id}
              className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                isAdopted
                  ? 'border-emerald-500/50 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
                  : 'border-slate-800/90 bg-slate-900/65 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                {/* Top badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${catMeta.badge}`}
                  >
                    <CatIcon className="h-3 w-3" aria-hidden="true" />
                    {catMeta.label}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="rounded-md border border-slate-700/80 bg-slate-950/70 px-2 py-0.5">
                      {rec.costLevel}
                    </span>
                    <span className="rounded-md border border-slate-700/80 bg-slate-950/70 px-2 py-0.5">
                      {rec.effort}
                    </span>
                  </div>
                </div>

                {/* Title & Summary */}
                <div>
                  <h3 className="text-sm font-bold text-white sm:text-base">
                    {rec.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    {rec.summary}
                  </p>
                </div>

                {/* Tailored Context Pill */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-300">
                  <span className="font-semibold text-cyan-300">
                    Why tailored to you:{' '}
                  </span>
                  {rec.tailoredReason}
                </div>

                {/* Quantified Direct Impact Strip */}
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800/80 bg-slate-950/80 p-2.5 text-center">
                  <div>
                    <div className="font-mono text-sm font-bold text-emerald-300">
                      -{rec.impact.personalExposureDropPct}%
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Exposure Drop
                    </div>
                  </div>
                  <div className="border-x border-slate-800">
                    <div className="font-mono text-sm font-bold text-cyan-300">
                      {rec.impact.pm25AvoidedUgPerDay} µg
                    </div>
                    <div className="text-[10px] text-slate-400">
                      PM2.5 Avoided/d
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-lime-300">
                      {rec.impact.co2SavedKgPerWeek} kg
                    </div>
                    <div className="text-[10px] text-slate-400">
                      CO₂ Cut/week
                    </div>
                  </div>
                </div>

                {/* Direct Impact Explanation */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Direct Impact Explained
                    </div>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedWhyId(isExpanded ? null : rec.id)
                      }
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
                      <span className="font-semibold text-slate-300">
                        Mechanism:{' '}
                      </span>
                      {rec.impact.mechanism}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer: Timing + Commit Toggle */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-800/70 pt-3">
                <span className="text-[11px] font-medium text-slate-400">
                  Window: <span className="text-slate-200">{rec.timingWindow}</span>
                </span>
                <button
                  type="button"
                  aria-pressed={isAdopted}
                  onClick={() => onToggleAdopt(rec.id)}
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
            </article>
          );
        })}
      </div>
    </section>
  );
}
