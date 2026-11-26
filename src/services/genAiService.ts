import type {
  ActionRecommendation,
  AirQualitySnapshot,
  ChatMessage,
  CleanAirWindow,
  GenAIPlan,
  HouseholdProfile,
  LocationProfile,
  RoutineTimelineSlot,
} from '../types/airQuality';

const VALID_CATEGORIES = new Set([
  'routine',
  'indoor-hack',
  'sustainable-alt',
  'community',
]);
const VALID_COSTS = new Set(['Free', 'Low (₹)', 'Moderate (₹₹)']);
const VALID_EFFORTS = new Set(['Instant', '15 mins', 'Habit shift']);

/**
 * Finds the cleanest contiguous 3-hour atmospheric mixing window in the
 * 24-hour hourly forecast for errands and controlled cross-ventilation.
 */
function computeBestOutdoorWindow(snapshot: AirQualitySnapshot): CleanAirWindow {
  const forecast = snapshot.hourlyForecast;
  if (forecast.length < 3) {
    return {
      startLabel: '13:00',
      endLabel: '16:00',
      avgAqi: Math.round(snapshot.usAqi * 0.72),
      avgPm25: Number((snapshot.pm25 * 0.72).toFixed(1)),
      guidance:
        'Mid-afternoon solar warming lifts the thermal inversion lid briefly, creating the lowest ground-level PM2.5 window.',
    };
  }

  let bestStartIdx = 0;
  let lowestAvgAqi = Infinity;

  for (let i = 0; i <= forecast.length - 3; i++) {
    const windowSlice = forecast.slice(i, i + 3);
    const avg =
      windowSlice.reduce((sum, pt) => sum + pt.usAqi, 0) / windowSlice.length;
    if (avg < lowestAvgAqi) {
      lowestAvgAqi = avg;
      bestStartIdx = i;
    }
  }

  const bestSlice = forecast.slice(bestStartIdx, bestStartIdx + 3);
  const avgAqi = Math.round(
    bestSlice.reduce((sum, pt) => sum + pt.usAqi, 0) / bestSlice.length
  );
  const avgPm25 = Number(
    (
      bestSlice.reduce((sum, pt) => sum + pt.pm25, 0) / bestSlice.length
    ).toFixed(1)
  );

  const startLabel = bestSlice[0].hourLabel;
  const endLabel = bestSlice[bestSlice.length - 1].hourLabel;

  const guidance =
    avgAqi > 150
      ? `Even the cleanest 3-hour window (${startLabel}–${endLabel}) remains unhealthy at AQI ${avgAqi}. Use this slot strictly for essential errands with N95/KF94 masks and brief 5-minute HEPA-assisted ventilation.`
      : avgAqi > 100
        ? `AQI dips to ${avgAqi} (${avgPm25} µg/m³ PM2.5) between ${startLabel} and ${endLabel}. Schedule outdoor school commutes, grocery runs, and rapid cross-ventilation inside this window.`
        : `Atmospheric mixing opens a clean window (${startLabel}–${endLabel}) at AQI ${avgAqi}. Ideal time to flush indoor CO₂ and schedule outdoor exercise.`;

  return { startLabel, endLabel, avgAqi, avgPm25, guidance };
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

function buildRoutineRecommendations(
  location: LocationProfile,
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile,
  bestWindow: CleanAirWindow,
  sensitiveText: string
): ActionRecommendation[] {
  const isSevere = snapshot.usAqi >= 150;
  const isMotorized =
    profile.commuteMode === 'car-solo' ||
    profile.commuteMode === 'two-wheeler';

  const primaryRoutine: ActionRecommendation = isMotorized
    ? {
        id: 'routine-commute-shift',
        category: 'routine',
        title: `Shift Trips to ${bestWindow.startLabel}–${bestWindow.endLabel} & Carpool/Metro`,
        summary:
          'Avoid cold-start driving during peak morning inversion (07:00–10:00) and replace solo motorized trips with metro/bus or RWA carpooling.',
        timingWindow: `${bestWindow.startLabel} – ${bestWindow.endLabel}`,
        costLevel: 'Free',
        effort: 'Habit shift',
        tailoredReason: `Tailored for your ${profile.commuteMode.replace('-', ' ')} commute in ${location.name} (${snapshot.windSpeedKmh} km/h wind traps tailpipe exhaust).`,
        impact: {
          personalExposureDropPct: isSevere ? 32 : 24,
          pm25AvoidedUgPerDay: Math.round(snapshot.pm25 * 1.45),
          co2SavedKgPerWeek: profile.commuteMode === 'car-solo' ? 24.5 : 8.2,
          monthlySavingsInr: profile.commuteMode === 'car-solo' ? 3200 : 950,
          mechanism:
            'Catalytic converters run cold for the first 3–5 km in winter, emitting 4× more NO₂ and ultrafine soot; shifting outside peak inversion cuts both inhaled exhaust and street-canyon emissions.',
          plainExplanation: `Skipping morning cold-start drives saves ${
            profile.commuteMode === 'car-solo' ? '24.5 kg' : '8.2 kg'
          } CO₂/week (and ~₹${
            profile.commuteMode === 'car-solo' ? '3,200' : '950'
          }/month in fuel) while cutting roadside particle dose by ~${
            isSevere ? 32 : 24
          }%.`,
        },
      }
    : {
        id: 'routine-clean-window-errands',
        category: 'routine',
        title: `Consolidate Errands into the ${bestWindow.startLabel}–${bestWindow.endLabel} Mixing Window`,
        summary:
          'Bundle school drop-offs, market walks, and outdoor chores into the afternoon boundary-layer lift while keeping mornings indoors.',
        timingWindow: `${bestWindow.startLabel} – ${bestWindow.endLabel}`,
        costLevel: 'Free',
        effort: 'Habit shift',
        tailoredReason: `Designed around ${sensitiveText} and ${location.name}'s diurnal PM2.5 dip (AQI drops toward ${bestWindow.avgAqi}).`,
        impact: {
          personalExposureDropPct: 29,
          pm25AvoidedUgPerDay: Math.round(snapshot.pm25 * 1.3),
          co2SavedKgPerWeek: 6.4,
          monthlySavingsInr: 600,
          mechanism:
            'Daytime solar heating raises the atmospheric mixing height by 3–5×, diluting trapped ground-level PM2.5 compared to stagnant dawn hours.',
          plainExplanation: `Moving a 45-minute outdoor errand from 08:00 to ${bestWindow.startLabel} prevents ~${Math.round(
            snapshot.pm25 * 1.3
          )} µg of PM2.5 from reaching deep lung tissue daily.`,
        },
      };

  const maskRoutine: ActionRecommendation = {
    id: 'routine-mask-recirculate',
    category: 'routine',
    title:
      snapshot.usAqi >= 150
        ? 'Fit-Tested N95/KF94 Protocol + Recirculate Mode'
        : 'Smart Exposure Guard on High-Traffic Corridors',
    summary:
      'Switch vehicle/cab AC to internal recirculation on arterial roads and wear a snug N95/KF94 outdoors whenever PM2.5 exceeds 35 µg/m³.',
    timingWindow: 'Morning & Evening Rush',
    costLevel: 'Low (₹)',
    effort: 'Instant',
    tailoredReason: `At ${snapshot.pm25} µg/m³ PM2.5 (${(
      snapshot.pm25 / 15
    ).toFixed(1)}× WHO limit), surgical/cloth masks leak >60% of fine soot.`,
    impact: {
      personalExposureDropPct: 68,
      pm25AvoidedUgPerDay: Math.round(snapshot.pm25 * 2.1),
      co2SavedKgPerWeek: 1.5,
      monthlySavingsInr: 0,
      mechanism:
        'Electrostatic melt-blown N95 media captures >95% of 0.3 µm combustion aerosols, while cabin recirculation lowers in-vehicle PM2.5 by up to 75%.',
      plainExplanation:
        'Using cabin recirculation plus a well-sealed N95 cuts inhaled soot on your commute by nearly 70% immediately.',
    },
  };

  return [primaryRoutine, maskRoutine];
}

function buildIndoorHackRecommendations(
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile,
  sensitiveText: string
): ActionRecommendation[] {
  const purifierHack: ActionRecommendation =
    profile.purifierAccess === 'none'
      ? {
          id: 'indoor-diy-cr-box',
          category: 'indoor-hack',
          title: 'Build a ₹3,200 DIY Corsi-Rosenthal Clean-Air Cube',
          summary:
            'Tape four MERV-13 / HEPA-grade furnace filters into a cube with a standard box/exhaust fan (plus a cardboard shroud) to create a high-CADR bedroom purifier.',
          timingWindow: 'Run Continuous (Low Speed at Night)',
          costLevel: 'Low (₹)',
          effort: '15 mins',
          tailoredReason: `Essential because you currently have no HEPA purifier during ${snapshot.inversionSeverity.toLowerCase()} smog (${sensitiveText}).`,
          impact: {
            personalExposureDropPct: 62,
            pm25AvoidedUgPerDay: Math.round(snapshot.pm25 * 3.4),
            co2SavedKgPerWeek: 2.1,
            monthlySavingsInr: 1800,
            mechanism:
              'Delivers 400–600 CFM Clean Air Delivery Rate (CADR) using ~55W, outperforming many ₹25,000 commercial purifiers at ~1/7th the cost and zero proprietary filter waste.',
            plainExplanation:
              'Drops indoor bedroom PM2.5 by 60–75% within 45 minutes so lungs recover overnight instead of inhaling smog for 8 hours.',
          },
        }
      : {
          id: 'indoor-clean-room-zone',
          category: 'indoor-hack',
          title: 'Create a Positive-Pressure "Clean Sleep Sanctuary"',
          summary:
            'Concentrate your purifier in the main sleeping room, seal door gaps with a rolled damp towel or weatherstripping, and keep its door closed during peak smog.',
          timingWindow: '20:00 – 09:00',
          costLevel: 'Free',
          effort: 'Instant',
          tailoredReason: `Maximizes your existing ${
            profile.purifierAccess === 'hepa-unit'
              ? 'HEPA purifier'
              : 'DIY filter box'
          } by shrinking the air volume it has to scrub.`,
          impact: {
            personalExposureDropPct: 54,
            pm25AvoidedUgPerDay: Math.round(snapshot.pm25 * 2.8),
            co2SavedKgPerWeek: 3.2,
            monthlySavingsInr: 450,
            mechanism:
              'Closing off one bedroom cuts air volume by ~70% and doubles Air Changes per Hour (ACH) without increasing fan wattage.',
            plainExplanation:
              'Doubles filtration speed in the room where your family spends 8+ hours sleeping, saving electricity and filter lifespan.',
          },
        };

  const hasCombustionCooking =
    profile.heatingCooking === 'gas-stove-no-hood' ||
    profile.heatingCooking === 'biomass-coal';

  const indoorSourceHack: ActionRecommendation = hasCombustionCooking
    ? {
        id: 'indoor-cooking-spike-hack',
        category: 'indoor-hack',
        title: 'Neutralize Indoor Cooking & Heating PM2.5 Spikes',
        summary:
          'Batch-cook with lids on, use electric kettle/rice-cooker/induction plug-ins instead of open flames, and wet-mop floors instead of dry sweeping.',
        timingWindow: 'Meal Prep Windows',
        costLevel: 'Free',
        effort: 'Instant',
        tailoredReason: `Your ${profile.heatingCooking.replace(
          /-/g,
          ' '
        )} setup can push indoor NO₂ & PM2.5 higher than outdoor winter smog when windows stay shut.`,
        impact: {
          personalExposureDropPct: 44,
          pm25AvoidedUgPerDay: Math.round(snapshot.pm25 * 1.9 + 38),
          co2SavedKgPerWeek: 9.8,
          monthlySavingsInr: 700,
          mechanism:
            'Unvented flames emit concentrated NO₂ and ultrafine droplets, while dry sweeping resuspends settled heavy-metal dust back into breathing height.',
          plainExplanation:
            'Shifting simmering to covered electric appliances and damp-mopping prevents indoor pollution spikes of 150+ µg/m³ during dinner.',
        },
      }
    : {
        id: 'indoor-damp-mop-seal',
        category: 'indoor-hack',
        title: 'Wet-Dust + Weatherstrip Leaky Window Sashes',
        summary:
          'Replace dry broom sweeping with microfiber damp-mopping and apply removable foam strips or tape to drafty window seams until spring.',
        timingWindow: 'Once Weekly + Daily Micro-Wipe',
        costLevel: 'Low (₹)',
        effort: '15 mins',
        tailoredReason: `Stops outdoor ${snapshot.pm10} µg/m³ coarse dust and smog from infiltrating via ${profile.homeVentilation.replace(
          '-',
          ' '
        )}.`,
        impact: {
          personalExposureDropPct: 36,
          pm25AvoidedUgPerDay: Math.round(snapshot.pm25 * 1.6),
          co2SavedKgPerWeek: 4.5,
          monthlySavingsInr: 550,
          mechanism:
            'Sealing 2 mm perimeter cracks cuts uncontrolled winter smog infiltration by ~40% while reducing room-heating electricity use.',
          plainExplanation:
            'Keeps smoky outdoor air outside AND cuts your winter room-heating bill by trapping indoor warmth.',
        },
      };

  return [purifierHack, indoorSourceHack];
}

function buildSustainableAndCommunityRecommendations(
  location: LocationProfile,
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile
): ActionRecommendation[] {
  const sustainableSwap: ActionRecommendation = {
    id: 'sustainable-electric-swap',
    category: 'sustainable-alt',
    title:
      profile.heatingCooking === 'biomass-coal'
        ? 'Transition to Clean Electric Induction + Thermal Insulation'
        : 'Zero-Combustion Home & Mobility Bundle',
    summary:
      'Replace backup wood/coal heaters, incense, and open flames with electric radiant warmth, LED lighting, and e-cycle/metro passes for short <5 km trips.',
    timingWindow: 'All Winter Season',
    costLevel: 'Moderate (₹₹)',
    effort: 'Habit shift',
    tailoredReason: `Short <5 km combustion trips and indoor flame sources drive a disproportionate share of ${location.name}'s street-level NO₂ (${snapshot.no2} µg/m³).`,
    impact: {
      personalExposureDropPct: 28,
      pm25AvoidedUgPerDay: Math.round(snapshot.pm25 * 1.15 + 20),
      co2SavedKgPerWeek: 19.4,
      monthlySavingsInr: 1650,
      mechanism:
        'Eliminating direct fossil/biomass combustion inside the neighborhood eliminates primary black carbon and secondary nitrate aerosols at the source.',
      plainExplanation:
        'Every combustion flame replaced with electric power prevents soot right at breathing height—cutting 19.4 kg CO₂/week and ~₹1,650/month.',
    },
  };

  const communityPact: ActionRecommendation = {
    id: 'community-idle-free-microgrid',
    category: 'community',
    title: 'Launch an RWA "Idle-Free & Leaf-Free" Clean Air Pact',
    summary:
      'Organize 10–25 nearby flats or school parents to ban car/auto idling at pickup gates, stop open leaf/trash burning via society composting, and share daily clean-air window alerts.',
    timingWindow: 'Society / School Gate Hours',
    costLevel: 'Free',
    effort: 'Habit shift',
    tailoredReason: `A single idling vehicle or burning leaf pile next to an apartment block spikes localized PM2.5 above 400 µg/m³ during ${snapshot.inversionSeverity.toLowerCase()} inversions.`,
    impact: {
      personalExposureDropPct: 22,
      pm25AvoidedUgPerDay: Math.round(snapshot.pm25 * 1.1),
      co2SavedKgPerWeek: 14.0,
      monthlySavingsInr: 400,
      mechanism:
        'Collective action breaks the tragedy of the commons: 25 households turning off engines at school drop-off removes ~1.8 kg of concentrated NOx/PM around children every month.',
      plainExplanation:
        'When your street stops idling and burning dry waste, neighborhood micro-spikes disappear—protecting elderly neighbors and kids alike.',
    },
  };

  return [sustainableSwap, communityPact];
}

function buildDailyRoutineTimeline(
  snapshot: AirQualitySnapshot,
  bestWindow: CleanAirWindow
): RoutineTimelineSlot[] {
  const isSevere = snapshot.usAqi >= 150;
  return [
    {
      periodLabel: 'Morning Inversion Peak',
      timeRange: '06:30 – 10:30',
      riskTag: 'Peak Smog',
      actionTitle: isSevere
        ? 'Stay indoors; seal windows, use N95 + cabin recirculation for essential school/work trips.'
        : 'Avoid strenuous outdoor jogging; delay non-urgent errands until afternoon.',
      directImpactNote: 'Prevents peak cold-start NO₂ and trapped morning soot inhalation.',
    },
    {
      periodLabel: 'Cleanest Mixing Window',
      timeRange: `${bestWindow.startLabel} – ${bestWindow.endLabel}`,
      riskTag: 'Best Window',
      actionTitle: `Bundle market errands & open cross-ventilation for 10–15 mins (Avg AQI ${bestWindow.avgAqi}).`,
      directImpactNote: 'Flushes indoor CO₂ at the lowest ground-level PM2.5 hour.',
    },
    {
      periodLabel: 'Evening & Sleep Sanctuary',
      timeRange: '18:30 – 06:00',
      riskTag: 'Indoor Guard',
      actionTitle:
        'Cook with covered induction/lids, wet-mop dust, and run bedroom purifier/DIY cube on low.',
      directImpactNote: 'Protects 8+ hours of overnight lung recovery during nocturnal inversion.',
    },
  ];
}

function isValidRecommendation(item: unknown): item is ActionRecommendation {
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

  const hasSensitive =
    profile.sensitivities.length > 0 &&
    !profile.sensitivities.includes('none');
  const sensitiveText = hasSensitive
    ? `protective priority for ${profile.sensitivities.join(', ')}`
    : 'your household baseline';

  const fallbackRecs: ActionRecommendation[] = [
    ...buildRoutineRecommendations(
      location,
      snapshot,
      profile,
      bestWindow,
      sensitiveText
    ),
    ...buildIndoorHackRecommendations(snapshot, profile, sensitiveText),
    ...buildSustainableAndCommunityRecommendations(location, snapshot, profile),
  ];

  const timeline = buildDailyRoutineTimeline(snapshot, bestWindow);

  const defaultHeadline =
    snapshot.usAqi >= 200
      ? `Severe Winter Smog Alert in ${location.name}: Stay Indoors, Seal & Filter Now`
      : snapshot.usAqi >= 150
        ? `Unhealthy Smog Episode (${snapshot.usAqi} AQI): Shift Routines to ${bestWindow.startLabel}–${bestWindow.endLabel}`
        : snapshot.usAqi >= 100
          ? `Moderate-Elevated Winter Haze: Protect Sensitive Lungs & Cut Peak Exhaust`
          : `Favorable Dispersion Today in ${location.name}: Ventilate & Lock In Low-Emission Habits`;

  const defaultBriefing = `${location.name} is currently at US AQI ${snapshot.usAqi} with PM2.5 at ${snapshot.pm25} µg/m³ (${(
    snapshot.pm25 / 15
  ).toFixed(1)}× the WHO 24-hour guideline). ${
    snapshot.inversionActive
      ? `A ${snapshot.inversionSeverity.toLowerCase()} thermal inversion (${snapshot.temperatureC}°C, ${snapshot.windSpeedKmh} km/h wind) is trapping vehicle exhaust and residential smoke near ground level.`
      : `Light atmospheric mixing (${snapshot.windSpeedKmh} km/h wind) is helping disperse surface pollutants.`
  }`;

  if (geminiApiKey && geminiApiKey.trim().length > 12) {
    try {
      const promptText = `${systemPrompt}\n\nLIVE HOUSEHOLD & TELEMETRY CONTEXT:\n${contextPayload}\n\nReturn strictly valid JSON with keys: "headlineGuidance" (string), "smogBriefing" (string), "indoorVsOutdoorRatioNote" (string), "communityMultiplierNote" (string), and "recommendations" (array of 6 objects matching: id, category one of ["routine","indoor-hack","sustainable-alt","community"], title, summary, timingWindow, costLevel one of ["Free","Low (₹)","Moderate (₹₹)"], effort one of ["Instant","15 mins","Habit shift"], tailoredReason, impact: { personalExposureDropPct (number 5-75), pm25AvoidedUgPerDay (number), co2SavedKgPerWeek (number), monthlySavingsInr (number), mechanism (string), plainExplanation (string) }). Express all monetary figures in Indian Rupees (INR / ₹).`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          geminiApiKey.trim()
        )}`,
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

      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText) as Partial<GenAIPlan>;
          const validRecs = Array.isArray(parsed.recommendations)
            ? parsed.recommendations.filter(isValidRecommendation)
            : [];
          if (
            typeof parsed.headlineGuidance === 'string' &&
            validRecs.length >= 4
          ) {
            return {
              headlineGuidance: parsed.headlineGuidance,
              smogBriefing:
                typeof parsed.smogBriefing === 'string'
                  ? parsed.smogBriefing
                  : defaultBriefing,
              bestOutdoorWindow: bestWindow,
              indoorVsOutdoorRatioNote:
                typeof parsed.indoorVsOutdoorRatioNote === 'string'
                  ? parsed.indoorVsOutdoorRatioNote
                  : 'Without filtration, indoor PM2.5 tracks 55–80% of outdoor winter smog—and spikes higher during unvented cooking.',
              communityMultiplierNote:
                typeof parsed.communityMultiplierNote === 'string'
                  ? parsed.communityMultiplierNote
                  : 'If 100 households in your RWA/ward adopt these low-emission shifts, neighborhood morning PM2.5 peaks drop measurably.',
              dailyRoutineTimeline: timeline,
              recommendations: validRecs,
              promptArtifact: {
                systemPrompt,
                contextPayload,
                modelLabel: 'Gemini 2.5 Flash (Live API)',
                mode: 'gemini-live',
                latencyMs: Math.round(performance.now() - startMs),
              },
            };
          }
        }
      }
    } catch {
      // Fall through cleanly to grounded contextual engine
    }
  }

  return {
    headlineGuidance: defaultHeadline,
    smogBriefing: defaultBriefing,
    bestOutdoorWindow: bestWindow,
    indoorVsOutdoorRatioNote:
      profile.purifierAccess === 'none'
        ? `Unfiltered homes during ${location.name}'s winter inversion absorb 60–85% of outdoor PM2.5—meaning indoor air is still ${(
            (snapshot.pm25 * 0.7) /
            15
          ).toFixed(1)}× WHO limits until filtered.`
        : `With active filtration and window sealing, your home can maintain an indoor PM2.5 level 60–75% cleaner than outside (${Math.round(
            snapshot.pm25 * 0.3
          )} µg/m³ vs ${snapshot.pm25} µg/m³).`,
    communityMultiplierNote: `If 100 families of ${profile.householdSize} in ${location.name} commit to these routines, they collectively prevent ~2.4 tonnes of CO₂e and eliminate hundreds of cold-start exhaust & open-smoke events every winter month.`,
    dailyRoutineTimeline: timeline,
    recommendations: fallbackRecs,
    promptArtifact: {
      systemPrompt,
      contextPayload,
      modelLabel: 'AetherGuard Grounded Synthesis Engine (Zero-Key Demo)',
      mode: 'contextual-engine',
      latencyMs: Math.max(12, Math.round(performance.now() - startMs)),
    },
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
  const nowStr = new Date().toLocaleTimeString([], {
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

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          geminiApiKey.trim()
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${sys}\n\nUSER QUESTION: ${question}` }],
              },
            ],
            generationConfig: { temperature: 0.45 },
          }),
        }
      );

      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (answer) {
          return {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: answer,
            impactSummary: `Grounded in live ${location.name} telemetry (AQI ${snapshot.usAqi})`,
            timestamp: nowStr,
            mode: 'gemini-live',
          };
        }
      }
    } catch {
      // Fall through cleanly to contextual advisor
    }
  }

  const q = question.toLowerCase();
  let content = '';
  let impactSummary = '';

  if (q.includes('window') || q.includes('ventilat') || q.includes('open')) {
    content = `In ${location.name} right now (AQI ${snapshot.usAqi}, PM2.5 ${snapshot.pm25} µg/m³), keep windows shut during morning and night inversion hours. Open cross-ventilation windows for just 10–15 minutes inside today's cleanest mixing window (${plan.bestOutdoorWindow.startLabel}–${plan.bestOutdoorWindow.endLabel}, avg AQI ${plan.bestOutdoorWindow.avgAqi}) to flush indoor CO₂, then seal and run filtration.`;
    impactSummary =
      'Prevents ~45% indoor PM2.5 surge while avoiding stuffy CO₂ buildup (>1,200 ppm).';
  } else if (
    q.includes('school') ||
    q.includes('kid') ||
    q.includes('child') ||
    q.includes('walk') ||
    q.includes('run') ||
    q.includes('exercise')
  ) {
    content =
      snapshot.usAqi > 150
        ? `At AQI ${snapshot.usAqi} in ${location.name}, skip outdoor sports and strenuous walks—deep breathing multiplies particle deposition in children's lungs by 3–5×. Use a fit-tested KF94/N95 for essential transit, move PE/play indoors near a filtered zone, and ask the school to enforce an idle-free pickup gate.`
        : `AQI is ${snapshot.usAqi} now, dipping to ${plan.bestOutdoorWindow.avgAqi} between ${plan.bestOutdoorWindow.startLabel} and ${plan.bestOutdoorWindow.endLabel}. Schedule outdoor play or walking errands in that afternoon window rather than 07:30–09:30 rush hour.`;
    impactSummary =
      snapshot.usAqi > 150
        ? 'Reduces pediatric fine-particle lung dose by 65–80% on peak smog days.'
        : 'Cuts commute/play PM2.5 exposure by ~30% simply via time-shifting.';
  } else if (
    q.includes('corsi') ||
    q.includes('diy') ||
    q.includes('filter') ||
    q.includes('purifier') ||
    q.includes('cheap')
  ) {
    content = `To build a Corsi-Rosenthal clean-air cube (~₹2,800–₹3,800): tape 4 square MERV-13 filters (20"×20"×1") with airflow arrows pointing INWARD, add a cardboard bottom, and tape a standard box/exhaust fan on top blowing UP (mask corners of the fan face with a cardboard shroud to stop backflow). Place it in the main bedroom on low/medium.`;
    impactSummary = `Delivers ~450 CFM clean air—cutting bedroom PM2.5 from ~${Math.round(
      snapshot.pm25 * 0.7
    )} µg/m³ down toward 12–18 µg/m³ in 45 minutes.`;
  } else if (
    q.includes('community') ||
    q.includes('neighbor') ||
    q.includes('rwa') ||
    q.includes('hoa') ||
    q.includes('apartment') ||
    q.includes('ward')
  ) {
    content = `Three high-leverage RWA/community moves for ${location.name} this winter: (1) Distribute a 1-page "Clean Air Window" WhatsApp/SMS alert anchored to ${plan.bestOutdoorWindow.startLabel}–${plan.bestOutdoorWindow.endLabel}; (2) Host a shared DIY MERV-13 build workshop for elderly flats; (3) Enforce zero leaf/waste burning and zero delivery-van idling inside society gates.`;
    impactSummary =
      'Each 25-household cluster eliminates ~35 kg CO₂/week and prevents localized 400+ AQI micro-plumes.';
  } else {
    content = `Based on ${location.name}'s current ${snapshot.usAqi} AQI (${snapshot.pm25} µg/m³ PM2.5) and your ${profile.householdType.replace(
      '-',
      ' '
    )} profile: prioritize sealing your primary sleeping room, shifting errands to ${plan.bestOutdoorWindow.startLabel}–${plan.bestOutdoorWindow.endLabel}, and replacing any unvented combustion or solo cold-start driving. Check the Impact Simulator to see exact µg/day, CO₂, and ₹/month savings.`;
    impactSummary =
      'Combining 3 habits cuts personal daily PM2.5 inhalation by 55–72% while lowering neighborhood emissions.';
  }

  return {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    content,
    impactSummary,
    timestamp: nowStr,
    mode: 'contextual-engine',
  };
}
