import type {
  ActionRecommendation,
  AirQualitySnapshot,
  HouseholdProfile,
  LocationProfile,
} from '../types/airQuality';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const VALID_CATEGORIES = new Set([
  'routine',
  'indoor-hack',
  'sustainable-alt',
  'community',
]);
const VALID_COSTS = new Set(['Free', 'Low (₹)', 'Moderate (₹₹)']);
const VALID_EFFORTS = new Set(['Instant', '15 mins', 'Habit shift']);

export interface GeminiPlanPayload {
  headlineGuidance: string;
  smogBriefing?: string;
  indoorVsOutdoorRatioNote?: string;
  communityMultiplierNote?: string;
  recommendations: ActionRecommendation[];
}

/**
 * Builds the grounded system prompt and live JSON telemetry context payload
 * used by both Gemini 2.5 Flash and the deterministic fallback engine.
 */
export function buildStructuredPrompt(
  location: LocationProfile,
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile
): { systemPrompt: string; contextPayload: string } {
  const systemPrompt = [
    'ROLE: You are AetherGuard AI, an environmental health scientist and urban sustainability coach.',
    'OBJECTIVE: Help families and neighborhood communities survive severe winter smog while cutting household emissions.',
    'RULES:',
    '1. Ground every recommendation in the provided live telemetry (AQI, PM2.5, NO2, wind speed, thermal inversion state) and household constraints.',
    '2. Provide 4 pillars: Low-Emission Daily Routines, Indoor Air Quality Hacks, Sustainable Alternatives, and Community Multiplier Actions.',
    '3. Quantify the DIRECT IMPACT of each action (personal PM2.5 exposure reduction %, daily inhaled µg avoided, weekly CO2e saved, monthly INR ₹ saved) and explain the physical/health mechanism clearly in plain language.',
    '4. Prioritize zero-cost or low-cost hacks in Indian Rupees (INR / ₹) when purifierAccess is "none" or "diy-corsirosenthal", and prioritize sensitive groups (asthma, infants, seniors) if present.',
  ].join('\n');

  const contextPayload = JSON.stringify(
    {
      city: `${location.name}, ${location.country}`,
      telemetry: {
        usAqi: snapshot.usAqi,
        pm25_ug_m3: snapshot.pm25,
        no2_ug_m3: snapshot.no2,
        tempC: snapshot.temperatureC,
        windKmh: snapshot.windSpeedKmh,
        thermalInversion: snapshot.inversionSeverity,
      },
      household: profile,
    },
    null,
    2
  );

  return { systemPrompt, contextPayload };
}

/**
 * Runtime type guard validating recommendations parsed from LLM JSON output.
 */
export function isValidRecommendation(
  item: unknown
): item is ActionRecommendation {
  if (!item || typeof item !== 'object') return false;
  const r = item as Record<string, unknown>;
  const impact = r.impact as Record<string, unknown> | undefined;
  return (
    typeof r.id === 'string' &&
    typeof r.title === 'string' &&
    typeof r.summary === 'string' &&
    typeof r.timingWindow === 'string' &&
    typeof r.tailoredReason === 'string' &&
    VALID_CATEGORIES.has(String(r.category)) &&
    VALID_COSTS.has(String(r.costLevel)) &&
    VALID_EFFORTS.has(String(r.effort)) &&
    Boolean(impact) &&
    typeof impact?.personalExposureDropPct === 'number' &&
    typeof impact?.pm25AvoidedUgPerDay === 'number' &&
    typeof impact?.co2SavedKgPerWeek === 'number' &&
    typeof impact?.mechanism === 'string' &&
    typeof impact?.plainExplanation === 'string'
  );
}

/**
 * Requests a structured JSON action plan from Google Gemini 2.5 Flash.
 * Returns null if the request fails or produces invalid schema data.
 */
export async function requestGeminiPlan(
  systemPrompt: string,
  contextPayload: string,
  apiKey: string
): Promise<GeminiPlanPayload | null> {
  const promptText = `${systemPrompt}\n\nLIVE HOUSEHOLD & TELEMETRY CONTEXT:\n${contextPayload}\n\nReturn strictly valid JSON with keys: "headlineGuidance" (string), "smogBriefing" (string), "indoorVsOutdoorRatioNote" (string), "communityMultiplierNote" (string), and "recommendations" (array of 6 objects matching: id, category one of ["routine","indoor-hack","sustainable-alt","community"], title, summary, timingWindow, costLevel one of ["Free","Low (₹)","Moderate (₹₹)"], effort one of ["Instant","15 mins","Habit shift"], tailoredReason, impact: { personalExposureDropPct (number 5-75), pm25AvoidedUgPerDay (number), co2SavedKgPerWeek (number), monthlySavingsInr (number), mechanism (string), plainExplanation (string) }). Express all monetary figures in Indian Rupees (INR / ₹).`;

  const res = await fetch(
    `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey.trim())}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) return null;
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) return null;

  const parsed = JSON.parse(rawText) as Partial<GeminiPlanPayload>;
  const validRecs = Array.isArray(parsed.recommendations)
    ? parsed.recommendations.filter(isValidRecommendation)
    : [];

  if (typeof parsed.headlineGuidance !== 'string' || validRecs.length < 4) {
    return null;
  }

  return {
    headlineGuidance: parsed.headlineGuidance,
    smogBriefing:
      typeof parsed.smogBriefing === 'string' ? parsed.smogBriefing : undefined,
    indoorVsOutdoorRatioNote:
      typeof parsed.indoorVsOutdoorRatioNote === 'string'
        ? parsed.indoorVsOutdoorRatioNote
        : undefined,
    communityMultiplierNote:
      typeof parsed.communityMultiplierNote === 'string'
        ? parsed.communityMultiplierNote
        : undefined,
    recommendations: validRecs,
  };
}

/**
 * Requests a concise grounded text answer from Google Gemini 2.5 Flash.
 */
export async function requestGeminiAdvisorAnswer(
  systemContext: string,
  question: string,
  apiKey: string
): Promise<string | null> {
  const res = await fetch(
    `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey.trim())}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemContext}\n\nUSER QUESTION: ${question}` }],
          },
        ],
        generationConfig: { temperature: 0.45 },
      }),
    }
  );

  if (!res.ok) return null;
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}
