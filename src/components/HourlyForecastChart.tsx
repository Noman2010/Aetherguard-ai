import { useState } from 'react';
import type { CleanAirWindow, HourlyForecastPoint } from '../types/airQuality';

interface HourlyForecastChartProps {
  hourlyForecast: HourlyForecastPoint[];
  bestOutdoorWindow: CleanAirWindow;
}

/**
 * Interactive 24-hour dispersion bar chart highlighting the cleanest 3-hour
 * outdoor window and letting users click any hour bar to inspect AQI & PM2.5.
 */
export function HourlyForecastChart({
  hourlyForecast,
  bestOutdoorWindow,
}: HourlyForecastChartProps) {
  const [selectedHourIdx, setSelectedHourIdx] = useState<number | null>(null);
  const forecastSlice = hourlyForecast.slice(0, 24);
  const maxAqi = Math.max(180, ...hourlyForecast.map((h) => h.usAqi));
  const inspectedHour =
    selectedHourIdx !== null ? forecastSlice[selectedHourIdx] : undefined;

  return (
    <div className="relative">
      {inspectedHour && (
        <div
          aria-live="polite"
          className="mb-1.5 flex items-center justify-between rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100"
        >
          <span>
            Selected Hour:{' '}
            <strong className="font-mono">{inspectedHour.hourLabel}</strong>
          </span>
          <span className="font-mono">
            US AQI {inspectedHour.usAqi} • {inspectedHour.pm25} µg/m³ PM2.5
          </span>
        </div>
      )}

      <div
        role="group"
        aria-label={`24-hour AQI forecast chart highlighting cleanest window ${bestOutdoorWindow.startLabel} to ${bestOutdoorWindow.endLabel} at average AQI ${bestOutdoorWindow.avgAqi}`}
        className="relative flex h-32 items-end gap-1 pt-4"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 left-0 border-t border-dashed border-emerald-400/35"
          style={{
            bottom: `${Math.min(
              85,
              Math.max(15, Math.round((50 / maxAqi) * 100))
            )}%`,
          }}
        />
        {forecastSlice.map((pt, idx) => {
          const heightPct = Math.max(12, Math.round((pt.usAqi / maxAqi) * 100));
          const isBest =
            pt.hourLabel >= bestOutdoorWindow.startLabel &&
            pt.hourLabel <= bestOutdoorWindow.endLabel;
          const isSelected = selectedHourIdx === idx;
          const barColor = isBest
            ? 'bg-emerald-400/90 hover:bg-emerald-300'
            : pt.usAqi > 150
              ? 'bg-rose-500/80 hover:bg-rose-400'
              : 'bg-amber-400/75 hover:bg-amber-300';
          return (
            <div
              key={`${pt.isoTime}-${idx}`}
              className="group relative flex h-full flex-1 flex-col items-center justify-end"
            >
              <button
                type="button"
                onClick={() => setSelectedHourIdx(isSelected ? null : idx)}
                aria-pressed={isSelected}
                aria-label={`${pt.hourLabel}: AQI ${pt.usAqi}, PM2.5 ${pt.pm25} micrograms per cubic meter`}
                className={`w-full rounded-t-sm transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${barColor} ${
                  isSelected ? 'ring-2 ring-white' : ''
                }`}
                style={{ height: `${heightPct}%` }}
              />
              <div className="pointer-events-none absolute -top-9 z-10 hidden rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] whitespace-nowrap text-slate-100 shadow-lg group-hover:block">
                {pt.hourLabel}: AQI {pt.usAqi} ({pt.pm25} µg/m³)
              </div>
              {idx % 4 === 0 && (
                <span className="mt-1.5 font-mono text-[9px] text-slate-500">
                  {pt.hourLabel.slice(0, 2)}h
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
