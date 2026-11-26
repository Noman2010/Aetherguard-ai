import {
  CloudFog,
  Code2,
  Flame,
  MapPin,
  Navigation,
  Search,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { PRESET_CITIES, searchCities } from '../services/airQualityService';
import type { AirQualitySnapshot, LocationProfile } from '../types/airQuality';

interface HeaderBarProps {
  location: LocationProfile;
  snapshot: AirQualitySnapshot | null;
  simulateSevereSmog: boolean;
  hasGeminiKey: boolean;
  onSelectLocation: (loc: LocationProfile) => void;
  onToggleSimulateSmog: () => void;
  onOpenPromptInspector: () => void;
  onUseMyLocation: () => void;
  locatingUser: boolean;
}

export function HeaderBar({
  location,
  snapshot,
  simulateSevereSmog,
  hasGeminiKey,
  onSelectLocation,
  onToggleSimulateSmog,
  onOpenPromptInspector,
  onUseMyLocation,
  locatingUser,
}: HeaderBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationProfile[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  async function handleSearchChange(value: string) {
    setQuery(value);
    setDropdownOpen(true);
    const matches = await searchCities(value);
    setResults(matches);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3.5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Brand + Status */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 text-slate-950 shadow-lg shadow-cyan-500/20">
              <CloudFog className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                  AetherGuard AI
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {hasGeminiKey ? 'Gemini Live' : 'GenAI Engine'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Winter Smog Survival &amp; Low-Emission Family Assistant
              </p>
            </div>
          </div>
        </div>

        {/* City Search + Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64 sm:flex-initial">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              role="combobox"
              aria-expanded={dropdownOpen}
              aria-controls="city-search-listbox"
              aria-autocomplete="list"
              value={query}
              onFocus={() => {
                setDropdownOpen(true);
                if (results.length === 0) setResults(PRESET_CITIES);
              }}
              onBlur={() => {
                setTimeout(() => setDropdownOpen(false), 180);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setDropdownOpen(false);
              }}
              onChange={(e) => void handleSearchChange(e.target.value)}
              placeholder={`Search city (${location.name})...`}
              aria-label="Search urban location"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 py-2 pr-3 pl-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
            {dropdownOpen && results.length > 0 && (
              <div
                id="city-search-listbox"
                role="listbox"
                aria-label="City search results"
                className="absolute right-0 left-0 z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-slate-700/90 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl"
              >
                <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  {query.trim() ? 'Matching Cities' : 'Winter Smog Watch Cities'}
                </div>
                {results.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    role="option"
                    aria-selected={city.id === location.id}
                    onMouseDown={() => {
                      onSelectLocation(city);
                      setQuery('');
                      setDropdownOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                      {city.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {city.region ? `${city.region}, ` : ''}
                      {city.country}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onUseMyLocation}
            disabled={locatingUser}
            aria-label="Detect my current city using browser GPS"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-500/50 hover:text-cyan-200 disabled:opacity-50"
          >
            <Navigation className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            {locatingUser ? 'Locating...' : 'My Location'}
          </button>

          <button
            type="button"
            aria-pressed={simulateSevereSmog}
            onClick={onToggleSimulateSmog}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              simulateSevereSmog
                ? 'border-rose-400/60 bg-rose-500/20 text-rose-200 shadow-sm shadow-rose-500/20'
                : 'border-slate-700/80 bg-slate-900/90 text-slate-300 hover:border-amber-400/50 hover:text-amber-200'
            }`}
            title="Test how AetherGuard adapts during an extreme winter inversion crisis"
          >
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            {simulateSevereSmog ? 'Severe Smog Sim: ON' : 'Simulate Winter Smog'}
          </button>

          <button
            type="button"
            onClick={onOpenPromptInspector}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-3 py-2 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/25"
          >
            <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
            Prompt &amp; Gemini API
          </button>
        </div>
      </div>

      {/* Live Source Strip */}
      {snapshot && (
        <div className="border-t border-slate-800/60 bg-slate-900/40 px-4 py-1.5 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  snapshot.source === 'live-api'
                    ? 'animate-pulse bg-emerald-400'
                    : snapshot.source === 'severe-smog-sim'
                      ? 'animate-pulse bg-rose-400'
                      : 'bg-amber-400'
                }`}
              />
              <span>
                {snapshot.source === 'live-api'
                  ? 'Live Open-Meteo Atmospheric & Air Quality Telemetry'
                  : snapshot.source === 'severe-smog-sim'
                    ? 'Severe Winter Inversion Crisis Simulation Active'
                    : 'Cached Urban Smog Baseline (Offline Fallback)'}
              </span>
            </div>
            <div className="font-mono text-slate-400">
              {location.name}, {location.country} • {snapshot.temperatureC}°C •{' '}
              {snapshot.windSpeedKmh} km/h wind • {snapshot.humidityPct}% RH
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
