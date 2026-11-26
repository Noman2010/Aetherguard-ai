import { useCallback, useEffect, useState } from 'react';
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

export function App() {
  const [location, setLocation] = useState<LocationProfile>(PRESET_CITIES[0]);
  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_PROFILE);
  const [simulateSevereSmog, setSimulateSevereSmog] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

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
      setAdoptedIds((prev) => {
        const valid = prev.filter((id) =>
          nextPlan.recommendations.some((r) => r.id === id)
        );
        return valid.length > 0
          ? valid
          : nextPlan.recommendations.slice(0, 2).map((r) => r.id);
      });
      setRegeneratingPlan(false);
    },
    []
  );

  // Fetch telemetry when location or severe simulation changes
  useEffect(() => {
    void refreshTelemetryAndPlan(
      location,
      profile,
      simulateSevereSmog,
      geminiApiKey
    );
  }, [location, simulateSevereSmog, geminiApiKey, refreshTelemetryAndPlan]);

  // Re-synthesize plan when household profile changes (without refetching weather)
  const handleProfileChange = useCallback(
    (nextProfile: HouseholdProfile) => {
      setProfile(nextProfile);
      setRegeneratingPlan(true);
      void generatePersonalizedPlan(
        location,
        snapshot,
        nextProfile,
        geminiApiKey
      ).then((nextPlan) => {
        setPlan(nextPlan);
        setAdoptedIds((prev) => {
          const valid = prev.filter((id) =>
            nextPlan.recommendations.some((r) => r.id === id)
          );
          return valid.length > 0
            ? valid
            : nextPlan.recommendations.slice(0, 2).map((r) => r.id);
        });
        setRegeneratingPlan(false);
      });
    },
    [location, snapshot, geminiApiKey]
  );

  function handleToggleAdopt(id: string) {
    setAdoptedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSaveApiKey(nextKey: string) {
    setGeminiApiKey(nextKey);
    try {
      if (nextKey) {
        localStorage.setItem(STORAGE_KEY, nextKey);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage issues
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) return;
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
      },
      { timeout: 6000 }
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <HeaderBar
        location={location}
        snapshot={snapshot}
        simulateSevereSmog={simulateSevereSmog}
        hasGeminiKey={Boolean(geminiApiKey)}
        onSelectLocation={setLocation}
        onToggleSimulateSmog={() => setSimulateSevereSmog((v) => !v)}
        onOpenPromptInspector={() => setInspectorOpen(true)}
        onUseMyLocation={handleUseMyLocation}
        locatingUser={locatingUser}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
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
