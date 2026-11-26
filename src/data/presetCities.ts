import type { LocationProfile } from '../types/airQuality';

/**
 * Curated winter-smog watch cities prioritizing Indian urban metros alongside
 * global reference cities for atmospheric comparison.
 */
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
    id: 'mumbai-in',
    name: 'Mumbai',
    region: 'Maharashtra',
    country: 'India',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    winterInversionNote:
      'Calm winter land-sea breeze reversals trap construction dust and coastal traffic haze.',
  },
  {
    id: 'kolkata-in',
    name: 'Kolkata',
    region: 'West Bengal',
    country: 'India',
    latitude: 22.5726,
    longitude: 88.3639,
    timezone: 'Asia/Kolkata',
    winterInversionNote:
      'Lower Gangetic winter fog binds with coal/diesel soot to elevate morning PM2.5.',
  },
  {
    id: 'bengaluru-in',
    name: 'Bengaluru',
    region: 'Karnataka',
    country: 'India',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: 'Asia/Kolkata',
    winterInversionNote:
      'Chilly December–January mornings concentrate arterial corridor traffic exhaust.',
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
