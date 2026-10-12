import type { Zone, TrendPoint } from '@/types';

export const cities = [
  'San Francisco',
  'New York',
  'Chicago',
  'Los Angeles',
  'Seattle',
  'Boston',
  'Austin',
  'Denver',
  'Portland',
  'Miami',
  'Atlanta',
  'San Diego',
];

export const zones: Zone[] = [
  {
    id: 1,
    name: 'Downtown',
    city: 'San Francisco',
    status: 'alert',
    coords: { lat: 37.7849, lng: -122.4094 },
    polygon: [
      { lat: 37.7849, lng: -122.4094 },
      { lat: 37.7949, lng: -122.4094 },
      { lat: 37.7949, lng: -122.3994 },
      { lat: 37.7849, lng: -122.3994 },
    ],
    weather: { value: 'Storm Warning', trend: 'up' },
    transit: { value: '12 min avg delay', trend: 'up' },
    complaints: { value: 34, trend: 'up' },
    severityScore: 82,
    recentEvents: [
      { time: '10:42 AM', type: 'complaint', text: 'Flooding reported on Main St near 5th' },
      { time: '10:28 AM', type: 'weather', text: 'Heavy rainfall alert issued for downtown area' },
      { time: '10:15 AM', type: 'transit', text: 'Muni Line 14 detoured due to standing water' },
      { time: '09:58 AM', type: 'complaint', text: 'Power outage reported at Market & Powell' },
      { time: '09:41 AM', type: 'civic', text: 'Emergency road repair dispatched to Howard St' },
    ],
    aiSummary:
      'Downtown is experiencing a severe weather event with cascading civic impacts. Heavy rainfall has triggered localized flooding, which in turn is driving a spike in citizen complaints about road conditions and power infrastructure. Transit delays are worsening as buses are forced to detour around flooded streets. The situation is likely to persist for the next 4-6 hours based on current weather patterns.',
    correlation:
      'Strong correlation detected between weather alert (r=0.91) and complaint volume. Transit delays show a secondary correlation (r=0.73) with the weather event, mediated by road flooding. The 24% complaint spike above baseline aligns with the onset of storm conditions at 6:00 AM.',
  },
  {
    id: 2,
    name: 'Riverside',
    city: 'San Francisco',
    status: 'watch',
    coords: { lat: 37.7719, lng: -122.4134 },
    polygon: [
      { lat: 37.7719, lng: -122.4134 },
      { lat: 37.7819, lng: -122.4134 },
      { lat: 37.7819, lng: -122.4034 },
      { lat: 37.7719, lng: -122.4034 },
    ],
    weather: { value: 'Heavy Rain', trend: 'up' },
    transit: { value: '5 min avg delay', trend: 'flat' },
    complaints: { value: 12, trend: 'up' },
    severityScore: 58,
    recentEvents: [
      { time: '10:35 AM', type: 'complaint', text: 'Pothole on Embarcadero near Ferry Building' },
      { time: '10:12 AM', type: 'weather', text: 'Wind advisory issued for bayfront areas' },
      { time: '09:50 AM', type: 'complaint', text: 'Debris on bike lane near Townsend St' },
      { time: '09:30 AM', type: 'transit', text: 'Ferry service running 5 min behind schedule' },
      { time: '09:05 AM', type: 'civic', text: 'Storm drain inspection on King St completed' },
    ],
    aiSummary:
      'Riverside is under a watch condition. Rainfall is intensifying but has not yet caused significant disruption. Complaint volume is trending upward but remains within normal range. The area is vulnerable to bayfront wind gusts and minor flooding if precipitation continues at current rates.',
    correlation:
      'Moderate correlation between weather intensity and complaint volume (r=0.62). Transit impact is minimal so far, suggesting drainage infrastructure is holding. No anomalous patterns detected yet.',
  },
  {
    id: 3,
    name: 'Northside',
    city: 'San Francisco',
    status: 'normal',
    coords: { lat: 37.7949, lng: -122.4200 },
    polygon: [
      { lat: 37.7949, lng: -122.4200 },
      { lat: 37.8049, lng: -122.4200 },
      { lat: 37.8049, lng: -122.4100 },
      { lat: 37.7949, lng: -122.4100 },
    ],
    weather: { value: 'Partly Cloudy', trend: 'down' },
    transit: { value: 'On time', trend: 'flat' },
    complaints: { value: 3, trend: 'down' },
    severityScore: 18,
    recentEvents: [
      { time: '09:45 AM', type: 'complaint', text: 'Illegal parking reported on Columbus Ave' },
      { time: '09:20 AM', type: 'civic', text: 'Street sweeping completed on Bay St' },
      { time: '08:55 AM', type: 'transit', text: 'Route 30 running on schedule' },
      { time: '08:30 AM', type: 'complaint', text: 'Noise complaint near Fishermans Wharf' },
      { time: '08:10 AM', type: 'weather', text: 'Cloud cover clearing, no alerts' },
    ],
    aiSummary:
      'Northside is operating normally across all data feeds. Weather conditions are stable and improving. Transit is on schedule, and complaint volume is well below the zone baseline. No anomalies detected.',
    correlation:
      'No significant correlations detected. All data feeds are within normal parameters. Complaint volume is 40% below the 30-day average for this zone.',
  },
  {
    id: 4,
    name: 'West End',
    city: 'San Francisco',
    status: 'watch',
    coords: { lat: 37.7649, lng: -122.4384 },
    polygon: [
      { lat: 37.7649, lng: -122.4384 },
      { lat: 37.7749, lng: -122.4384 },
      { lat: 37.7749, lng: -122.4284 },
      { lat: 37.7649, lng: -122.4284 },
    ],
    weather: { value: 'Overcast', trend: 'flat' },
    transit: { value: '3 min avg delay', trend: 'up' },
    complaints: { value: 8, trend: 'up' },
    severityScore: 41,
    recentEvents: [
      { time: '10:20 AM', type: 'complaint', text: 'Broken streetlight on Irving St' },
      { time: '09:55 AM', type: 'transit', text: 'N-Judah delayed due to signal malfunction' },
      { time: '09:35 AM', type: 'complaint', text: 'Graffiti reported on 9th Ave underpass' },
      { time: '09:15 AM', type: 'civic', text: 'Tree trimming scheduled for Sunset Blvd' },
      { time: '08:50 AM', type: 'weather', text: 'Fog rolling in from the west, visibility reduced' },
    ],
    aiSummary:
      'West End is under a watch condition due to rising transit delays and a modest increase in complaints. Fog is reducing visibility in the western corridors. The N-Judah signal issue is localized but may cascade if not resolved within the hour.',
    correlation:
      'Weak correlation between transit delays and complaint volume (r=0.38). The signal malfunction appears to be an isolated infrastructure issue rather than a weather-mediated event.',
  },
];

export const trendData: TrendPoint[] = [
  { hour: '00:00', complaints: 8, transit: 2, weather: 1 },
  { hour: '02:00', complaints: 5, transit: 1, weather: 0 },
  { hour: '04:00', complaints: 3, transit: 1, weather: 0 },
  { hour: '06:00', complaints: 7, transit: 3, weather: 2 },
  { hour: '08:00', complaints: 18, transit: 8, weather: 5 },
  { hour: '10:00', complaints: 34, transit: 12, weather: 9 },
  { hour: '12:00', complaints: 28, transit: 10, weather: 7 },
  { hour: '14:00', complaints: 22, transit: 7, weather: 5 },
  { hour: '16:00', complaints: 19, transit: 6, weather: 3 },
  { hour: '18:00', complaints: 15, transit: 5, weather: 2 },
  { hour: '20:00', complaints: 11, transit: 3, weather: 1 },
  { hour: '22:00', complaints: 7, transit: 2, weather: 1 },
];

export const ANOMALY_THRESHOLD = 25;

export const historicalReplayData: Record<string, TrendPoint[]> = {
  '7d': [
    { hour: 'Mon', complaints: 15, transit: 4, weather: 2 },
    { hour: 'Tue', complaints: 22, transit: 7, weather: 4 },
    { hour: 'Wed', complaints: 34, transit: 12, weather: 9 },
    { hour: 'Thu', complaints: 28, transit: 10, weather: 7 },
    { hour: 'Fri', complaints: 19, transit: 6, weather: 3 },
    { hour: 'Sat', complaints: 12, transit: 3, weather: 1 },
    { hour: 'Sun', complaints: 8, transit: 2, weather: 0 },
  ],
  '30d': [
    { hour: 'Wk 1', complaints: 14, transit: 4, weather: 2 },
    { hour: 'Wk 2', complaints: 18, transit: 5, weather: 3 },
    { hour: 'Wk 3', complaints: 31, transit: 11, weather: 8 },
    { hour: 'Wk 4', complaints: 24, transit: 8, weather: 5 },
  ],
  '24h': trendData,
};

export const feedSources = [
  { name: 'Weather API', status: 'Connected', icon: 'cloud' },
  { name: 'Transit Feed', status: 'Connected', icon: 'bus' },
  { name: 'Civic Reports', status: 'Connected', icon: 'message' },
];

export const cityZoneMap: Record<string, { lat: number; lng: number }[]> = {
  'San Francisco': [
    { lat: 37.7849, lng: -122.4094 },
    { lat: 37.7719, lng: -122.4134 },
    { lat: 37.7949, lng: -122.4200 },
    { lat: 37.7649, lng: -122.4384 },
  ],
  'New York': [
    { lat: 40.7589, lng: -73.9851 },
    { lat: 40.7282, lng: -74.0776 },
    { lat: 40.7831, lng: -73.9712 },
    { lat: 40.7505, lng: -73.9934 },
  ],
  Chicago: [
    { lat: 41.8781, lng: -87.6298 },
    { lat: 41.8538, lng: -87.6661 },
    { lat: 41.9214, lng: -87.6513 },
    { lat: 41.8902, lng: -87.6794 },
  ],
  'Los Angeles': [
    { lat: 34.0407, lng: -118.2468 },
    { lat: 34.0259, lng: -118.2817 },
    { lat: 34.0928, lng: -118.3281 },
    { lat: 34.0195, lng: -118.4912 },
  ],
};
