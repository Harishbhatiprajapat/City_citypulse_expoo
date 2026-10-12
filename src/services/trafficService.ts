import type { TrafficIncident } from '@/types';

export interface TrafficProviderConfig {
  provider: 'TomTom' | 'OSM Open Traffic';
  hasApiKey: boolean;
  tileUrlTemplate?: string;
  attribution: string;
}

export function getTrafficProviderConfig(customKey?: string): TrafficProviderConfig {
  const envKey = import.meta.env.VITE_TOMTOM_API_KEY;
  const key = customKey || envKey;

  if (key && key.trim().length > 5) {
    return {
      provider: 'TomTom',
      hasApiKey: true,
      tileUrlTemplate: `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${encodeURIComponent(
        key.trim()
      )}`,
      attribution: '&copy; <a href="https://www.tomtom.com">TomTom</a> Traffic',
    };
  }

  return {
    provider: 'TomTom',
    hasApiKey: false,
    attribution: 'TomTom Live Traffic (API key required)',
  };
}

// In-memory cache for TomTom traffic incidents to prevent API quota depletion
interface TrafficCacheRecord {
  data: { incidents: TrafficIncident[]; notice?: string };
  timestamp: number;
}
const trafficCache = new Map<string, TrafficCacheRecord>();
const TRAFFIC_TTL_MS = 2 * 60 * 1000; // 2 minutes

export function clearTrafficCache() {
  trafficCache.clear();
}

/**
 * Fetches real traffic incidents from TomTom API if key is available
 */
export async function fetchLiveTrafficIncidents(
  lat: number,
  lng: number,
  radiusKm = 10,
  customKey?: string,
  signal?: AbortSignal
): Promise<{ incidents: TrafficIncident[]; notice?: string }> {
  const envKey = import.meta.env.VITE_TOMTOM_API_KEY;
  const key = customKey || envKey;

  if (!key || key.trim().length < 5) {
    return {
      incidents: [],
      notice:
        'Live TomTom traffic incidents require an API key. Add VITE_TOMTOM_API_KEY in Settings or your .env file to view live road probe incidents and real-time flow tiles.',
    };
  }

  const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusKm}_${key.trim()}`;
  const cached = trafficCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < TRAFFIC_TTL_MS) {
    return cached.data;
  }

  // Calculate bounding box in minLon,minLat,maxLon,maxLat
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const minLat = (lat - latDelta).toFixed(4);
  const maxLat = (lat + latDelta).toFixed(4);
  const minLng = (lng - lngDelta).toFixed(4);
  const maxLng = (lng + lngDelta).toFixed(4);

  const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=${minLng},${minLat},${maxLng},${maxLat}&fields={incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code},startTime,endTime,from,to,length}}}&key=${encodeURIComponent(
    key.trim()
  )}`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        return {
          incidents: [],
          notice: 'TomTom API key rejected (401/403). Please verify your key in Settings.',
        };
      }
      return { incidents: [], notice: `TomTom service returned status ${res.status}` };
    }

    const data = await res.json();
    interface RawIncident {
      geometry?: { coordinates?: [number, number][] };
      properties?: {
        magnitudeOfDelay?: number;
        events?: { description?: string }[];
        iconCategory?: number;
        from?: string;
        to?: string;
        startTime?: string;
        endTime?: string;
      };
    }
    const rawIncidents: RawIncident[] = data.incidents || [];
    const formatted: TrafficIncident[] = rawIncidents.map((inc: RawIncident, i: number) => {
      const props = inc.properties || {};
      const delay = props.magnitudeOfDelay || 0;
      const severity =
        delay > 3 ? 'severe' : delay === 3 ? 'major' : delay === 2 ? 'moderate' : 'minor';
      const eventDesc = props.events?.[0]?.description || 'Traffic incident reported';
      const roadClosed = props.iconCategory === 8 || eventDesc.toLowerCase().includes('closed');

      const coords = inc.geometry?.coordinates?.[0] || [lng, lat];
      const iLng = Array.isArray(coords) ? coords[0] : lng;
      const iLat = Array.isArray(coords) ? coords[1] : lat;

      return {
        id: `tt_${i}_${props.startTime || Date.now()}`,
        type: eventDesc,
        description: `${eventDesc}${props.from ? ` near ${props.from}` : ''}${
          props.to ? ` toward ${props.to}` : ''
        }`,
        severity,
        delaySeconds: delay * 180,
        roadClosed,
        startTime: props.startTime || new Date().toISOString(),
        endTime: props.endTime,
        latitude: iLat,
        longitude: iLng,
        roadName: props.from || props.to || undefined,
      };
    });

    const result = { incidents: formatted };
    trafficCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    return {
      incidents: [],
      notice: 'Could not connect to TomTom traffic service.',
    };
  }
}
