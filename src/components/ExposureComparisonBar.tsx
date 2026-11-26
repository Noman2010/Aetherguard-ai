interface ExposureComparisonBarProps {
  outdoorPm25: number;
  baselinePersonalPm25: number;
  protectedPersonalPm25: number;
}

/**
 * Visualizes personal PM2.5 exposure before and after committed interventions.
 */
export function ExposureComparisonBar({
  outdoorPm25,
  baselinePersonalPm25,
  protectedPersonalPm25,
}: ExposureComparisonBarProps) {
  const denom = Math.max(50, outdoorPm25);
  const baselineBarPct = Math.min(
    100,
    Math.max(15, Math.round((baselinePersonalPm25 / denom) * 100))
  );
  const protectedBarPct =
    baselinePersonalPm25 > 0
      ? Math.max(6, Math.round((protectedPersonalPm25 / denom) * 100))
      : 0;

  return (
    <div className="mb-4 rounded-xl border border-slate-800/90 bg-slate-950/80 p-3.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-200">
          Your Personal PM2.5 Exposure: Before vs. With Committed Choices
        </span>
        <span className="font-mono text-emerald-300">
          {baselinePersonalPm25} µg/m³ → {protectedPersonalPm25} µg/m³
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-[11px]">
          <span className="w-28 shrink-0 text-slate-400">Without Action</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-rose-500/80 transition-all"
              style={{ width: `${baselineBarPct}%` }}
            />
          </div>
          <span className="w-20 text-right font-mono text-rose-300">
            {baselinePersonalPm25} µg/m³
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="w-28 shrink-0 text-emerald-300">With Your Plan</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${protectedBarPct}%` }}
            />
          </div>
          <span className="w-20 text-right font-mono text-emerald-300">
            {protectedPersonalPm25} µg/m³
          </span>
        </div>
      </div>
    </div>
  );
}
