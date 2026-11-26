import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  ThermometerSnowflake,
  Wind,
} from 'lucide-react';
import { getAqiSeverityMeta } from '../services/airQualityService';
import type {
  AirQualitySnapshot,
  GenAIPlan,
  LocationProfile,
} from '../types/airQuality';

interface SmogTelemetryHeroProps {
  location: LocationProfile;
  snapshot: AirQualitySnapshot;
  plan: GenAIPlan;
  loading: boolean;
}

export function SmogTelemetryHero({
  location,
  snapshot,
  plan,
  loading,
}: SmogTelemetryHeroProps) {
  const meta = getAqiSeverityMeta(snapshot.usAqi, snapshot.pm25);

  const pollutants = [
    {
      label: 'PM2.5',
      value: snapshot.pm25,
      unit: 'µg/m³',
      whoLimit: 15,
      note: 'Deep-lung soot',
    },
    {
      label: 'PM10',
      value: snapshot.pm10,
      unit: 'µg/m³',
      whoLimit: 45,
      note: 'Coarse road dust',
    },
    {
      label: 'NO₂',
      value: snapshot.no2,
      unit: 'µg/m³',
      whoLimit: 25,
      note: 'Traffic & gas',
    },
    {
      label: 'O₃',
      value: snapshot.o3,
      unit: 'µg/m³',
      whoLimit: 100,
      note: 'Photochemical',
    },
  ];

  const maxAqi = Math.max(
    180,
    ...snapshot.hourlyForecast.map((h) => h.usAqi)
  );

  return (
    <section
      aria-label="Live Air Quality Telemetry"
      className={`relative overflow-hidden rounded-2xl border border-slate-800/90 bg-gradient-to-br ${meta.gradientClass} via-slate-900/90 to-slate-950 p-5 shadow-2xl sm:p-6`}
    >
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: AQI Ring + Headline Guidance */}
        <div className="flex flex-col justify-between gap-4 lg:col-span-5">
          <div className="flex items-start gap-4">
            <div
              aria-live="polite"
              className="relative flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border bg-slate-950/80 shadow-inner"
              style={{ borderColor: `${meta.ringColor}66` }}
            >
              <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                US AQI
              </span>
              <span
                className="text-3xl font-extrabold tracking-tight"
                style={{ color: meta.ringColor }}
              >
                {loading ? '...' : snapshot.usAqi}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {meta.whoMultiple}× WHO
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  {meta.label}
                </span>
                {snapshot.inversionActive && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-200">
                    <ThermometerSnowflake className="h-3.5 w-3.5" aria-hidden="true" />
                    {snapshot.inversionSeverity} Thermal Inversion
                  </span>
                )}
              </div>

              <h2 className="text-lg leading-snug font-bold text-white sm:text-xl">
                {plan.headlineGuidance}
              </h2>
              <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
                {plan.smogBriefing}
              </p>
            </div>
          </div>

          {/* Pollutant Bars */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {pollutants.map((p) => {
              const ratio = p.value / p.whoLimit;
              const barPct = Math.min(100, Math.round((ratio / 6) * 100));
              const isHigh = ratio > 1.5;
              return (
                <div
                  key={p.label}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/65 p-2.5"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      {p.label}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      WHO {p.whoLimit}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span
                      className={`font-mono text-base font-bold ${
                        isHigh ? 'text-rose-300' : 'text-emerald-300'
                      }`}
                    >
                      {p.value}
                    </span>
                    <span className="text-[10px] text-slate-400">{p.unit}</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${p.label} relative to WHO guideline`}
                    aria-valuenow={Math.min(100, Math.max(10, barPct))}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
                  >
                    <div
                      className={`h-full rounded-full ${
                        isHigh ? 'bg-rose-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.max(10, barPct)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">{p.note}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: 24-Hour Clean Air Window Forecast + Inversion Explanation */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-cyan-300 uppercase">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                24-Hour Dispersion &amp; Clean-Air Window
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Best 3h window for errands &amp; brief ventilation:{' '}
                <span className="font-semibold text-emerald-300">
                  {plan.bestOutdoorWindow.startLabel} –{' '}
                  {plan.bestOutdoorWindow.endLabel}
                </span>{' '}
                (Avg AQI {plan.bestOutdoorWindow.avgAqi})
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-emerald-400/80" />
                Best Window
              </span>
              <span className="flex items-center gap-1">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-amber-400/80" />
                Moderate/USG
              </span>
              <span className="flex items-center gap-1">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-rose-500/80" />
                Peak Smog
              </span>
            </div>
          </div>

          {/* 24-Hour Bar Visualization */}
          <div
            role="img"
            aria-label={`24-hour AQI forecast chart highlighting cleanest window ${plan.bestOutdoorWindow.startLabel} to ${plan.bestOutdoorWindow.endLabel} at average AQI ${plan.bestOutdoorWindow.avgAqi}`}
            className="flex h-32 items-end gap-1 pt-4"
          >
            {snapshot.hourlyForecast.slice(0, 24).map((pt, idx) => {
              const heightPct = Math.max(12, Math.round((pt.usAqi / maxAqi) * 100));
              const isBest =
                pt.hourLabel >= plan.bestOutdoorWindow.startLabel &&
                pt.hourLabel <= plan.bestOutdoorWindow.endLabel;
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
                  <div
                    className={`w-full rounded-t-sm transition-all ${barColor}`}
                    style={{ height: `${heightPct}%` }}
                  />
                  {/* Tooltip */}
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

          {/* Window Guidance + Inversion Note */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-100">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-emerald-300">
                <Wind className="h-3.5 w-3.5" aria-hidden="true" />
                Routine Timing Insight
              </div>
              {plan.bestOutdoorWindow.guidance}
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-100">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Indoor vs. Outdoor Reality
              </div>
              {plan.indoorVsOutdoorRatioNote}
              {location.winterInversionNote ? ` (${location.winterInversionNote})` : ''}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
