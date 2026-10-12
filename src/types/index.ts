export type ZoneStatus = 'normal' | 'watch' | 'alert';

export interface ZoneEvent {
  time: string;
  type: 'complaint' | 'weather' | 'transit' | 'civic';
  text: string;
}

export interface ZoneStat {
  value: string | number;
  trend: 'up' | 'down' | 'flat';
}

export interface Zone {
  id: number;
  name: string;
  city: string;
  status: ZoneStatus;
  coords: { lat: number; lng: number };
  polygon: { lat: number; lng: number }[];
  weather: ZoneStat;
  transit: ZoneStat;
  complaints: ZoneStat;
  severityScore: number;
  recentEvents: ZoneEvent[];
  aiSummary: string;
  correlation: string;
}

export interface TrendPoint {
  hour: string;
  complaints: number;
  transit: number;
  weather: number;
}

export type Theme = 'light' | 'dark';

export type Page =
  | 'overview'
  | 'explore'
  | 'traffic'
  | 'weather'
  | 'forecast'
  | 'alerts'
  | 'routes'
  | 'saved'
  | 'settings'
  | 'ai'
  | 'dashboard'
  | 'login'
  | 'account'
  | 'history'
  | 'about';

export interface CitySearchResult {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  population?: number | null;
  timezone?: string | null;
  label: string;
}

export interface CityInfo {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  label: string;
}

export interface WeatherZoneRaw {
  zoneName: string;
  latitude: number;
  longitude: number;
  current: {
    temperature: number;
    windspeed: number;
    weathercode: number;
    weatherLabel: string;
    precipitation: number;
    humidity: number;
  };
  derived: {
    transitDelay: number;
    complaintCount: number;
    severityScore: number;
    status: ZoneStatus;
    weatherSeverity: number;
  };
  hourly24: TrendPoint[];
  daily7: TrendPoint[];
  daily30: TrendPoint[];
}

export interface WeatherApiResponse {
  zones: WeatherZoneRaw[];
  citySeverity: number;
  trend24h: TrendPoint[];
  anomalyThreshold: number;
  timestamp: string;
  error?: string;
}

export type POICategory =
  | 'restaurants'
  | 'cafes'
  | 'hotels'
  | 'hospitals'
  | 'schools'
  | 'colleges'
  | 'police'
  | 'fire_stations'
  | 'atms'
  | 'banks'
  | 'petrol'
  | 'pharmacies'
  | 'supermarkets'
  | 'shopping'
  | 'parks'
  | 'gyms'
  | 'worship'
  | 'railway_stations'
  | 'bus_stations'
  | 'parking'
  | 'government'
  | 'toilets'
  | 'libraries'
  | 'ev_charging'
  | 'other';

export type MapLayerId =
  | 'weather'
  | 'traffic'
  | 'transit'
  | 'civic_incidents'
  | 'hospitals'
  | 'fire'
  | 'police'
  | 'schools'
  | 'parks'
  | 'roadwork'
  | 'parking'
  | 'waste'
  | 'water'
  | 'power'
  | 'air_quality'
  | 'alerts';

export interface PlacePhoto {
  url: string;
  thumbnailUrl: string;
  title: string;
  attribution?: string;
  license?: string;
  sourceUrl?: string;
}

export interface POIPlace {
  id: string;
  name: string;
  category: POICategory;
  categoryLabel: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  address?: string;
  osmType?: string;
  osmId?: number;
  verified: boolean;
  phone?: string;
  website?: string;
  openingHours?: string;
  operator?: string;
  wheelchair?: string;
  rating?: number;
  reviewsCount?: number;
  photos?: PlacePhoto[];
  tags?: Record<string, string>;
  extratags?: Record<string, string>;
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  name?: string;
}

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng]
  distanceMeters: number;
  durationSeconds: number;
  summary: string;
  steps: RouteStep[];
  originName: string;
  destinationName: string;
}

export interface AirQualityData {
  aqi: number;
  category: 'Good' | 'Moderate' | 'Unhealthy for Sensitive' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
  categoryColor: string;
  pm2_5: number;
  pm10: number;
  co: number;
  no2: number;
  so2: number;
  ozone: number;
  europeanAqi?: number;
  timestamp: string;
}

export interface DailyForecastDay {
  date: string;
  dayName: string;
  weatherCode: number;
  weatherLabel: string;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  windSpeedMax: number;
}

export interface ComprehensiveWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  weatherLabel: string;
  precipitation: number;
  surfacePressure: number;
  uvIndex: number;
  isDay: boolean;
  daily: DailyForecastDay[];
  timestamp: string;
}

export interface CivicAlert {
  id: string;
  event: string;
  headline: string;
  description: string;
  severity: 'critical' | 'warning' | 'watch' | 'advisory';
  effective: string;
  expires?: string;
  source: string;
  areaDesc: string;
  category: 'weather' | 'traffic' | 'public_safety' | 'infrastructure';
  coordinates?: { lat: number; lng: number };
}

export interface TrafficIncident {
  id: string;
  type: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'severe';
  delaySeconds: number;
  roadClosed: boolean;
  startTime: string;
  endTime?: string;
  latitude: number;
  longitude: number;
  roadName?: string;
}

export interface SavedPlace {
  id: string;
  name: string;
  label: string;
  category: string;
  latitude: number;
  longitude: number;
  savedAt: string;
  notes?: string;
}

export interface UserSettings {
  tempUnit: 'C' | 'F';
  distanceUnit: 'km' | 'mi';
  mapStyle: 'dark' | 'standard' | 'satellite';
  tomtomApiKey?: string;
  geminiApiKey?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: { name: string; args: Record<string, unknown>; result?: unknown }[];
  isStreaming?: boolean;
}

// ==========================================
// SEVEN-DAY URBAN FORECAST TYPES
// ==========================================

export interface DailyWeatherForecastDetail {
  date: string;
  dayName: string;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  precipitationSum: number;
  windSpeedMax: number;
  humidityMean: number;
  weatherCode: number;
  weatherLabel: string;
  uvIndexMax: number;
}

export interface DailyAirQualityForecastDetail {
  date: string;
  dayName: string;
  aqiMax: number;
  aqiCategory: AirQualityData['category'];
  categoryColor: string;
  pm2_5: number;
  pm10: number;
  no2: number;
  ozone: number;
  so2: number;
  dominantPollutant: string;
}

export interface DailyTrafficForecastDetail {
  date: string;
  dayName: string;
  isWeekend: boolean;
  congestionIndex: number; // 0 - 100
  congestionLevel: 'Low' | 'Moderate' | 'Heavy' | 'Severe';
  morningPeakHours: string;
  morningDelayMultiplier: number; // e.g. 1.35x
  eveningPeakHours: string;
  eveningDelayMultiplier: number; // e.g. 1.50x
  confidenceScore: number; // e.g. 88%
  sampleSizeDays: number;
  methodology: string;
}

export interface SevenDayUrbanForecast {
  city: CityInfo;
  generatedAt: string;
  dataSource: {
    weather: string;
    airQuality: string;
    traffic: string;
  };
  horizonDays: number;
  weatherDaily: DailyWeatherForecastDetail[];
  airQualityDaily: DailyAirQualityForecastDetail[];
  trafficDaily: DailyTrafficForecastDetail[];
  warnings: CivicAlert[];
  trafficNotice?: string;
}

// ==========================================
// MULTI-ROUTE JOURNEY PLANNER TYPES
// ==========================================

export type TravelMode = 'driving' | 'walking' | 'cycling';
export type RoutePreference = 'fastest' | 'balanced' | 'shortest' | 'weather_aware';

export interface RouteWaypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface RouteWeatherCheckpoint {
  label: string;
  lat: number;
  lng: number;
  temperature: number;
  weatherLabel: string;
  weatherCode: number;
  precipitation: number;
  windSpeed: number;
  estimatedArrivalLocalTime: string;
}

export interface RouteAlternative {
  id: string;
  label: string;
  routePreferenceType: RoutePreference;
  coordinates: [number, number][]; // [lat, lng]
  distanceMeters: number;
  durationSeconds: number;
  trafficDelaySeconds: number;
  departureTime: string;
  estimatedArrivalTime: string;
  summary: string;
  steps: RouteStep[];
  weatherCheckpoints: RouteWeatherCheckpoint[];
  weatherSafetyScore: number; // 0-100
  weatherNotice?: string;
  tollEstimateCurrency?: string;
  tollEstimateAmount?: number;
  incidentsAlongRoute: TrafficIncident[];
  trafficDataSource: string;
  isRecommended: boolean;
}

export interface MultiRouteResult {
  origin: RouteWaypoint;
  destination: RouteWaypoint;
  waypoints: RouteWaypoint[];
  travelMode: TravelMode;
  departureTime: string;
  routes: RouteAlternative[];
  selectedRouteId: string;
  calculatedAt: string;
}

export interface SavedJourney {
  id: string;
  userId?: string;
  originName: string;
  originLat: number;
  originLng: number;
  destName: string;
  destLat: number;
  destLng: number;
  travelMode: TravelMode;
  routePreference: RoutePreference;
  distanceKm: number;
  durationMins: number;
  savedAt: string;
}


