import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionPlanBoard } from './components/ActionPlanBoard';
import { GenAIChatDrawer } from './components/GenAIChatDrawer';
import { HeaderBar } from './components/HeaderBar';
import { ImpactSimulatorPanel } from './components/ImpactSimulatorPanel';
import { LifestyleConfigurator } from './components/LifestyleConfigurator';
import { PromptInspectorModal } from './components/PromptInspectorModal';
import { SmogTelemetryHero } from './components/SmogTelemetryHero';
import {
  PRESET_CITIES,
  buildSimulatedSevereSmog,
  fetchAirQualityForLocation,
} from './services/airQualityService';
import { generatePersonalizedPlan } from './services/genAiService';
import type {
  AirQualitySnapshot,
  GenAIPlan,
  HouseholdProfile,
  LocationProfile,
} from './types/airQuality';

const DEFAULT_PROFILE: HouseholdProfile = {
  householdType: 'young-family',
  sensitivities: ['asthma', 'infants'],
  commuteMode: 'car-solo',
  heatingCooking: 'gas-stove-no-hood',
  purifierAccess: 'none',
  homeVentilation: 'leaky-windows',
  householdSize: 4,
};

const STORAGE_KEY = 'aetherguard_gemini_key';

function getInitialGeminiKey(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // Ignore storage access errors in restricted environments
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  return typeof envKey === 'string' ? envKey.trim() : '';
}

export function App() {
  const [location, setLocation] = useState<LocationProfile>(PRESET_CITIES[0]);
  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_PROFILE);
  const profileRef = useRef<HouseholdProfile>(DEFAULT_PROFILE);
  const [simulateSevereSmog, setSimulateSevereSmog] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(getInitialGeminiKey);

  const [snapshot, setSnapshot] = useState<AirQualitySnapshot>(() =>
    buildSimulatedSevereSmog(PRESET_CITIES[0])
  );
  const [plan, setPlan] = useState<GenAIPlan | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [regeneratingPlan, setRegeneratingPlan] = useState(false);
  const [adoptedIds, setAdoptedIds] = useState<string[]>([
    'routine-commute-shift',
    'indoor-diy-cr-box',
  ]);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  const syncAdoptedIds = useCallback((nextPlan: GenAIPlan) => {
    setAdoptedIds((prev) => {
      const valid = prev.filter((id) =>
        nextPlan.recommendations.some((r) => r.id === id)
      );
      return valid.length > 0
        ? valid
        : nextPlan.recommendations.slice(0, 2).map((r) => r.id);
    });
  }, []);

  const refreshTelemetryAndPlan = useCallback(
    async (
      targetLoc: LocationProfile,
      targetProfile: HouseholdProfile,
      simMode: boolean,
      apiKey: string
    ) => {
      setLoadingTelemetry(true);
      const aq = await fetchAirQualityForLocation(targetLoc, simMode);
      setSnapshot(aq);
      setLoadingTelemetry(false);

      setRegeneratingPlan(true);
      const nextPlan = await generatePersonalizedPlan(
        targetLoc,
        aq,
        targetProfile,
        apiKey
      );
      setPlan(nextPlan);
      syncAdoptedIds(nextPlan);
      setRegeneratingPlan(false);
    },
    [syncAdoptedIds]
  );

  // Fetch telemetry when location, smog simulation, or Gemini key changes
  useEffect(() => {
    void refreshTelemetryAndPlan(
      location,
      profileRef.current,
      simulateSevereSmog,
      geminiApiKey
    );
  }, [location, simulateSevereSmog, geminiApiKey, refreshTelemetryAndPlan]);

  // Re-synthesize plan when household profile changes without re-fetching weather
  const handleProfileChange = useCallback(
    (nextProfile: HouseholdProfile) => {
      profileRef.current = nextProfile;
      setProfile(nextProfile);
      setRegeneratingPlan(true);
      void generatePersonalizedPlan(
        location,
        snapshot,
        nextProfile,
        geminiApiKey
      ).then((nextPlan) => {
        setPlan(nextPlan);
        syncAdoptedIds(nextPlan);
        setRegeneratingPlan(false);
      });
    },
    [location, snapshot, geminiApiKey, syncAdoptedIds]
  );

  function handleToggleAdopt(id: string) {
    setAdoptedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSaveApiKey(nextKey: string) {
    const cleaned = nextKey.trim();
    setGeminiApiKey(cleaned);
    try {
      if (cleaned) {
        localStorage.setItem(STORAGE_KEY, cleaned);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage issues
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setLocationNotice('Geolocation is not supported by your browser.');
      return;
    }
    setLocationNotice(null);
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        setLocation({
          id: `gps-${Date.now()}`,
          name: 'Current Location',
          region: `${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`,
          country: 'GPS',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timezone: 'auto',
        });
      },
      () => {
        setLocatingUser(false);
        setLocationNotice(
          'Location permission declined. Search for your city above instead.'
        );
      },
      { timeout: 6000 }
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-cyan-400 focus:px-3 focus:py-2 focus:text-xs focus:font-bold focus:text-slate-950"
      >
        Skip to main content
      </a>

      <HeaderBar
        location={location}
        snapshot={snapshot}
        simulateSevereSmog={simulateSevereSmog}
        hasGeminiKey={Boolean(geminiApiKey)}
        onSelectLocation={(loc) => {
          setLocationNotice(null);
          setLocation(loc);
        }}
        onToggleSimulateSmog={() => setSimulateSevereSmog((v) => !v)}
        onOpenPromptInspector={() => setInspectorOpen(true)}
        onUseMyLocation={handleUseMyLocation}
        locatingUser={locatingUser}
      />

      <main id="main-content" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {locationNotice && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-200"
          >
            {locationNotice}
          </div>
        )}

        {plan && (
          <>
            <SmogTelemetryHero
              location={location}
              snapshot={snapshot}
              plan={plan}
              loading={loadingTelemetry}
            />

            <ImpactSimulatorPanel
              location={location}
              snapshot={snapshot}
              profile={profile}
              plan={plan}
              adoptedIds={adoptedIds}
            />

            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-4">
                <LifestyleConfigurator
                  profile={profile}
                  onChange={handleProfileChange}
                />
                <GenAIChatDrawer
                  location={location}
                  snapshot={snapshot}
                  profile={profile}
                  plan={plan}
                  geminiApiKey={geminiApiKey}
                />
              </div>

              <div className="lg:col-span-8">
                <ActionPlanBoard
                  plan={plan}
                  adoptedIds={adoptedIds}
                  onToggleAdopt={handleToggleAdopt}
                  onRegenerate={() =>
                    void refreshTelemetryAndPlan(
                      location,
                      profile,
                      simulateSevereSmog,
                      geminiApiKey
                    )
                  }
                  regenerating={regeneratingPlan}
                />
              </div>
            </div>

            <PromptInspectorModal
              open={inspectorOpen}
              artifact={plan.promptArtifact}
              geminiApiKey={geminiApiKey}
              onSaveApiKey={handleSaveApiKey}
              onClose={() => setInspectorOpen(false)}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
