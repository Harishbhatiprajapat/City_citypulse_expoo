import type { CivicAlert, ComprehensiveWeather, AirQualityData } from '@/types';

// In-memory cache for official NWS bulletins
interface AlertCacheRecord {
  features: unknown[];
  timestamp: number;
}
const nwsAlertCache = new Map<string, AlertCacheRecord>();
const NWS_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function clearAlertCache() {
  nwsAlertCache.clear();
}

/**
 * Fetches real active official civic and emergency alerts for a location.
 * Uses NWS for US coordinates, and Open-Meteo meteorological anomaly triggers internationally.
 */
export async function fetchCivicAlerts(
  lat: number,
  lng: number,
  weather?: ComprehensiveWeather,
  airQuality?: AirQualityData,
  signal?: AbortSignal
): Promise<CivicAlert[]> {
  const alerts: CivicAlert[] = [];

  // 1. Try US National Weather Service official alerts API with caching
  try {
    const pointKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    let features: unknown[] = [];
    const cached = nwsAlertCache.get(pointKey);

    if (cached && Date.now() - cached.timestamp < NWS_TTL_MS) {
      features = cached.features;
    } else {
      const nwsUrl = `https://api.weather.gov/alerts/active?point=${pointKey}`;
      const res = await fetch(nwsUrl, {
        headers: {
          'User-Agent': 'CityPulse-Civic-Intelligence (contact@citypulse.org)',
          Accept: 'application/geo+json',
        },
        signal,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.features && Array.isArray(data.features)) {
          features = data.features;
          nwsAlertCache.set(pointKey, { features, timestamp: Date.now() });
        }
      }
    }

    for (const feat of features as Array<{ id?: string; properties?: Record<string, string> }>) {
      const p = feat.properties || {};
      let severity: CivicAlert['severity'] = 'advisory';
      const sevStr = (p.severity || '').toLowerCase();
      if (sevStr === 'extreme' || sevStr === 'severe') severity = 'critical';
      else if (sevStr === 'moderate') severity = 'warning';
      else if (p.event?.toLowerCase().includes('watch')) severity = 'watch';

      alerts.push({
        id: feat.id || `nws_${p.sent || Date.now()}`,
        event: p.event || 'Official Public Alert',
        headline: p.headline || p.event || 'Public Safety Alert',
        description: p.description || p.instruction || p.headline || '',
        severity,
        effective: p.effective || p.sent || new Date().toISOString(),
        expires: p.expires || p.ends || undefined,
        source: p.senderName || 'National Weather Service',
        areaDesc: p.areaDesc || 'Affected Municipal Area',
        category: 'weather',
        coordinates: { lat, lng },
      });
    }
  } catch {
    // International location or NWS unavailable
  }

  // 2. Severe Meteorological & Environmental Threshold Alerts (from verified Open-Meteo observations)
  if (weather) {
    // Gale force winds (> 55 km/h)
    if (weather.windSpeed >= 55) {
      alerts.push({
        id: `meteo_wind_${weather.timestamp}`,
        event: 'High Wind Warning',
        headline: `Sustained wind gusts detected at ${weather.windSpeed} km/h`,
        description: `Atmospheric monitoring stations record sustained winds of ${weather.windSpeed} km/h. Risk of fallen tree limbs, minor structural damage, and transit speed restrictions.`,
        severity: weather.windSpeed > 75 ? 'critical' : 'warning',
        effective: weather.timestamp,
        source: 'Open-Meteo High-Resolution Atmospheric Model',
        areaDesc: 'Metro Area',
        category: 'weather',
        coordinates: { lat, lng },
      });
    }

    // Heavy precipitation (> 10mm)
    if (weather.precipitation >= 10) {
      alerts.push({
        id: `meteo_precip_${weather.timestamp}`,
        event: 'Heavy Rainfall & Urban Runoff Advisory',
        headline: `Intense precipitation rate (${weather.precipitation} mm/h)`,
        description: `Surface precipitation has reached ${weather.precipitation} mm/h. Low-lying intersections, underpasses, and road storm drains are at risk of localized water accumulation.`,
        severity: weather.precipitation > 25 ? 'critical' : 'warning',
        effective: weather.timestamp,
        source: 'Open-Meteo Precipitation Radar Observation',
        areaDesc: 'Citywide Drainage Basin',
        category: 'weather',
        coordinates: { lat, lng },
      });
    }

    // Severe thunderstorm (WMO 95-99)
    if (weather.weatherCode >= 95) {
      alerts.push({
        id: `meteo_storm_${weather.timestamp}`,
        event: 'Severe Thunderstorm Warning',
        headline: 'Active thunderstorm with lightning and possible hail',
        description: 'Atmospheric instability producing severe thunderstorm conditions. Exercise caution when travelling outdoors.',
        severity: 'critical',
        effective: weather.timestamp,
        source: 'WMO Meteorological Sensor Network',
        areaDesc: 'Metro Vicinity',
        category: 'weather',
        coordinates: { lat, lng },
      });
    }
  }

  // 3. Air Quality Environmental Alert
  if (airQuality && airQuality.aqi > 150) {
    alerts.push({
      id: `aqi_alert_${airQuality.timestamp}`,
      event: 'Air Quality Health Alert',
      headline: `Unhealthy Air Quality Index (${airQuality.aqi} AQI)`,
      description: `Current air pollution levels have reached ${airQuality.aqi} AQI with fine particulate PM2.5 at ${airQuality.pm2_5} µg/m³. Sensitive groups and outdoor workers should limit prolonged outdoor exertion.`,
      severity: airQuality.aqi > 200 ? 'critical' : 'warning',
      effective: airQuality.timestamp,
      source: 'Copernicus Atmospheric Monitoring Service',
      areaDesc: 'Urban Airshed',
      category: 'public_safety',
      coordinates: { lat, lng },
    });
  }

  return alerts;
}
