import { RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type {
  ActionCategory,
  ActionRecommendation,
  GenAIPlan,
} from '../types/airQuality';
import { ActionCard } from './ActionCard';
import { DiyPurifierModal } from './DiyPurifierModal';

interface ActionPlanBoardProps {
  plan: GenAIPlan;
  outdoorPm25: number;
  adoptedIds: string[];
  onToggleAdopt: (id: string) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

const CATEGORY_TABS: { id: 'all' | ActionCategory; label: string }[] = [
  { id: 'all', label: 'All Recommendations' },
  { id: 'routine', label: 'Low-Emission Routines' },
  { id: 'indoor-hack', label: 'Indoor Air Hacks' },
  { id: 'sustainable-alt', label: 'Sustainable Swaps' },
  { id: 'community', label: 'Community Action' },
];

/**
 * Renders the 3-phase low-emission daily timeline, category filter tabs,
 * and personalized recommendation cards.
 */
export function ActionPlanBoard({
  plan,
  outdoorPm25,
  adoptedIds,
  onToggleAdopt,
  onRegenerate,
  regenerating,
}: ActionPlanBoardProps) {
  const [activeTab, setActiveTab] = useState<'all' | ActionCategory>('all');
  const [expandedWhyId, setExpandedWhyId] = useState<string | null>(
    plan.recommendations[0]?.id ?? null
  );
  const [diyGuideOpen, setDiyGuideOpen] = useState(false);

  const visibleRecs =
    activeTab === 'all'
      ? plan.recommendations
      : plan.recommendations.filter((r) => r.category === activeTab);

  return (
    <section aria-label="Personalized GenAI Action Plan" className="space-y-4">
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

      {plan.dailyRoutineTimeline && plan.dailyRoutineTimeline.length > 0 && (
        <div className="grid gap-2.5 rounded-2xl border border-slate-800/90 bg-slate-900/50 p-3.5 sm:grid-cols-3">
          {plan.dailyRoutineTimeline.map((slot) => (
            <div
              key={slot.periodLabel}
              className="rounded-xl border border-slate-800 bg-slate-950/75 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-semibold text-cyan-300">
                  {slot.timeRange}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    slot.riskTag === 'Best Window'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : slot.riskTag === 'Peak Smog'
                        ? 'bg-rose-500/15 text-rose-300'
                        : 'bg-indigo-500/15 text-indigo-300'
                  }`}
                >
                  {slot.riskTag}
                </span>
              </div>
              <div className="mt-1 text-xs font-bold text-white">
                {slot.periodLabel}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                {slot.actionTitle}
              </p>
              <p className="mt-1 text-[10px] text-emerald-300">
                Impact: {slot.directImpactNote}
              </p>
            </div>
          ))}
        </div>
      )}

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

      <div role="tabpanel" className="grid gap-4 md:grid-cols-2">
        {visibleRecs.map((rec: ActionRecommendation) => (
          <ActionCard
            key={rec.id}
            recommendation={rec}
            isAdopted={adoptedIds.includes(rec.id)}
            isExpanded={expandedWhyId === rec.id}
            onToggleExpand={() =>
              setExpandedWhyId(expandedWhyId === rec.id ? null : rec.id)
            }
            onToggleAdopt={() => onToggleAdopt(rec.id)}
            onOpenDiyGuide={
              rec.id === 'indoor-diy-cr-box'
                ? () => setDiyGuideOpen(true)
                : undefined
            }
          />
        ))}
      </div>

      {diyGuideOpen && (
        <DiyPurifierModal
          open={diyGuideOpen}
          outdoorPm25={outdoorPm25}
          onClose={() => setDiyGuideOpen(false)}
        />
      )}
    </section>
  );
}
