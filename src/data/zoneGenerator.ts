import type { Zone, ZoneEvent, ZoneStatus, TrendPoint } from '@/types';
import type { CityInfo } from '@/types';

const zoneNames = ['Downtown', 'Riverside', 'Northside', 'West End'];

const weatherConditions = [
  'Clear Skies',
  'Partly Cloudy',
  'Overcast',
  'Light Rain',
  'Heavy Rain',
  'Storm Warning',
  'Foggy',
  'Windy',
  'Snow Flurries',
  'Heat Advisory',
];

const streetNames = [
  'Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Park Blvd',
  'River Rd', 'Hill St', 'Center Ave', 'First St', 'Broadway',
  'Union Sq', 'Market St', 'High St', 'Spring Ln', 'Elm St',
];

const complaintTexts = [
  'Pothole reported on {street}',
  'Flooding reported near {street}',
  'Streetlight outage on {street}',
  'Noise complaint near {street}',
  'Illegal parking on {street}',
  'Debris blocking bike lane on {street}',
  'Water main leak on {street}',
  'Fallen tree branch on {street}',
  'Graffiti reported on {street}',
  'Traffic signal malfunction at {street}',
  'Sidewalk crack reported on {street}',
  'Overflowing trash bin on {street}',
];

const weatherEvents = [
  'Heavy rainfall alert issued for {zone} area',
  'Wind advisory issued for {zone}',
  'Fog reducing visibility in {zone}',
  'Temperature drop recorded in {zone}',
  'Storm system approaching {zone}',
  'Air quality warning for {zone}',
  'Heat advisory active in {zone}',
  'Clear conditions reported in {zone}',
];

const transitEvents = [
  'Bus route {n} detoured due to road conditions',
  'Transit delays on {street} corridor',
  'Service running on schedule through {zone}',
  'Signal malfunction near {street}',
  'Bus route {n} running 5 min behind schedule',
  'Light rail service interrupted near {zone}',
  'Ferry service running on schedule',
  'Transit rerouted around {street}',
];

const civicEvents = [
  'Emergency road repair dispatched to {street}',
  'Storm drain inspection on {street} completed',
  'Street sweeping completed in {zone}',
  'Tree trimming scheduled for {street}',
  'Pothole repair crew assigned to {street}',
  'Public works review scheduled for {zone}',
  'Waste collection completed in {zone}',
  'Infrastructure inspection on {street}',
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

function fillTemplate(template: string, replacements: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => replacements[key] ?? '');
}

function timeString(hoursAgo: number, rng: () => number): string {
  const now = new Date();
  const time = new Date(now.getTime() - hoursAgo * 3600 * 1000 - Math.floor(rng() * 30) * 60000);
  return time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function generateEvents(
  zoneName: string,
  cityLabel: string,
  rng: () => number,
  status: ZoneStatus,
  count: number
): ZoneEvent[] {
  const events: ZoneEvent[] = [];
  const replacements = { street: pick(streetNames, rng), zone: zoneName, n: String(Math.floor(rng() * 50) + 1) };

  const pools = [
    { type: 'complaint' as const, texts: complaintTexts },
    { type: 'weather' as const, texts: weatherEvents },
    { type: 'transit' as const, texts: transitEvents },
    { type: 'civic' as const, texts: civicEvents },
  ];

  for (let i = 0; i < count; i++) {
    let pool;
    if (status === 'alert' && i < 2) {
      pool = pools[0];
    } else if (status === 'watch' && i < 1) {
      pool = pools[0];
    } else {
      pool = pools[Math.floor(rng() * pools.length)];
    }
    const text = fillTemplate(pick(pool.texts, rng), { ...replacements, street: pick(streetNames, rng), zone: zoneName, n: String(Math.floor(rng() * 50) + 1) });
    events.push({
      time: timeString(i * 0.5 + rng() * 0.3, rng),
      type: pool.type,
      text,
    });
  }

  return events.sort((a, b) => b.time.localeCompare(a.time));
}

function statusFromScore(score: number): ZoneStatus {
  if (score >= 70) return 'alert';
  if (score >= 40) return 'watch';
  return 'normal';
}

export function generateZonesForCity(city: CityInfo): Zone[] {
  const seed = hashString(city.label);
  const rng = seededRandom(seed);

  return zoneNames.map((zoneName, i) => {
    const offsetLat = (i % 2 === 0 ? 1 : -1) * (0.01 + rng() * 0.02);
    const offsetLng = ((i < 2 ? 1 : -1) * (0.01 + rng() * 0.02));
    const lat = city.latitude + offsetLat;
    const lng = city.longitude + offsetLng;

    const weatherIdx = Math.floor(rng() * weatherConditions.length);
    const weatherValue = weatherConditions[weatherIdx];
    const isSevereWeather = weatherIdx >= 4;

    const transitDelay = Math.floor(rng() * 15);
    const complaintCount = Math.floor(rng() * 40);

    const severity = Math.min(
      100,
      Math.max(
        5,
        Math.floor(
          (isSevereWeather ? 30 : weatherIdx >= 2 ? 10 : 0) +
            transitDelay * 2 +
            complaintCount * 0.8 +
            rng() * 15
        )
      )
    );

    const status = statusFromScore(severity);
    const weatherTrend = rng() > 0.5 ? 'up' : rng() > 0.5 ? 'down' : 'flat';
    const transitTrend = transitDelay > 5 ? 'up' : transitDelay > 0 ? 'flat' : 'down';
    const complaintsTrend = complaintCount > 15 ? 'up' : complaintCount > 5 ? 'flat' : 'down';

    const events = generateEvents(zoneName, city.label, rng, status, 5);

    const aiSummary = generateAISummary(zoneName, city.name, status, weatherValue, transitDelay, complaintCount);
    const correlation = generateCorrelation(zoneName, status, weatherValue, transitDelay, complaintCount, rng);

    return {
      id: i + 1,
      name: zoneName,
      city: city.label,
      status,
      coords: { lat, lng },
      polygon: [
        { lat, lng },
        { lat: lat + 0.01, lng },
        { lat: lat + 0.01, lng: lng + 0.01 },
        { lat, lng: lng + 0.01 },
      ],
      weather: { value: weatherValue, trend: weatherTrend as 'up' | 'down' | 'flat' },
      transit: {
        value: transitDelay === 0 ? 'On time' : `${transitDelay} min avg delay`,
        trend: transitTrend as 'up' | 'down' | 'flat',
      },
      complaints: { value: complaintCount, trend: complaintsTrend as 'up' | 'down' | 'flat' },
      severityScore: severity,
      recentEvents: events,
      aiSummary,
      correlation,
    };
  });
}

function generateAISummary(
  zoneName: string,
  cityName: string,
  status: ZoneStatus,
  weather: string,
  transitDelay: number,
  complaints: number
): string {
  if (status === 'alert') {
    return `${zoneName} in ${cityName} is experiencing a severe event. ${weather} conditions are driving a surge of ${complaints} civic complaints, with transit delays reaching ${transitDelay} minutes. The combination of weather and infrastructure stress suggests the situation will persist for several hours. Immediate attention is recommended for road conditions and drainage infrastructure.`;
  }
  if (status === 'watch') {
    return `${zoneName} in ${cityName} is under a watch condition. ${weather} is creating moderate disruption with ${complaints} active complaints and ${transitDelay}-minute transit delays. Conditions are deteriorating but have not reached critical levels. Continued monitoring is advised as weather patterns may intensify.`;
  }
  return `${zoneName} in ${cityName} is operating normally. Weather conditions (${weather}) are stable, transit is ${transitDelay === 0 ? 'on schedule' : `experiencing minor ${transitDelay}-minute delays`}, and complaint volume (${complaints}) is within the normal baseline. No anomalies detected across any data feed.`;
}

function generateCorrelation(
  zoneName: string,
  status: ZoneStatus,
  weather: string,
  transitDelay: number,
  complaints: number,
  rng: () => number
): string {
  if (status === 'alert') {
    const r1 = (0.85 + rng() * 0.1).toFixed(2);
    const r2 = (0.65 + rng() * 0.15).toFixed(2);
    return `Strong correlation detected between weather severity and complaint volume (r=${r1}). Transit delays show a secondary correlation (r=${r2}), likely mediated by road surface conditions. The ${complaints}-complaint spike exceeds the zone baseline by ${Math.floor(20 + rng() * 30)}%, aligning with the onset of ${weather.toLowerCase()} conditions.`;
  }
  if (status === 'watch') {
    const r = (0.5 + rng() * 0.15).toFixed(2);
    return `Moderate correlation between weather conditions and civic complaints (r=${r}). Transit impact is ${transitDelay > 5 ? 'noticeable' : 'minimal'}, suggesting infrastructure is coping. No critical anomaly threshold breached yet.`;
  }
  return `No significant correlations detected. All data feeds are within normal parameters. Complaint volume is ${Math.floor(20 + rng() * 30)}% below the 30-day average for ${zoneName}. Weather and transit show independent, stable patterns.`;
}

export function generateTrendData(city: CityInfo): TrendPoint[] {
  const seed = hashString(city.label + 'trend');
  const rng = seededRandom(seed);
  const hours = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

  return hours.map((hour, i) => {
    const baseComplaints = Math.floor(Math.sin((i / hours.length) * Math.PI * 2) * 10 + 15);
    const complaints = Math.max(0, baseComplaints + Math.floor(rng() * 8));
    const transit = Math.max(0, Math.floor(complaints * 0.3 + rng() * 4));
    const weather = Math.max(0, Math.floor(complaints * 0.25 + rng() * 3));
    return { hour, complaints, transit, weather };
  });
}

export function generateReplayData(city: CityInfo): Record<string, TrendPoint[]> {
  const seed = hashString(city.label + 'replay');
  const rng = seededRandom(seed);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekData7d = days.map((day) => {
    const c = Math.floor(rng() * 35) + 3;
    return {
      hour: day,
      complaints: c,
      transit: Math.floor(c * 0.35),
      weather: Math.floor(c * 0.25),
    };
  });

  const weeks = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'];
  const weekData30d = weeks.map((week) => {
    const c = Math.floor(rng() * 35) + 5;
    return {
      hour: week,
      complaints: c,
      transit: Math.floor(c * 0.35),
      weather: Math.floor(c * 0.25),
    };
  });

  return {
    '24h': generateTrendData(city),
    '7d': weekData7d,
    '30d': weekData30d,
  };
}
