import type {
  ActionRecommendation,
  AirQualitySnapshot,
  CleanAirWindow,
  HouseholdProfile,
  LocationProfile,
  RoutineTimelineSlot,
} from '../types/airQuality';

/**
 * Finds the cleanest contiguous 3-hour atmospheric mixing window in the
 * 24-hour forecast for errands and controlled cross-ventilation.
 */
export function computeBestOutdoorWindow(
  snapshot: AirQualitySnapshot
): CleanAirWindow {
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
    const slice = forecast.slice(i, i + 3);
    const avg = slice.reduce((sum, pt) => sum + pt.usAqi, 0) / slice.length;
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
    (bestSlice.reduce((sum, pt) => sum + pt.pm25, 0) / bestSlice.length).toFixed(1)
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

function buildRoutineRecommendations(
  location: LocationProfile,
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile,
  bestWindow: CleanAirWindow,
  sensitiveText: string
): ActionRecommendation[] {
  const isSevere = snapshot.usAqi >= 150;
  const isMotorized =
    profile.commuteMode === 'car-solo' || profile.commuteMode === 'two-wheeler';

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
    title: isSevere
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
  return [
    {
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
    },
    {
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
    },
  ];
}

/**
 * Synthesizes all 6 personalized recommendations across the 4 pillars.
 */
export function buildTailoredRecommendations(
  location: LocationProfile,
  snapshot: AirQualitySnapshot,
  profile: HouseholdProfile,
  bestWindow: CleanAirWindow
): ActionRecommendation[] {
  const hasSensitive =
    profile.sensitivities.length > 0 &&
    !profile.sensitivities.includes('none');
  const sensitiveText = hasSensitive
    ? `protective priority for ${profile.sensitivities.join(', ')}`
    : 'your household baseline';

  return [
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
}

/**
 * Generates a 3-phase morning, midday, and evening routine timeline.
 */
export function buildDailyRoutineTimeline(
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
      directImpactNote:
        'Prevents peak cold-start NO₂ and trapped morning soot inhalation.',
    },
    {
      periodLabel: 'Cleanest Mixing Window',
      timeRange: `${bestWindow.startLabel} – ${bestWindow.endLabel}`,
      riskTag: 'Best Window',
      actionTitle: `Bundle market errands & open cross-ventilation for 10–15 mins (Avg AQI ${bestWindow.avgAqi}).`,
      directImpactNote:
        'Flushes indoor CO₂ at the lowest ground-level PM2.5 hour.',
    },
    {
      periodLabel: 'Evening & Sleep Sanctuary',
      timeRange: '18:30 – 06:00',
      riskTag: 'Indoor Guard',
      actionTitle:
        'Cook with covered induction/lids, wet-mop dust, and run bedroom purifier/DIY cube on low.',
      directImpactNote:
        'Protects 8+ hours of overnight lung recovery during nocturnal inversion.',
    },
  ];
}
