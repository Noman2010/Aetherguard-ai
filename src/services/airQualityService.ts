import type {
  AirQualitySnapshot,
  AqiSeverityMeta,
  HourlyForecastPoint,
  LocationProfile,
} from '../types/airQuality';

export const PRESET_CITIES: LocationProfile[] = [
  {
    id: 'delhi-in',
    name: 'New Delhi',
    region: 'Delhi NCR',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    winterInversionNote:
      'Indo-Gangetic cold air pooling traps traffic, dust, and biomass smoke below 200m.',
  },
  {
    id: 'lahore-pk',
    name: 'Lahore',
    region: 'Punjab',
    country: 'Pakistan',
    latitude: 31.5204,
    longitude: 74.3587,
    timezone: 'Asia/Karachi',
    winterInversionNote:
      'Low winter wind speeds and high humidity accelerate secondary PM2.5 haze formation.',
  },
  {
    id: 'slc-us',
    name: 'Salt Lake City',
    region: 'Utah',
    country: 'United States',
    latitude: 40.7608,
    longitude: -111.891,
    timezone: 'America/Denver',
    winterInversionNote:
      'Wasatch basin topography creates multi-day cold-pool inversions under high pressure.',
  },
  {
    id: 'beijing-cn',
    name: 'Beijing',
    region: 'Beijing',
    country: 'China',
    latitude: 39.9042,
    longitude: 116.4074,
    timezone: 'Asia/Shanghai',
    winterInversionNote:
      'Stagnant northern valley winds raise nocturnal PM2.5 and NO2 during winter heating.',
  },
  {
    id: 'milan-it',
    name: 'Milan',
    region: 'Lombardy',
    country: 'Italy',
    latitude: 45.4642,
    longitude: 9.19,
    timezone: 'Europe/Rome',
    winterInversionNote:
      'Po Valley thermal lid concentrates diesel NOx and wood-stove particulates near street level.',
  },
  {
    id: 'london-gb',
    name: 'London',
    region: 'Greater London',
    country: 'United Kingdom',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    winterInversionNote:
      'Calm frosty mornings elevate roadside NO2 and residential wood-burning PM2.5.',
  },
];

export function getAqiSeverityMeta(usAqi: number, pm25: number): AqiSeverityMeta {
  const whoMultiple = Math.max(0.1, Number((pm25 / 15).toFixed(1)));
  if (usAqi <= 50) {
    return {
      label: 'Good',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      ringColor: '#10b981',
      gradientClass: 'from-emerald-500/20 to-teal-500/5',
      textColor: 'text-emerald-300',
      whoMultiple,
    };
  }
  if (usAqi <= 100) {
    return {
      label: 'Moderate',
      badgeClass: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
      ringColor: '#fbbf24',
      gradientClass: 'from-amber-500/20 to-yellow-500/5',
      textColor: 'text-amber-300',
      whoMultiple,
    };
  }
  if (usAqi <= 150) {
    return {
      label: 'Unhealthy for Sensitive Groups',
      badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
      ringColor: '#f97316',
      gradientClass: 'from-orange-500/20 to-amber-500/5',
      textColor: 'text-orange-300',
      whoMultiple,
    };
  }
  if (usAqi <= 200) {
    return {
      label: 'Unhealthy',
      badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      ringColor: '#f43f5e',
      gradientClass: 'from-rose-500/20 to-red-500/5',
      textColor: 'text-rose-300',
      whoMultiple,
    };
  }
  if (usAqi <= 300) {
    return {
      label: 'Very Unhealthy',
      badgeClass: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
      ringColor: '#a855f7',
      gradientClass: 'from-purple-500/25 to-rose-500/10',
      textColor: 'text-purple-200',
      whoMultiple,
    };
  }
  return {
    label: 'Hazardous Winter Smog',
    badgeClass: 'bg-red-600/25 text-red-200 border-red-400/50',
    ringColor: '#ef4444',
    gradientClass: 'from-red-600/25 to-purple-900/15',
    textColor: 'text-red-200',
    whoMultiple,
  };
}

function buildDiurnalForecast(
  basePm25: number,
  baseAqi: number,
  severeMode: boolean
): HourlyForecastPoint[] {
  const now = new Date();
  const points: HourlyForecastPoint[] = [];
  for (let offset = 0; offset < 24; offset++) {
    const dt = new Date(now.getTime() + offset * 3600_000);
    const hour = dt.getHours();
    // Winter smog peaks during morning rush/inversion (7-10) and evening inversion (19-23),
    // with a convective boundary-layer dip in afternoon (13-16).
    let factor = 1.0;
    if (hour >= 13 && hour <= 16) {
      factor = severeMode ? 0.68 : 0.72;
    } else if ((hour >= 7 && hour <= 10) || (hour >= 19 && hour <= 23)) {
      factor = severeMode ? 1.24 : 1.18;
    } else if (hour >= 1 && hour <= 5) {
      factor = 1.1;
    }
    const pm25 = Math.max(4, Number((basePm25 * factor).toFixed(1)));
    const usAqi = Math.max(18, Math.round(baseAqi * factor));
    const hourLabel = dt.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    points.push({
      isoTime: dt.toISOString(),
      hourLabel,
      usAqi,
      pm25,
      isDaylight: hour >= 7 && hour <= 17,
    });
  }
  return points;
}

export function buildSimulatedSevereSmog(location: LocationProfile): AirQualitySnapshot {
  const isSouthAsia =
    location.country === 'India' || location.country === 'Pakistan';
  const baseAqi = isSouthAsia ? 338 : 246;
  const basePm25 = isSouthAsia ? 218 : 148;
  return {
    usAqi: baseAqi,
    pm25: basePm25,
    pm10: Math.round(basePm25 * 1.48),
    no2: isSouthAsia ? 78 : 66,
    so2: isSouthAsia ? 29 : 18,
    o3: 34,
    co: isSouthAsia ? 1650 : 1180,
    temperatureC: isSouthAsia ? 9.4 : 1.8,
    humidityPct: 84,
    windSpeedKmh: 3.4,
    inversionActive: true,
    inversionSeverity: 'Severe',
    timestamp: new Date().toISOString(),
    source: 'severe-smog-sim',
    hourlyForecast: buildDiurnalForecast(basePm25, baseAqi, true),
  };
}

export async function searchCities(query: string): Promise<LocationProfile[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return PRESET_CITIES;
  }

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmed
    )}&count=6&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding API error');
    const data = (await res.json()) as {
      results?: Array<{
        id: number;
        name: string;
        admin1?: string;
        country?: string;
        latitude: number;
        longitude: number;
        timezone?: string;
      }>;
    };
    if (!data.results || data.results.length === 0) {
      return PRESET_CITIES.filter((c) =>
        `${c.name} ${c.country}`.toLowerCase().includes(trimmed.toLowerCase())
      );
    }
    return data.results.map((item) => ({
      id: `${item.id}`,
      name: item.name,
      region: item.admin1 || item.country || 'Urban Metro',
      country: item.country || '',
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone || 'auto',
    }));
  } catch {
    return PRESET_CITIES.filter((c) =>
      `${c.name} ${c.country}`.toLowerCase().includes(trimmed.toLowerCase())
    );
  }
}

function deriveInversionSeverity(
  windSpeedKmh: number,
  temperatureC: number,
  pm25: number
): { active: boolean; severity: 'Severe' | 'Moderate' | 'Low' } {
  if (windSpeedKmh < 7.5 && temperatureC < 16 && pm25 >= 55) {
    return { active: true, severity: 'Severe' };
  }
  if (windSpeedKmh < 12 && temperatureC < 20 && pm25 >= 25) {
    return { active: true, severity: 'Moderate' };
  }
  return { active: false, severity: 'Low' };
}

export async function fetchAirQualityForLocation(
  location: LocationProfile,
  simulateSevereSmog: boolean
): Promise<AirQualitySnapshot> {
  if (simulateSevereSmog) {
    return buildSimulatedSevereSmog(location);
  }

  try {
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.latitude}&longitude=${location.longitude}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=pm2_5,us_aqi&forecast_days=2&timezone=auto`;
    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;

    const [aqRes, wxRes] = await Promise.all([fetch(aqUrl), fetch(wxUrl)]);
    if (!aqRes.ok || !wxRes.ok) {
      throw new Error('Upstream telemetry error');
    }

    const aqJson = (await aqRes.json()) as {
      current?: {
        us_aqi?: number;
        pm10?: number;
        pm2_5?: number;
        carbon_monoxide?: number;
        nitrogen_dioxide?: number;
        sulphur_dioxide?: number;
        ozone?: number;
        time?: string;
      };
      hourly?: {
        time?: string[];
        pm2_5?: number[];
        us_aqi?: number[];
      };
    };

    const wxJson = (await wxRes.json()) as {
      current?: {
        temperature_2m?: number;
        relative_humidity_2m?: number;
        wind_speed_10m?: number;
      };
    };

    const currentAq = aqJson.current ?? {};
    const currentWx = wxJson.current ?? {};
    const pm25 = Number((currentAq.pm2_5 ?? 38).toFixed(1));
    const usAqi = Math.round(currentAq.us_aqi ?? 108);
    const temp = Number((currentWx.temperature_2m ?? 11.2).toFixed(1));
    const wind = Number((currentWx.wind_speed_10m ?? 6.4).toFixed(1));
    const humidity = Math.round(currentWx.relative_humidity_2m ?? 72);

    const inv = deriveInversionSeverity(wind, temp, pm25);

    // Slice the next 24 hourly forecast points starting near current hour
    const times = aqJson.hourly?.time ?? [];
    const hourlyAqi = aqJson.hourly?.us_aqi ?? [];
    const hourlyPm25 = aqJson.hourly?.pm2_5 ?? [];
    const nowMs = Date.now();
    let startIdx = times.findIndex((t) => new Date(t).getTime() >= nowMs - 3600_000);
    if (startIdx < 0) startIdx = 0;

    const forecast: HourlyForecastPoint[] = [];
    for (let i = startIdx; i < Math.min(times.length, startIdx + 24); i++) {
      const iso = times[i];
      const dt = new Date(iso);
      const hr = dt.getHours();
      forecast.push({
        isoTime: iso,
        hourLabel: dt.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        usAqi: Math.round(hourlyAqi[i] ?? usAqi),
        pm25: Number((hourlyPm25[i] ?? pm25).toFixed(1)),
        isDaylight: hr >= 7 && hr <= 17,
      });
    }

    return {
      usAqi,
      pm25,
      pm10: Math.round(currentAq.pm10 ?? pm25 * 1.4),
      no2: Math.round(currentAq.nitrogen_dioxide ?? 32),
      so2: Math.round(currentAq.sulphur_dioxide ?? 11),
      o3: Math.round(currentAq.ozone ?? 42),
      co: Math.round(currentAq.carbon_monoxide ?? 620),
      temperatureC: temp,
      humidityPct: humidity,
      windSpeedKmh: wind,
      inversionActive: inv.active,
      inversionSeverity: inv.severity,
      timestamp: currentAq.time ?? new Date().toISOString(),
      source: 'live-api',
      hourlyForecast:
        forecast.length >= 12
          ? forecast
          : buildDiurnalForecast(pm25, usAqi, usAqi > 180),
    };
  } catch {
    // Graceful realistic fallback if offline or API blocked
    const fallback = buildSimulatedSevereSmog(location);
    return {
      ...fallback,
      usAqi: 168,
      pm25: 89.4,
      pm10: 132,
      no2: 52,
      so2: 16,
      source: 'fallback-cache',
      hourlyForecast: buildDiurnalForecast(89.4, 168, false),
    };
  }
}
