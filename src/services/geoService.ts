import type { CitySearchResult, POICategory, POIPlace } from '@/types';
import { fetchPlacePhotos } from './photoService';

// In-memory cache for search results to avoid redundant network hits
const citySearchCache = new Map<string, CitySearchResult[]>();
const poiSearchCache = new Map<string, POIPlace[]>();
const geocodeCache = new Map<string, { lat: number; lng: number; label: string } | null>();

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface POICategoryMeta {
  id: POICategory;
  label: string;
  osmQuery: string;
  osmClass: string;
  osmKey?: string;
  osmVal?: string;
  iconName: string;
  color: string;
  emoji: string;
}

/**
 * 24 Categories matching Reference Image 1 & User Specifications:
 * Primary 8 visible buttons:
 * - Restaurants, Cafes, Hotels, Hospitals, Schools, Police, ATMs, Petrol
 * Secondary categories in More menu:
 * - Colleges & Universities, Fire Stations, Banks & Financial, Pharmacies,
 *   Supermarkets & Groceries, Shopping Centers & Malls, Parks & Recreation,
 *   Gyms & Fitness Centers, Places of Worship, Railway Stations,
 *   Bus Stations & Terminals, Parking, Government Offices, Public Toilets,
 *   Libraries, EV Charging Stations
 */
export const POI_CATEGORIES: POICategoryMeta[] = [
  // Primary 8 Buttons (Reference Image 1)
  { id: 'restaurants', label: 'Restaurants', osmQuery: 'restaurant', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'restaurant', iconName: 'Utensils', color: '#F59E0B', emoji: '🍴' },
  { id: 'cafes', label: 'Cafes', osmQuery: 'cafe', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'cafe', iconName: 'Coffee', color: '#D97706', emoji: '☕' },
  { id: 'hotels', label: 'Hotels', osmQuery: 'hotel', osmClass: 'tourism', osmKey: 'tourism', osmVal: 'hotel', iconName: 'Hotel', color: '#EC4899', emoji: '🏨' },
  { id: 'hospitals', label: 'Hospitals', osmQuery: 'hospital', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'hospital', iconName: 'Activity', color: '#EF4444', emoji: '🏥' },
  { id: 'schools', label: 'Schools', osmQuery: 'school', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'school', iconName: 'GraduationCap', color: '#8B5CF6', emoji: '🎓' },
  { id: 'police', label: 'Police', osmQuery: 'police', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'police', iconName: 'Shield', color: '#3B82F6', emoji: '🛡️' },
  { id: 'atms', label: 'ATMs', osmQuery: 'atm', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'atm', iconName: 'CreditCard', color: '#10B981', emoji: '💳' },
  { id: 'petrol', label: 'Petrol', osmQuery: 'fuel', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'fuel', iconName: 'Fuel', color: '#F97316', emoji: '⛽' },

  // Secondary categories (More Menu)
  { id: 'colleges', label: 'Colleges & Universities', osmQuery: 'college', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'university', iconName: 'BookOpen', color: '#6366F1', emoji: '🏛️' },
  { id: 'fire_stations', label: 'Fire Stations', osmQuery: 'fire_station', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'fire_station', iconName: 'Flame', color: '#DC2626', emoji: '🚒' },
  { id: 'banks', label: 'Banks & Financial', osmQuery: 'bank', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'bank', iconName: 'Landmark', color: '#059669', emoji: '🏦' },
  { id: 'pharmacies', label: 'Pharmacies', osmQuery: 'pharmacy', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'pharmacy', iconName: 'Cross', color: '#F43F5E', emoji: '💊' },
  { id: 'supermarkets', label: 'Supermarkets & Groceries', osmQuery: 'supermarket', osmClass: 'shop', osmKey: 'shop', osmVal: 'supermarket', iconName: 'ShoppingCart', color: '#14B8A6', emoji: '🛒' },
  { id: 'shopping', label: 'Shopping Centers & Malls', osmQuery: 'mall', osmClass: 'shop', osmKey: 'shop', osmVal: 'mall', iconName: 'ShoppingBag', color: '#A855F7', emoji: '🛍️' },
  { id: 'parks', label: 'Parks & Recreation', osmQuery: 'park', osmClass: 'leisure', osmKey: 'leisure', osmVal: 'park', iconName: 'Trees', color: '#22C55E', emoji: '🌳' },
  { id: 'gyms', label: 'Gyms & Fitness Centers', osmQuery: 'fitness_centre', osmClass: 'leisure', osmKey: 'leisure', osmVal: 'fitness_centre', iconName: 'Dumbbell', color: '#06B6D4', emoji: '🏋️' },
  { id: 'worship', label: 'Places of Worship', osmQuery: 'place_of_worship', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'place_of_worship', iconName: 'Church', color: '#84CC16', emoji: '🕌' },
  { id: 'railway_stations', label: 'Railway Stations', osmQuery: 'station', osmClass: 'railway', osmKey: 'railway', osmVal: 'station', iconName: 'Train', color: '#4F46E5', emoji: '🚆' },
  { id: 'bus_stations', label: 'Bus Stations & Terminals', osmQuery: 'bus_station', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'bus_station', iconName: 'Bus', color: '#0EA5E9', emoji: '🚌' },
  { id: 'parking', label: 'Parking', osmQuery: 'parking', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'parking', iconName: 'SquareParking', color: '#64748B', emoji: '🅿️' },
  { id: 'government', label: 'Government Offices', osmQuery: 'townhall', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'townhall', iconName: 'Building2', color: '#1E3A8A', emoji: '🏛️' },
  { id: 'toilets', label: 'Public Toilets', osmQuery: 'toilets', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'toilets', iconName: 'Bath', color: '#0284C7', emoji: '🚻' },
  { id: 'libraries', label: 'Libraries', osmQuery: 'library', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'library', iconName: 'Book', color: '#7C3AED', emoji: '📚' },
  { id: 'ev_charging', label: 'EV Charging Stations', osmQuery: 'charging_station', osmClass: 'amenity', osmKey: 'amenity', osmVal: 'charging_station', iconName: 'Zap', color: '#10B981', emoji: '⚡' },
  { id: 'other', label: 'Other Places', osmQuery: 'point_of_interest', osmClass: 'historic', osmKey: 'amenity', osmVal: 'point_of_interest', iconName: 'MapPin', color: '#6B7280', emoji: '📍' },
];

export const PRIMARY_POI_CATEGORY_IDS: POICategory[] = [
  'restaurants',
  'cafes',
  'hotels',
  'hospitals',
  'schools',
  'police',
  'atms',
  'petrol',
];

export const SECONDARY_POI_CATEGORY_IDS: POICategory[] = [
  'colleges',
  'fire_stations',
  'banks',
  'pharmacies',
  'supermarkets',
  'shopping',
  'parks',
  'gyms',
  'worship',
  'railway_stations',
  'bus_stations',
  'parking',
  'government',
  'toilets',
  'libraries',
  'ev_charging',
];

export function getCategoryMeta(cat: POICategory): POICategoryMeta {
  return POI_CATEGORIES.find((c) => c.id === cat) || POI_CATEGORIES[POI_CATEGORIES.length - 1];
}

/**
 * Searches worldwide cities with direct Open-Meteo Geocoding, with Supabase fallback.
 */
export async function searchCities(query: string, signal?: AbortSignal): Promise<CitySearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cacheKey = trimmed.toLowerCase();
  if (citySearchCache.has(cacheKey)) {
    return citySearchCache.get(cacheKey)!;
  }

  try {
    const directUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmed
    )}&count=10&language=en&format=json`;

    const res = await fetch(directUrl, { signal });
    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        const formatted: CitySearchResult[] = data.results.map((r: {
          id: number;
          name: string;
          country?: string;
          admin1?: string;
          latitude: number;
          longitude: number;
          population?: number | null;
          timezone?: string | null;
        }) => ({
          id: r.id,
          name: r.name,
          country: r.country || '',
          admin1: r.admin1 || '',
          latitude: r.latitude,
          longitude: r.longitude,
          population: r.population || null,
          timezone: r.timezone || null,
          label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
        }));
        citySearchCache.set(cacheKey, formatted);
        return formatted;
      }
    }
  } catch {
    // direct fetch failed
  }

  return [];
}

/**
 * Geocodes any city, landmark, or address into coordinates using Nominatim & Open-Meteo
 */
export async function geocodeLocation(
  query: string,
  signal?: AbortSignal
): Promise<{ lat: number; lng: number; label: string } | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const cacheKey = trimmed.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    // First try OpenStreetMap Nominatim for exact landmarks / addresses
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed
    )}&limit=1&addressdetails=1`;

    const nomRes = await fetch(nomUrl, {
      headers: {
        'User-Agent': 'CityPulse-Civic-Intelligence/2.0 (OpenGIS)',
        Accept: 'application/json',
      },
      signal,
    });

    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (Array.isArray(nomData) && nomData.length > 0) {
        const item = nomData[0];
        const result = {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          label: item.display_name || trimmed,
        };
        geocodeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // fallback to Open-Meteo
  }

  try {
    const cities = await searchCities(trimmed, signal);
    if (cities.length > 0) {
      const top = cities[0];
      const result = { lat: top.latitude, lng: top.longitude, label: top.label };
      geocodeCache.set(cacheKey, result);
      return result;
    }
  } catch {
    // failed
  }

  geocodeCache.set(cacheKey, null);
  return null;
}

/**
 * Searches real OpenStreetMap facilities using Nominatim around given coordinates
 * Includes extratags=1 to extract authentic phone numbers, websites, and opening hours
 */
export async function searchNearbyPOIs(
  category: POICategory,
  latitude: number,
  longitude: number,
  radiusKm = 5,
  signal?: AbortSignal
): Promise<POIPlace[]> {
  const cacheKey = `${category}_${latitude.toFixed(3)}_${longitude.toFixed(3)}_${radiusKm}`;
  if (poiSearchCache.has(cacheKey)) {
    return poiSearchCache.get(cacheKey)!;
  }

  const categoryMeta = getCategoryMeta(category);
  const osmQuery = categoryMeta.osmQuery;

  // Approximate 1 deg lat ~ 111 km, 1 deg lng ~ 111 * cos(lat) km
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));

  const minLat = latitude - latDelta;
  const maxLat = latitude + latDelta;
  const minLng = longitude - lngDelta;
  const maxLng = longitude + lngDelta;

  const primaryQuery = `[${osmQuery}]`;
  const viewbox = `${minLng.toFixed(4)},${maxLat.toFixed(4)},${maxLng.toFixed(4)},${minLat.toFixed(4)}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    primaryQuery
  )}&viewbox=${viewbox}&bounded=1&limit=30&addressdetails=1&extratags=1`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CityPulse-Civic-Intelligence/2.0 (OpenGIS)',
        Accept: 'application/json',
      },
      signal,
    });

    let data = res.ok ? await res.json() : [];

    // If bracketed category tag query yielded few or no results, fallback to general amenity query
    if (!Array.isArray(data) || data.length < 3) {
      const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        osmQuery
      )}&viewbox=${viewbox}&bounded=1&limit=30&addressdetails=1&extratags=1`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'CityPulse-Civic-Intelligence/2.0 (OpenGIS)',
          Accept: 'application/json',
        },
        signal,
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (Array.isArray(fallbackData) && fallbackData.length > 0) {
          data = Array.isArray(data) ? [...data, ...fallbackData] : fallbackData;
        }
      }
    }

    if (!Array.isArray(data)) return [];

    const seenNames = new Set<string>();
    const places: POIPlace[] = [];

    for (const item of data) {
      const pLat = parseFloat(item.lat);
      const pLng = parseFloat(item.lon);
      if (isNaN(pLat) || isNaN(pLng)) continue;

      const dist = calculateDistanceKm(latitude, longitude, pLat, pLng);
      if (dist > radiusKm * 1.35) continue; // Respect search radius boundary

      const name = item.name || item.display_name?.split(',')[0] || `${categoryMeta.label}`;
      if (seenNames.has(name.toLowerCase())) continue;
      seenNames.add(name.toLowerCase());

      const address = item.display_name;
      const extratags: Record<string, string> = item.extratags || {};

      // Extract genuine contact, website, and opening hours without inventing anything
      const phone = extratags.phone || extratags['contact:phone'] || extratags['contact:mobile'] || undefined;
      const website = extratags.website || extratags['contact:website'] || extratags['url'] || undefined;
      const openingHours = extratags.opening_hours || undefined;
      const operator = extratags.operator || undefined;
      const wheelchair = extratags.wheelchair || undefined;

      places.push({
        id: String(item.place_id || `${pLat}_${pLng}`),
        name,
        category,
        categoryLabel: categoryMeta.label,
        latitude: pLat,
        longitude: pLng,
        distanceKm: dist,
        address,
        osmType: item.osm_type,
        osmId: item.osm_id,
        verified: true,
        phone,
        website,
        openingHours,
        operator,
        wheelchair,
        tags: {
          class: item.class,
          type: item.type,
        },
        extratags,
      });
    }

    // Overpass API fallback if Nominatim returned 0 results
    if (places.length === 0) {
      const overpassPlaces = await fetchOverpassPOIs(categoryMeta, latitude, longitude, radiusKm, signal);
      if (overpassPlaces.length > 0) {
        places.push(...overpassPlaces);
      }
    }

    places.sort((a, b) => a.distanceKm - b.distanceKm);
    poiSearchCache.set(cacheKey, places);
    return places;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    // Attempt Overpass on Nominatim network failure
    try {
      return await fetchOverpassPOIs(categoryMeta, latitude, longitude, radiusKm, signal);
    } catch {
      return [];
    }
  }
}

/**
 * Secondary OpenStreetMap provider: Overpass API for deep GIS coverage
 */
async function fetchOverpassPOIs(
  categoryMeta: POICategoryMeta,
  latitude: number,
  longitude: number,
  radiusKm: number,
  signal?: AbortSignal
): Promise<POIPlace[]> {
  try {
    const radiusMeters = Math.min(Math.round(radiusKm * 1000), 10000);
    const key = categoryMeta.osmKey || 'amenity';
    const val = categoryMeta.osmVal || categoryMeta.osmQuery;
    const overpassQuery = `[out:json][timeout:8];(node["${key}"="${val}"](around:${radiusMeters},${latitude},${longitude});way["${key}"="${val}"](around:${radiusMeters},${latitude},${longitude}););out center 25;`;
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.elements || !Array.isArray(data.elements)) return [];

    const places: POIPlace[] = [];
    const seen = new Set<string>();

    for (const el of data.elements) {
      const pLat = el.lat ?? el.center?.lat;
      const pLng = el.lon ?? el.center?.lon;
      if (typeof pLat !== 'number' || typeof pLng !== 'number') continue;

      const dist = calculateDistanceKm(latitude, longitude, pLat, pLng);
      if (dist > radiusKm * 1.1) continue;

      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || `${categoryMeta.label}`;
      if (seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());

      const phone = tags.phone || tags['contact:phone'] || undefined;
      const website = tags.website || tags['contact:website'] || undefined;
      const openingHours = tags.opening_hours || undefined;
      const operator = tags.operator || undefined;

      places.push({
        id: `overpass_${el.id}`,
        name,
        category: categoryMeta.id,
        categoryLabel: categoryMeta.label,
        latitude: pLat,
        longitude: pLng,
        distanceKm: dist,
        address: tags['addr:full'] || [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ') || undefined,
        osmType: el.type,
        osmId: el.id,
        verified: true,
        phone,
        website,
        openingHours,
        operator,
        extratags: tags,
      });
    }

    places.sort((a, b) => a.distanceKm - b.distanceKm);
    return places;
  } catch {
    return [];
  }
}

/**
 * Searches places by free text (landmark, address, or name) within an optional bounding viewbox
 */
export async function searchPlacesFree(
  query: string,
  latitude: number,
  longitude: number,
  radiusKm = 10,
  signal?: AbortSignal
): Promise<POIPlace[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Approximate viewbox
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));
  const minLat = latitude - latDelta;
  const maxLat = latitude + latDelta;
  const minLng = longitude - lngDelta;
  const maxLng = longitude + lngDelta;

  const viewbox = `${minLng.toFixed(4)},${maxLat.toFixed(4)},${maxLng.toFixed(4)},${minLat.toFixed(4)}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    trimmed
  )}&viewbox=${viewbox}&limit=20&addressdetails=1&extratags=1`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CityPulse-Civic-Intelligence/2.0 (OpenGIS)',
        Accept: 'application/json',
      },
      signal,
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item) => {
      const pLat = parseFloat(item.lat);
      const pLng = parseFloat(item.lon);
      const dist = calculateDistanceKm(latitude, longitude, pLat, pLng);
      const extratags: Record<string, string> = item.extratags || {};

      // Determine category from class/type
      let cat: POICategory = 'other';
      const c = (item.class || '').toLowerCase();
      const t = (item.type || '').toLowerCase();

      if (t.includes('hospital') || t.includes('clinic')) cat = 'hospitals';
      else if (t.includes('police')) cat = 'police';
      else if (t.includes('school') || t.includes('college') || t.includes('university')) cat = 'schools';
      else if (c === 'tourism' || t.includes('hotel')) cat = 'hotels';
      else if (t.includes('restaurant') || t.includes('cafe') || t.includes('fast_food')) cat = 'restaurants';
      else if (t.includes('pharmacy')) cat = 'pharmacies';
      else if (c === 'leisure' || t.includes('park') || t.includes('garden')) cat = 'parks';
      else if (t.includes('bus')) cat = 'bus_stations';
      else if (t.includes('station') || t.includes('railway')) cat = 'railway_stations';
      else if (t.includes('bank') || t.includes('atm')) cat = 'atms';
      else if (t.includes('townhall') || t.includes('government') || c === 'government') cat = 'government';

      const meta = getCategoryMeta(cat);

      return {
        id: String(item.place_id || `${pLat}_${pLng}`),
        name: item.name || item.display_name?.split(',')[0] || trimmed,
        category: cat,
        categoryLabel: meta.label,
        latitude: pLat,
        longitude: pLng,
        distanceKm: dist,
        address: item.display_name,
        osmType: item.osm_type,
        osmId: item.osm_id,
        verified: true,
        phone: extratags.phone || extratags['contact:phone'] || undefined,
        website: extratags.website || extratags['contact:website'] || undefined,
        openingHours: extratags.opening_hours || undefined,
        operator: extratags.operator || undefined,
        wheelchair: extratags.wheelchair || undefined,
        extratags,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Loads authentic photos for a specific POIPlace
 */
export async function populatePlacePhotos(place: POIPlace, cityName: string): Promise<POIPlace> {
  if (place.photos && place.photos.length > 0) return place;
  const photos = await fetchPlacePhotos(place.name, cityName, place.extratags);
  return { ...place, photos };
}

export interface LiveUserLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  cityName: string;
  country: string;
  admin1: string;
  label: string;
  source: 'gps_high' | 'gps_standard' | 'network_ip';
}

/**
 * Resilient live geolocation detection:
 * 1. Attempts High-Accuracy GPS (5s timeout)
 * 2. If it times out or errors (typical on desktop/laptops), falls back to Standard GPS (8s timeout, 5 min cache)
 * 3. If browser permissions denied or unavailable, falls back to IP geolocation (freeipapi.com)
 * 4. Reverse geocodes the coordinates via Nominatim to produce exact city/neighborhood
 */
export async function getLiveUserLocation(): Promise<LiveUserLocationResult> {
  let lat: number | null = null;
  let lng: number | null = null;
  let accuracy = 100;
  let source: LiveUserLocationResult['source'] = 'gps_standard';

  // Helper for navigator.geolocation wrapped in promise with configurable options
  const tryBrowserGeo = (options: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  // Step 1: Try browser geolocation with high accuracy
  try {
    const pos = await tryBrowserGeo({
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 60000,
    });
    lat = pos.coords.latitude;
    lng = pos.coords.longitude;
    accuracy = pos.coords.accuracy || 25;
    source = 'gps_high';
  } catch {
    // Step 2: Try browser geolocation with standard accuracy (Wi-Fi / Cell network)
    try {
      const pos = await tryBrowserGeo({
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      accuracy = pos.coords.accuracy || 1200;
      source = 'gps_standard';
    } catch {
      // Step 3: Fast IP-based geolocation fallback
      try {
        const ipRes = await fetch('https://freeipapi.com/api/json');
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData.latitude && ipData.longitude) {
            lat = Number(ipData.latitude);
            lng = Number(ipData.longitude);
            accuracy = 4000;
            source = 'network_ip';
          }
        }
      } catch {
        // Fallback default
      }
    }
  }

  // If all providers failed, default to Jaipur baseline
  if (lat === null || lng === null) {
    lat = 26.9124;
    lng = 75.7873;
    accuracy = 5000;
    source = 'network_ip';
  }

  // Step 4: Reverse geocode coordinates via Nominatim
  let cityName = 'Current Location';
  let country = 'India';
  let admin1 = '';
  let label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  try {
    const revRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
      { headers: { 'User-Agent': 'CityPulse-Civic/2.0' } }
    );
    if (revRes.ok) {
      const revData = await revRes.json();
      cityName =
        revData.address?.city ||
        revData.address?.town ||
        revData.address?.suburb ||
        revData.address?.municipality ||
        revData.address?.village ||
        revData.name ||
        'Current Location';
      country = revData.address?.country || '';
      admin1 = revData.address?.state || '';
      label = [cityName, admin1, country].filter(Boolean).join(', ');
    }
  } catch {
    label = `${cityName} (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
  }

  return {
    latitude: lat,
    longitude: lng,
    accuracy,
    cityName,
    country,
    admin1,
    label,
    source,
  };
}

