import type {
  AirQualitySnapshot,
  ChatMessage,
  GenAIPlan,
  HouseholdProfile,
  LocationProfile,
} from '../types/airQuality';
import {
  buildStructuredPrompt,
  requestGeminiAdvisorAnswer,
  requestGeminiPlan,
} from './geminiClient';
import {
  buildDailyRoutineTimeline,
  buildTailoredRecommendations,
  computeBestOutdoorWindow,
} from './recommendationEngine';

export { buildStructuredPrompt };

function buildBaselineNotes(
  location: LocationProfile,
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile,
  bestStart: string,
  bestEnd: string
) {
  const headlineGuidance =
    snapshot.usAqi >= 200
      ? `Severe Winter Smog Alert in ${location.name}: Stay Indoors, Seal & Filter Now`
      : snapshot.usAqi >= 150
        ? `Unhealthy Smog Episode (${snapshot.usAqi} AQI): Shift Routines to ${bestStart}–${bestEnd}`
        : snapshot.usAqi >= 100
          ? `Moderate-Elevated Winter Haze: Protect Sensitive Lungs & Cut Peak Exhaust`
          : `Favorable Dispersion Today in ${location.name}: Ventilate & Lock In Low-Emission Habits`;

  const smogBriefing = `${location.name} is currently at US AQI ${snapshot.usAqi} with PM2.5 at ${snapshot.pm25} µg/m³ (${(
    snapshot.pm25 / 15
  ).toFixed(1)}× the WHO 24-hour guideline). ${
    snapshot.inversionActive
      ? `A ${snapshot.inversionSeverity.toLowerCase()} thermal inversion (${snapshot.temperatureC}°C, ${snapshot.windSpeedKmh} km/h wind) is trapping vehicle exhaust and residential smoke near ground level.`
      : `Light atmospheric mixing (${snapshot.windSpeedKmh} km/h wind) is helping disperse surface pollutants.`
  }`;

  const indoorVsOutdoorRatioNote =
    profile.purifierAccess === 'none'
      ? `Unfiltered homes during ${location.name}'s winter inversion absorb 60–85% of outdoor PM2.5—meaning indoor air is still ${(
          (snapshot.pm25 * 0.7) /
          15
        ).toFixed(1)}× WHO limits until filtered.`
      : `With active filtration and window sealing, your home can maintain an indoor PM2.5 level 60–75% cleaner than outside (${Math.round(
          snapshot.pm25 * 0.3
        )} µg/m³ vs ${snapshot.pm25} µg/m³).`;

  const communityMultiplierNote = `If 100 families of ${profile.householdSize} in ${location.name} commit to these routines, they collectively prevent ~2.4 tonnes of CO₂e and eliminate hundreds of cold-start exhaust & open-smoke events every winter month.`;

  return {
    headlineGuidance,
    smogBriefing,
    indoorVsOutdoorRatioNote,
    communityMultiplierNote,
  };
}

/**
 * Generates a personalized 4-pillar winter smog plan using Google Gemini 2.5 Flash
 * when an API key is provided, falling back seamlessly to the grounded local engine.
 */
export async function generatePersonalizedPlan(
  location: LocationProfile,
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile,
  geminiApiKey?: string
): Promise<GenAIPlan> {
  const startMs = performance.now();
  const bestWindow = computeBestOutdoorWindow(snapshot);
  const { systemPrompt, contextPayload } = buildStructuredPrompt(
    location,
    snapshot,
    profile
  );
  const timeline = buildDailyRoutineTimeline(snapshot, bestWindow);
  const notes = buildBaselineNotes(
    location,
    snapshot,
    profile,
    bestWindow.startLabel,
    bestWindow.endLabel
  );

  if (geminiApiKey && geminiApiKey.trim().length > 12) {
    try {
      const geminiResult = await requestGeminiPlan(
        systemPrompt,
        contextPayload,
        geminiApiKey
      );
      if (geminiResult) {
        return {
          headlineGuidance: geminiResult.headlineGuidance,
          smogBriefing: geminiResult.smogBriefing ?? notes.smogBriefing,
          bestOutdoorWindow: bestWindow,
          indoorVsOutdoorRatioNote:
            geminiResult.indoorVsOutdoorRatioNote ??
            notes.indoorVsOutdoorRatioNote,
          communityMultiplierNote:
            geminiResult.communityMultiplierNote ??
            notes.communityMultiplierNote,
          dailyRoutineTimeline: timeline,
          recommendations: geminiResult.recommendations,
          promptArtifact: {
            systemPrompt,
            contextPayload,
            modelLabel: 'Gemini 2.5 Flash (Live API)',
            mode: 'gemini-live',
            latencyMs: Math.round(performance.now() - startMs),
          },
        };
      }
    } catch {
      // Fall through cleanly to grounded contextual engine
    }
  }

  return {
    ...notes,
    bestOutdoorWindow: bestWindow,
    dailyRoutineTimeline: timeline,
    recommendations: buildTailoredRecommendations(
      location,
      snapshot,
      profile,
      bestWindow
    ),
    promptArtifact: {
      systemPrompt,
      contextPayload,
      modelLabel: 'AetherGuard Grounded Synthesis Engine (Zero-Key Demo)',
      mode: 'contextual-engine',
      latencyMs: Math.max(12, Math.round(performance.now() - startMs)),
    },
  };
}

function buildFallbackAdvisorReply(
  question: string,
  location: LocationProfile,
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile,
  plan: GenAIPlan
): { content: string; impactSummary: string } {
  const q = question.toLowerCase();

  if (q.includes('window') || q.includes('ventilat') || q.includes('open')) {
    return {
      content: `In ${location.name} right now (AQI ${snapshot.usAqi}, PM2.5 ${snapshot.pm25} µg/m³), keep windows shut during morning and night inversion hours. Open cross-ventilation windows for just 10–15 minutes inside today's cleanest mixing window (${plan.bestOutdoorWindow.startLabel}–${plan.bestOutdoorWindow.endLabel}, avg AQI ${plan.bestOutdoorWindow.avgAqi}) to flush indoor CO₂, then seal and run filtration.`,
      impactSummary:
        'Prevents ~45% indoor PM2.5 surge while avoiding stuffy CO₂ buildup (>1,200 ppm).',
    };
  }

  if (
    q.includes('school') ||
    q.includes('kid') ||
    q.includes('child') ||
    q.includes('walk') ||
    q.includes('run') ||
    q.includes('exercise')
  ) {
    return {
      content:
        snapshot.usAqi > 150
          ? `At AQI ${snapshot.usAqi} in ${location.name}, skip outdoor sports and strenuous walks—deep breathing multiplies particle deposition in children's lungs by 3–5×. Use a fit-tested KF94/N95 for essential transit, move PE/play indoors near a filtered zone, and ask the school to enforce an idle-free pickup gate.`
          : `AQI is ${snapshot.usAqi} now, dipping to ${plan.bestOutdoorWindow.avgAqi} between ${plan.bestOutdoorWindow.startLabel} and ${plan.bestOutdoorWindow.endLabel}. Schedule outdoor play or walking errands in that afternoon window rather than 07:30–09:30 rush hour.`,
      impactSummary:
        snapshot.usAqi > 150
          ? 'Reduces pediatric fine-particle lung dose by 65–80% on peak smog days.'
          : 'Cuts commute/play PM2.5 exposure by ~30% simply via time-shifting.',
    };
  }

  if (
    q.includes('corsi') ||
    q.includes('diy') ||
    q.includes('filter') ||
    q.includes('purifier') ||
    q.includes('cheap')
  ) {
    return {
      content: `To build a Corsi-Rosenthal clean-air cube (~₹2,800–₹3,800): tape 4 square MERV-13 filters (20"×20"×1") with airflow arrows pointing INWARD, add a cardboard bottom, and tape a standard box/exhaust fan on top blowing UP (mask corners of the fan face with a cardboard shroud to stop backflow). Place it in the main bedroom on low/medium.`,
      impactSummary: `Delivers ~450 CFM clean air—cutting bedroom PM2.5 from ~${Math.round(
        snapshot.pm25 * 0.7
      )} µg/m³ down toward 12–18 µg/m³ in 45 minutes.`,
    };
  }

  if (
    q.includes('community') ||
    q.includes('neighbor') ||
    q.includes('rwa') ||
    q.includes('hoa') ||
    q.includes('apartment') ||
    q.includes('ward')
  ) {
    return {
      content: `Three high-leverage RWA/community moves for ${location.name} this winter: (1) Distribute a 1-page "Clean Air Window" WhatsApp/SMS alert anchored to ${plan.bestOutdoorWindow.startLabel}–${plan.bestOutdoorWindow.endLabel}; (2) Host a shared DIY MERV-13 build workshop for elderly flats; (3) Enforce zero leaf/waste burning and zero delivery-van idling inside society gates.`,
      impactSummary:
        'Each 25-household cluster eliminates ~35 kg CO₂/week and prevents localized 400+ AQI micro-plumes.',
    };
  }

  return {
    content: `Based on ${location.name}'s current ${snapshot.usAqi} AQI (${snapshot.pm25} µg/m³ PM2.5) and your ${profile.householdType.replace(
      '-',
      ' '
    )} profile: prioritize sealing your primary sleeping room, shifting errands to ${plan.bestOutdoorWindow.startLabel}–${plan.bestOutdoorWindow.endLabel}, and replacing any unvented combustion or solo cold-start driving. Check the Impact Simulator to see exact µg/day, CO₂, and ₹/month savings.`,
    impactSummary:
      'Combining 3 habits cuts personal daily PM2.5 inhalation by 55–72% while lowering neighborhood emissions.',
  };
}

/**
 * Answers follow-up family or community air-quality questions grounded in the
 * active city's telemetry, cleanest outdoor window, and household profile.
 */
export async function askAetherGuardAdvisor(
  question: string,
  location: LocationProfile,
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile,
  plan: GenAIPlan,
  geminiApiKey?: string
): Promise<ChatMessage> {
  const timestamp = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (geminiApiKey && geminiApiKey.trim().length > 12) {
    try {
      const sys = `You are AetherGuard AI advising a family in ${location.name} (${snapshot.usAqi} US AQI, ${snapshot.pm25} µg/m³ PM2.5, ${snapshot.inversionSeverity} inversion). Household: ${JSON.stringify(
        profile
      )}. Best outdoor window: ${plan.bestOutdoorWindow.startLabel}-${
        plan.bestOutdoorWindow.endLabel
      } (AQI ${plan.bestOutdoorWindow.avgAqi}). Express any costs in Indian Rupees (INR / ₹). Answer concisely (max 140 words) with actionable steps AND a concrete direct impact explanation.`;

      const answer = await requestGeminiAdvisorAnswer(sys, question, geminiApiKey);
      if (answer) {
        return {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: answer,
          impactSummary: `Grounded in live ${location.name} telemetry (AQI ${snapshot.usAqi})`,
          timestamp,
          mode: 'gemini-live',
        };
      }
    } catch {
      // Fall through cleanly to contextual advisor
    }
  }

  const fallback = buildFallbackAdvisorReply(
    question,
    location,
    snapshot,
    profile,
    plan
  );

  return {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    ...fallback,
    timestamp,
    mode: 'contextual-engine',
  };
}
