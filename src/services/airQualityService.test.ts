import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PRESET_CITIES,
  buildSimulatedSevereSmog,
  fetchAirQualityForLocation,
  getAqiSeverityMeta,
  searchCities,
} from './airQualityService';

describe('airQualityService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps AQI bands to accurate severity metadata and WHO multiples', () => {
    expect(getAqiSeverityMeta(35, 9).label).toBe('Good');
    expect(getAqiSeverityMeta(85, 30).whoMultiple).toBe(2);
    expect(getAqiSeverityMeta(135, 45).label).toBe(
      'Unhealthy for Sensitive Groups'
    );
    expect(getAqiSeverityMeta(185, 90).label).toBe('Unhealthy');
    expect(getAqiSeverityMeta(260, 150).label).toBe('Very Unhealthy');
    expect(getAqiSeverityMeta(340, 225).label).toBe('Hazardous Winter Smog');
  });

  it('builds realistic severe winter smog simulations with 24h forecast', () => {
    const delhiSim = buildSimulatedSevereSmog(PRESET_CITIES[0]);
    const londonSim = buildSimulatedSevereSmog(PRESET_CITIES[5]);

    expect(delhiSim.source).toBe('severe-smog-sim');
    expect(delhiSim.inversionActive).toBe(true);
    expect(delhiSim.inversionSeverity).toBe('Severe');
    expect(delhiSim.usAqi).toBeGreaterThan(300);
    expect(delhiSim.hourlyForecast).toHaveLength(24);
    expect(londonSim.usAqi).toBeLessThan(delhiSim.usAqi);
  });

  it('returns preset cities on empty search and queries Open-Meteo geocoding otherwise', async () => {
    const presets = await searchCities('   ');
    expect(presets.length).toBe(PRESET_CITIES.length);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 99,
              name: 'Kathmandu',
              admin1: 'Bagmati',
              country: 'Nepal',
              latitude: 27.7172,
              longitude: 85.324,
              timezone: 'Asia/Kathmandu',
            },
          ],
        }),
      })
    );

    const results = await searchCities('Kathmandu');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Kathmandu');
    expect(results[0].country).toBe('Nepal');
  });

  it('falls back cleanly when geocoding or telemetry network requests fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));

    const cityMatches = await searchCities('Lahore');
    expect(cityMatches.some((c) => c.name === 'Lahore')).toBe(true);

    const fallbackSnap = await fetchAirQualityForLocation(PRESET_CITIES[0], false);
    expect(fallbackSnap.source).toBe('fallback-cache');
    expect(fallbackSnap.hourlyForecast.length).toBeGreaterThanOrEqual(12);
  });

  it('parses live Open-Meteo air quality and weather payloads', async () => {
    const nowIso = new Date().toISOString().slice(0, 13) + ':00';
    const times = Array.from({ length: 24 }, (_, idx) => {
      const d = new Date(Date.now() + idx * 3600_000);
      return d.toISOString();
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('air-quality-api')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              current: {
                us_aqi: 192,
                pm2_5: 112.4,
                pm10: 168,
                nitrogen_dioxide: 58,
                sulphur_dioxide: 14,
                ozone: 39,
                carbon_monoxide: 980,
                time: nowIso,
              },
              hourly: {
                time: times,
                pm_2_5: times.map((_, i) => (i === 5 ? 60 : 115)),
                us_aqi: times.map((_, i) => (i === 5 ? 120 : 195)),
              },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            current: {
              temperature_2m: 7.5,
              relative_humidity_2m: 81,
              wind_speed_10m: 4.2,
            },
          }),
        });
      })
    );

    const live = await fetchAirQualityForLocation(PRESET_CITIES[0], false);
    expect(live.source).toBe('live-api');
    expect(live.usAqi).toBe(192);
    expect(live.pm25).toBe(112.4);
    expect(live.inversionActive).toBe(true);
    expect(live.inversionSeverity).toBe('Severe');
  });
});
