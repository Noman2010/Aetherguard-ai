export type SensitivityTag =
  | 'asthma'
  | 'infants'
  | 'seniors'
  | 'outdoor-workers'
  | 'none';

export type HouseholdType =
  | 'young-family'
  | 'elderly-care'
  | 'solo-commuter'
  | 'community-organizer';

export type CommuteMode =
  | 'car-solo'
  | 'public-transit'
  | 'two-wheeler'
  | 'walk-cycle'
  | 'remote-hybrid';

export type HeatingCookingType =
  | 'gas-stove-no-hood'
  | 'electric-induction'
  | 'biomass-coal'
  | 'district-central';

export type PurifierAccess = 'hepa-unit' | 'diy-corsirosenthal' | 'none';

export type VentilationType =
  | 'sealed-ac'
  | 'leaky-windows'
  | 'cross-ventilation';

export interface HouseholdProfile {
  householdType: HouseholdType;
  sensitivities: SensitivityTag[];
  commuteMode: CommuteMode;
  heatingCooking: HeatingCookingType;
  purifierAccess: PurifierAccess;
  homeVentilation: VentilationType;
  householdSize: number;
}

export interface LocationProfile {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  winterInversionNote?: string;
}

export interface HourlyForecastPoint {
  isoTime: string;
  hourLabel: string;
  usAqi: number;
  pm25: number;
  isDaylight: boolean;
}

export interface AirQualitySnapshot {
  usAqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  o3: number;
  co: number;
  temperatureC: number;
  humidityPct: number;
  windSpeedKmh: number;
  inversionActive: boolean;
  inversionSeverity: 'Severe' | 'Moderate' | 'Low';
  timestamp: string;
  source: 'live-api' | 'severe-smog-sim' | 'fallback-cache';
  hourlyForecast: HourlyForecastPoint[];
}

export type ActionCategory =
  | 'routine'
  | 'indoor-hack'
  | 'sustainable-alt'
  | 'community';

export interface ActionImpact {
  personalExposureDropPct: number;
  pm25AvoidedUgPerDay: number;
  co2SavedKgPerWeek: number;
  mechanism: string;
  plainExplanation: string;
}

export interface ActionRecommendation {
  id: string;
  category: ActionCategory;
  title: string;
  summary: string;
  timingWindow: string;
  costLevel: 'Free' | 'Low (₹)' | 'Moderate (₹₹)';
  effort: 'Instant' | '15 mins' | 'Habit shift';
  tailoredReason: string;
  impact: ActionImpact;
}

export interface CleanAirWindow {
  startLabel: string;
  endLabel: string;
  avgAqi: number;
  avgPm25: number;
  guidance: string;
}

export interface PromptArtifact {
  systemPrompt: string;
  contextPayload: string;
  modelLabel: string;
  mode: 'gemini-live' | 'contextual-engine';
  latencyMs: number;
}

export interface GenAIPlan {
  headlineGuidance: string;
  smogBriefing: string;
  bestOutdoorWindow: CleanAirWindow;
  indoorVsOutdoorRatioNote: string;
  communityMultiplierNote: string;
  recommendations: ActionRecommendation[];
  promptArtifact: PromptArtifact;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  impactSummary?: string;
  timestamp: string;
  mode?: 'gemini-live' | 'contextual-engine';
}

export interface AqiSeverityMeta {
  label: string;
  badgeClass: string;
  ringColor: string;
  gradientClass: string;
  textColor: string;
  whoMultiple: number;
}
