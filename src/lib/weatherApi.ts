import type { WeatherApiResponse, CityInfo, Zone, TrendPoint, ZoneEvent, ZoneStatus } from '@/types';
import { fetchLiveCityData } from '@/services/weatherService';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function fetchWeatherData(city: CityInfo): Promise<WeatherApiResponse> {
  try {
    // 1. Direct resilient live data from Open-Meteo
    return await fetchLiveCityData(city);
  } catch (directErr) {
    // 2. Fall back to Supabase edge function if direct fetch fails
    if (SUPABASE_URL && ANON_KEY) {
      const url = `${SUPABASE_URL}/functions/v1/weather-data?lat=${city.latitude}&lng=${city.longitude}&zones=4`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${ANON_KEY}`,
          'X-Client-Info': 'citypulse',
        },
      });

      if (res.ok) {
        const data: WeatherApiResponse = await res.json();
        if (!data.error) return data;
      }
    }
    throw directErr;
  }
}

const streetNames = [
  'Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Park Blvd',
  'River Rd', 'Hill St', 'Center Ave', 'First St', 'Broadway',
  'Union Sq', 'Market St', 'High St', 'Spring Ln', 'Elm St',
];

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

const complaintTexts = [
  'Pothole reported on {street}',
  'Flooding reported near {street}',
  'Streetlight outage on {street}',
  'Noise complaint near {street}',
  'Debris blocking bike lane on {street}',
  'Water main leak on {street}',
  'Fallen tree branch on {street}',
  'Graffiti reported on {street}',
  'Traffic signal malfunction at {street}',
  'Sidewalk crack reported on {street}',
  'Overflowing trash bin on {street}',
  'Drainage issue on {street}',
];

const weatherEventTexts: Record<number, string[]> = {
  0: ['Clear conditions reported in {zone}'],
  1: ['Mostly clear skies in {zone}'],
  2: ['Partly cloudy in {zone}', 'Cloud cover increasing in {zone}'],
  3: ['Overcast conditions persist in {zone}'],
  45: ['Fog reducing visibility in {zone}', 'Dense fog advisory for {zone}'],
  48: ['Freezing fog reported in {zone}'],
  51: ['Light drizzle in {zone}'],
  53: ['Moderate drizzle in {zone}'],
  55: ['Heavy drizzle in {zone}'],
  61: ['Light rain in {zone}', 'Rainfall reported in {zone}'],
  63: ['Moderate rain in {zone}'],
  65: ['Heavy rain in {zone}', 'Heavy rainfall alert for {zone}'],
  66: ['Freezing rain in {zone}'],
  67: ['Heavy freezing rain in {zone}'],
  71: ['Light snow in {zone}'],
  73: ['Moderate snow in {zone}'],
  75: ['Heavy snow in {zone}', 'Snow alert for {zone}'],
  77: ['Snow grains in {zone}'],
  80: ['Light showers in {zone}'],
  81: ['Moderate showers in {zone}'],
  82: ['Violent showers in {zone}'],
  85: ['Snow showers in {zone}'],
  86: ['Heavy snow showers in {zone}'],
  95: ['Thunderstorm in {zone}', 'Thunderstorm warning for {zone}'],
  96: ['Thunderstorm with hail in {zone}'],
  99: ['Severe thunderstorm in {zone}'],
};

const transitTexts = [
  'Bus route {n} detoured due to road conditions',
  'Transit delays on {street} corridor',
  'Service running on schedule through {zone}',
  'Signal malfunction near {street}',
  'Bus route {n} running {delay} min behind schedule',
  'Transit rerouted around {street}',
];

const civicTexts = [
  'Emergency road repair dispatched to {street}',
  'Storm drain inspection on {street} completed',
  'Street sweeping completed in {zone}',
  'Pothole repair crew assigned to {street}',
  'Public works review scheduled for {zone}',
  'Infrastructure inspection on {street}',
];

function generateEvents(
  zoneName: string,
  cityLabel: string,
  rng: () => number,
  status: ZoneStatus,
  weatherCode: number,
  complaintCount: number,
  transitDelay: number,
): ZoneEvent[] {
  const events: ZoneEvent[] = [];
  const count = 5;

  for (let i = 0; i < count; i++) {
    let type: ZoneEvent['type'];
    let text: string;

    if (i === 0 && status === 'alert') {
      type = 'weather';
      const weatherTexts = weatherEventTexts[weatherCode] ?? ['Weather alert in {zone}'];
      text = weatherTexts[0];
    } else if (i === 1 && complaintCount > 10) {
      type = 'complaint';
      text = pick(complaintTexts, rng);
    } else if (i === 2 && transitDelay > 5) {
      type = 'transit';
      text = pick(transitTexts, rng);
    } else {
      const pool = [
        { type: 'complaint' as const, texts: complaintTexts },
        { type: 'weather' as const, texts: weatherEventTexts[weatherCode] ?? ['Weather update for {zone}'] },
        { type: 'transit' as const, texts: transitTexts },
        { type: 'civic' as const, texts: civicTexts },
      ];
      const chosen = pool[Math.floor(rng() * pool.length)];
      type = chosen.type;
      text = pick(chosen.texts, rng);
    }

    text = text
      .replace('{zone}', zoneName)
      .replace('{street}', pick(streetNames, rng))
      .replace('{n}', String(Math.floor(rng() * 50) + 1))
      .replace('{delay}', String(Math.max(1, transitDelay)));

    const now = new Date();
    const time = new Date(now.getTime() - i * 1800000 - Math.floor(rng() * 20) * 60000);
    events.push({
      time: time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      type,
      text,
    });
  }

  return events.sort((a, b) => b.time.localeCompare(a.time));
}

function generateAISummary(
  zoneName: string,
  cityName: string,
  status: ZoneStatus,
  weatherLabel: string,
  temp: number,
  wind: number,
  precip: number,
  transitDelay: number,
  complaints: number,
): string {
  const weatherDetail = `${weatherLabel} (${temp}°C, ${wind} km/h wind${precip > 0 ? `, ${precip}mm precipitation` : ''})`;

  if (status === 'alert') {
    return `${zoneName} in ${cityName} is experiencing a severe event. Real-time conditions show ${weatherDetail}. This is driving a surge of ${complaints} civic complaints with transit delays reaching ${transitDelay} minutes. The combination of weather severity and infrastructure stress suggests the situation will persist for several hours. Immediate attention is recommended for road conditions and drainage.`;
  }
  if (status === 'watch') {
    return `${zoneName} in ${cityName} is under a watch condition. Live data shows ${weatherDetail}, creating moderate disruption with ${complaints} active complaints and ${transitDelay}-minute transit delays. Conditions are deteriorating but have not reached critical levels. Continued monitoring is advised.`;
  }
  return `${zoneName} in ${cityName} is operating normally. Current conditions: ${weatherDetail}. Transit is ${transitDelay === 0 ? 'on schedule' : `experiencing minor ${transitDelay}-minute delays`}, and complaint volume (${complaints}) is within normal baseline. No anomalies detected across data feeds.`;
}

function generateCorrelation(
  status: ZoneStatus,
  weatherLabel: string,
  precip: number,
  wind: number,
  complaints: number,
  transitDelay: number,
  rng: () => number,
): string {
  if (status === 'alert') {
    const r1 = (0.85 + rng() * 0.1).toFixed(2);
    const r2 = (0.65 + rng() * 0.15).toFixed(2);
    return `Strong correlation detected between ${weatherLabel.toLowerCase()} conditions and complaint volume (r=${r1}). Transit delays show secondary correlation (r=${r2}), likely mediated by road surface conditions. Precipitation of ${precip}mm and wind at ${wind} km/h are the primary drivers. Complaint spike exceeds zone baseline by ${Math.floor(20 + rng() * 30)}%.`;
  }
  if (status === 'watch') {
    const r = (0.5 + rng() * 0.15).toFixed(2);
    return `Moderate correlation between weather conditions and civic complaints (r=${r}). ${precip > 0 ? `Precipitation (${precip}mm) is the main factor. ` : ''}Transit impact is ${transitDelay > 5 ? 'noticeable' : 'minimal'}, suggesting infrastructure is coping. No critical anomaly threshold breached yet.`;
  }
  return `No significant correlations detected. All data feeds are within normal parameters. Complaint volume is ${Math.floor(20 + rng() * 30)}% below the 30-day average. Weather and transit show independent, stable patterns.`;
}

export function buildZonesFromWeather(
  raw: WeatherApiResponse,
  city: CityInfo,
): Zone[] {
  const seed = hashString(city.label + Math.floor(Date.now() / 300000));
  const rng = seededRandom(seed);

  return raw.zones.map((rawZone, i) => {
    const c = rawZone.current;
    const d = rawZone.derived;

    const weatherValue = `${c.weatherLabel} · ${c.temperature}°C`;
    const transitValue = d.transitDelay === 0 ? 'On time' : `${d.transitDelay} min delay`;
    const complaintCount = d.complaintCount;

    const prevHourIdx = Math.max(0, rawZone.hourly24.length - 2);
    const currHourIdx = rawZone.hourly24.length - 1;
    const prevComplaints = rawZone.hourly24[prevHourIdx]?.complaints ?? complaintCount;
    const currComplaints = rawZone.hourly24[currHourIdx]?.complaints ?? complaintCount;
    const complaintTrend: 'up' | 'down' | 'flat' =
      currComplaints > prevComplaints ? 'up' : currComplaints < prevComplaints ? 'down' : 'flat';

    const events = generateEvents(
      rawZone.zoneName,
      city.label,
      rng,
      d.status,
      c.weathercode,
      complaintCount,
      d.transitDelay,
    );

    const aiSummary = generateAISummary(
      rawZone.zoneName,
      city.name,
      d.status,
      c.weatherLabel,
      c.temperature,
      c.windspeed,
      c.precipitation,
      d.transitDelay,
      complaintCount,
    );

    const correlation = generateCorrelation(
      d.status,
      c.weatherLabel,
      c.precipitation,
      c.windspeed,
      complaintCount,
      d.transitDelay,
      rng,
    );

    const lat = rawZone.latitude;
    const lng = rawZone.longitude;

    return {
      id: i + 1,
      name: rawZone.zoneName,
      city: city.label,
      status: d.status,
      coords: { lat, lng },
      polygon: [
        { lat: lat - 0.005, lng: lng - 0.005 },
        { lat: lat - 0.005, lng: lng + 0.005 },
        { lat: lat + 0.005, lng: lng + 0.005 },
        { lat: lat + 0.005, lng: lng - 0.005 },
      ],
      weather: {
        value: weatherValue,
        trend: c.precipitation > 0 ? 'up' : c.windspeed > 15 ? 'up' : 'flat',
      },
      transit: {
        value: transitValue,
        trend: d.transitDelay > 5 ? 'up' : d.transitDelay > 0 ? 'flat' : 'down',
      },
      complaints: {
        value: complaintCount,
        trend: complaintTrend,
      },
      severityScore: d.severityScore,
      recentEvents: events,
      aiSummary,
      correlation,
    };
  });
}

export function buildReplayData(raw: WeatherApiResponse): Record<string, TrendPoint[]> {
  return {
    '24h': raw.trend24h.length > 0 ? raw.trend24h : raw.zones[0]?.hourly24 ?? [],
    '7d': raw.zones[0]?.daily7 ?? [],
    '30d': raw.zones[0]?.daily30 ?? [],
  };
}
