import type { AIMessage, CityInfo, POICategory } from '@/types';
import { searchNearbyPOIs, POI_CATEGORIES, geocodeLocation } from './geoService';
import { fetchComprehensiveWeather, fetchAirQuality } from './weatherService';
import { fetchCivicAlerts } from './alertService';
import { calculateRoadRoute } from './routingService';
import { fetchSevenDayUrbanForecast } from './forecastService';
import { fetchLiveTrafficIncidents } from './trafficService';

export interface StructuredMapAction {
  type: 'search_nearby' | 'set_map_location' | 'calculate_route' | 'clear_search' | 'get_current_location';
  payload: Record<string, unknown>;
}

export interface AssistantResponse extends AIMessage {
  action?: StructuredMapAction;
  error?: boolean;
}

export interface ToolExecutionContext {
  city: CityInfo;
  geminiApiKey?: string;
  tomtomApiKey?: string;
  conversationHistory?: AIMessage[];
}

/**
 * Robust Google Gemini Client with Timeout, Error Code Classification & Retry
 */
async function callGeminiModel(
  userPrompt: string,
  systemContext: string,
  apiKey: string,
  history: AIMessage[] = []
): Promise<string> {
  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    apiKey.trim()
  )}`;

  // Format conversational contents
  const contents = history.slice(-6).map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  // Append latest user prompt
  contents.push({
    role: 'user',
    parts: [{ text: userPrompt }],
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemContext }],
        },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('Google Gemini API authentication failed. Please verify that your VITE_GEMINI_API_KEY is valid in Settings.');
      }
      if (res.status === 429) {
        throw new Error('Gemini API rate limit reached (429 Quota Exceeded). Please wait a moment and tap Retry.');
      }
      throw new Error(`Google Gemini service returned HTTP ${res.status}.`);
    }

    const data = await res.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText || replyText.trim().length === 0) {
      throw new Error('Received an empty response from the AI model.');
    }

    return replyText.trim();
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('AI request timed out after 14 seconds. Please check your connection and tap Retry.');
    }
    throw err;
  }
}

/**
 * Executes a CityPulse-Aware Assistant Query
 * Retrieves actual application telemetry, grounds the model or provides deterministic response,
 * and emits structured, validated map actions.
 */
export async function executeCityAssistantQuery(
  userQuery: string,
  context: ToolExecutionContext
): Promise<AssistantResponse> {
  const query = userQuery.trim();
  if (!query) {
    throw new Error('Empty query provided. Please type a question or command.');
  }

  const qLower = query.toLowerCase();
  const { city, geminiApiKey, tomtomApiKey, conversationHistory = [] } = context;
  const toolCalls: { name: string; args: Record<string, unknown>; result?: unknown }[] = [];

  let mapAction: StructuredMapAction | undefined = undefined;

  // 1. Natural-Language Map Navigation Action ("Change location to Mumbai", "Move map to Delhi")
  const moveMatch = query.match(
    /(?:show|change location to|move map to|move the map to|go to|center on|switch to)\s+([^,.]+?)(?:\s+on the map)?$/i
  );
  const isCategoryWord = POI_CATEGORIES.some(
    (c) => qLower.includes(c.id) || qLower.includes(c.label.toLowerCase())
  );

  if (moveMatch && !isCategoryWord) {
    const destName = moveMatch[1].trim();
    const geo = await geocodeLocation(destName);
    if (geo) {
      const cityName = geo.label.split(',')[0].trim();
      toolCalls.push({
        name: 'set_map_location',
        args: { query: destName, resolvedCity: cityName, coordinates: [geo.lat, geo.lng] },
      });
      mapAction = {
        type: 'set_map_location',
        payload: { name: cityName, lat: geo.lat, lng: geo.lng },
      };

      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `🗺️ **Map centered on ${cityName}** (${geo.lat.toFixed(4)}° N, ${geo.lng.toFixed(4)}° E).\nLive geospatial layers, environmental sensors, and civic indicators have synchronized with this region.`,
        timestamp: new Date().toISOString(),
        toolCalls,
        action: mapAction,
      };
    }
  }

  // 2. Nearby Amenities (Hospitals, Police, Schools, Pharmacies, etc.)
  const matchedCategory = POI_CATEGORIES.find(
    (c) =>
      qLower.includes(c.id) ||
      qLower.includes(c.label.toLowerCase()) ||
      (c.id === 'hospitals' && (qLower.includes('hospital') || qLower.includes('clinic') || qLower.includes('doctor') || qLower.includes('medical') || /\ber\b/.test(qLower))) ||
      (c.id === 'police' && (qLower.includes('police') || qLower.includes('precinct') || /\bcop\b/.test(qLower))) ||
      (c.id === 'schools' && (qLower.includes('school') || qLower.includes('college') || qLower.includes('university'))) ||
      (c.id === 'pharmacies' && (qLower.includes('pharmacy') || qLower.includes('drugstore') || qLower.includes('chemist'))) ||
      (c.id === 'hotels' && (qLower.includes('hotel') || qLower.includes('motel') || qLower.includes('lodging'))) ||
      (c.id === 'restaurants' && (qLower.includes('restaurant') || qLower.includes('dining') || qLower.includes('cafe'))) ||
      (c.id === 'atms' && (qLower.includes('atm') || qLower.includes('bank') || qLower.includes('cash machine'))) ||
      (c.id === 'bus_stations' && (qLower.includes('bus stand') || qLower.includes('bus station') || qLower.includes('bus stop'))) ||
      (c.id === 'railway_stations' && (qLower.includes('railway') || qLower.includes('train station') || qLower.includes('metro station'))) ||
      (c.id === 'government' && (qLower.includes('government') || qLower.includes('municipal') || qLower.includes('court') || qLower.includes('collectorate'))) ||
      (c.id === 'parks' && (qLower.includes('park') || qLower.includes('garden') || qLower.includes('playground')))
  );

  const radiusMatch = qLower.match(/(\d+)\s*(?:km|kilos|kilometers|miles)?/);
  const requestedRadius = radiusMatch ? Math.min(25, Math.max(1, parseInt(radiusMatch[1], 10))) : 5;

  if (matchedCategory) {
    // Check if target location is a landmark near the city
    const landmarkMatch = query.match(/(?:around|near|within\s+\d+\s*km\s+of)\s+([A-Z0-9\s]+?)(?:\s+(?:within|\d|in)|$)/i);
    let searchLat = city.latitude;
    let searchLng = city.longitude;
    let searchLabel = city.name;

    if (landmarkMatch && landmarkMatch[1].trim().length > 3 && !landmarkMatch[1].toLowerCase().includes('me')) {
      const geo = await geocodeLocation(landmarkMatch[1].trim());
      if (geo) {
        searchLat = geo.lat;
        searchLng = geo.lng;
        searchLabel = geo.label.split(',')[0];
      }
    }

    const pois = await searchNearbyPOIs(matchedCategory.id, searchLat, searchLng, requestedRadius);
    toolCalls.push({
      name: 'search_nearby_facilities',
      args: { category: matchedCategory.id, radiusKm: requestedRadius, center: searchLabel },
      result: { count: pois.length, topMatches: pois.slice(0, 5) },
    });

    mapAction = {
      type: 'search_nearby',
      payload: {
        category: matchedCategory.id,
        radiusKm: requestedRadius,
        center: { lat: searchLat, lng: searchLng, name: searchLabel },
      },
    };

    if (pois.length === 0) {
      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `I searched verified OpenStreetMap geospatial records within **${requestedRadius} km** of **${searchLabel}**, but found **0 verified ${matchedCategory.label.toLowerCase()}** in this query radius. You can widen the search radius or explore neighboring sectors.`,
        timestamp: new Date().toISOString(),
        toolCalls,
        action: mapAction,
      };
    }

    const listText = pois
      .slice(0, 5)
      .map(
        (p, i) =>
          `${i + 1}. **${p.name}** &mdash; ${p.distanceKm} km away\n   *Address:* ${p.address?.split(',').slice(0, 3).join(',') || `Coords: ${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`}`
      )
      .join('\n\n');

    return {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: `Found **${pois.length} verified ${matchedCategory.label}** within **${requestedRadius} km** of **${searchLabel}**:\n\n${listText}\n\n*These points of interest have been mapped as interactive category badges.*`,
      timestamp: new Date().toISOString(),
      toolCalls,
      action: mapAction,
    };
  }

  // 3. Seven-Day Urban Forecast Query
  if (qLower.includes('7-day') || qLower.includes('seven day') || qLower.includes('weekly forecast') || qLower.includes('horizon forecast')) {
    const forecastData = await fetchSevenDayUrbanForecast(city, tomtomApiKey);
    toolCalls.push({
      name: 'get_seven_day_urban_forecast',
      args: { city: city.name, horizonDays: 7 },
      result: { days: forecastData.weatherDaily.length, alerts: forecastData.warnings.length },
    });

    const summaryText = forecastData.weatherDaily
      .slice(0, 5)
      .map((d, i) => `* **${d.dayName} (${d.date}):** ${d.weatherLabel}, Max: ${d.tempMax}°C, Min: ${d.tempMin}°C, Rain Prob: ${d.precipitationProbability}%, AQI: ${forecastData.airQualityDaily[i]?.aqiMax || 'N/A'}`)
      .join('\n');

    return {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: `Here is the **7-Day Urban Intelligence Forecast** for **${city.label}**:\n\n${summaryText}\n\n*Source: Open-Meteo Atmospheric Model & Copernicus CAMS Air Quality. For full interactive charts and corridor congestion patterns, open the Urban Forecast tab.*`,
      timestamp: new Date().toISOString(),
      toolCalls,
    };
  }

  // 4. Weather & Air Quality Analysis
  if (
    qLower.includes('weather') ||
    qLower.includes('temperature') ||
    qLower.includes('aqi') ||
    qLower.includes('air quality') ||
    qLower.includes('pollution') ||
    qLower.includes('pm2.5') ||
    qLower.includes('rain')
  ) {
    const [weather, aqi] = await Promise.all([
      fetchComprehensiveWeather(city.latitude, city.longitude),
      fetchAirQuality(city.latitude, city.longitude),
    ]);

    toolCalls.push({
      name: 'get_weather_and_aqi',
      args: { latitude: city.latitude, longitude: city.longitude, city: city.name },
      result: { weather, aqi },
    });

    return {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: `Current live environmental observations for **${city.label}**:\n\n* **Weather:** ${weather.weatherLabel}, **${weather.temperature}°C** (Feels like ${weather.apparentTemperature}°C)\n* **Wind:** ${weather.windSpeed} km/h &bull; **Humidity:** ${weather.humidity}% &bull; **Precipitation:** ${weather.precipitation} mm\n* **Air Quality Index:** **${aqi.aqi} US AQI (${aqi.category})**\n* **Pollutant Concentrations:** PM2.5: ${aqi.pm2_5} µg/m³, PM10: ${aqi.pm10} µg/m³, O₃: ${aqi.ozone} µg/m³, NO₂: ${aqi.no2} µg/m³\n\n*Data retrieved from Open-Meteo High-Resolution Forecasting & Copernicus CAMS Atmospheric Sensors.*`,
      timestamp: new Date().toISOString(),
      toolCalls,
    };
  }

  // 5. Civic Alerts & Warnings
  if (
    qLower.includes('alert') ||
    qLower.includes('warning') ||
    qLower.includes('advisory') ||
    qLower.includes('incident') ||
    qLower.includes('emergency') ||
    qLower.includes('hazard')
  ) {
    const [weather, aqi] = await Promise.all([
      fetchComprehensiveWeather(city.latitude, city.longitude).catch(() => undefined),
      fetchAirQuality(city.latitude, city.longitude).catch(() => undefined),
    ]);
    const alerts = await fetchCivicAlerts(city.latitude, city.longitude, weather, aqi);

    toolCalls.push({
      name: 'get_civic_alerts',
      args: { city: city.name, coordinates: [city.latitude, city.longitude] },
      result: { count: alerts.length, alerts },
    });

    if (alerts.length === 0) {
      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `There are currently **no active critical alerts** reported for **${city.label}**. All primary atmospheric sensors and public safety metrics are operating within normal baseline limits.`,
        timestamp: new Date().toISOString(),
        toolCalls,
      };
    }

    const alertSummary = alerts
      .slice(0, 4)
      .map(
        (a, i) =>
          `${i + 1}. **[${a.severity.toUpperCase()}] ${a.event}**\n   *Headline:* ${a.headline}\n   *Source:* ${a.source}\n   *Effective:* ${new Date(a.effective).toLocaleString()}`
      )
      .join('\n\n');

    return {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: `I identified **${alerts.length} active verified alert(s)** for **${city.name}**:\n\n${alertSummary}\n\n*Review complete emergency instructions in the Civic Alerts tab.*`,
      timestamp: new Date().toISOString(),
      toolCalls,
    };
  }

  // 6. Traffic Intelligence Query
  if (qLower.includes('traffic') || qLower.includes('congestion') || qLower.includes('road closure') || qLower.includes('jam')) {
    const traffic = await fetchLiveTrafficIncidents(city.latitude, city.longitude, 10, tomtomApiKey);
    toolCalls.push({
      name: 'get_traffic_incidents',
      args: { city: city.name, radiusKm: 10 },
      result: { incidentsCount: traffic.incidents.length, notice: traffic.notice },
    });

    if (traffic.incidents.length > 0) {
      const incList = traffic.incidents
        .slice(0, 4)
        .map((inc, i) => `${i + 1}. **${inc.type}** (${inc.severity} delay: ~${Math.round(inc.delaySeconds / 60)} mins)\n   ${inc.description}`)
        .join('\n\n');

      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Active traffic conditions for **${city.name}**:\n\n${incList}\n\n*Source: TomTom Real-Time Road Probe Telemetry.*`,
        timestamp: new Date().toISOString(),
        toolCalls,
      };
    }

    return {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: traffic.notice
        ? `Traffic telemetry status for **${city.name}**:\n\n${traffic.notice}`
        : `Traffic flow across primary arterial corridors in **${city.name}** is currently operating smoothly with 0 major bottleneck incidents reported.`,
      timestamp: new Date().toISOString(),
      toolCalls,
    };
  }

  // 7. Route / Direction Planning
  if (
    qLower.includes('route') ||
    qLower.includes('directions') ||
    qLower.includes('navigate') ||
    qLower.includes('how to get to') ||
    qLower.includes('drive to')
  ) {
    const targetQuery = query
      .replace(/.*(?:route to|directions to|navigate to|drive to|how to get to)\s+/i, '')
      .replace(/\b(please|on the map)\b/gi, '')
      .trim();

    if (targetQuery && targetQuery.length > 2) {
      const geo = await geocodeLocation(targetQuery);
      if (geo) {
        const destClean = geo.label.split(',')[0];
        const routeRes = await calculateRoadRoute(
          city.latitude,
          city.longitude,
          geo.lat,
          geo.lng,
          `${city.name} Center`,
          destClean
        );

        toolCalls.push({
          name: 'calculate_route',
          args: { origin: `${city.name} Center`, destination: destClean },
          result: { distanceKm: (routeRes.distanceMeters / 1000).toFixed(1), durationMins: Math.round(routeRes.durationSeconds / 60) },
        });

        mapAction = {
          type: 'calculate_route',
          payload: { destination: destClean, lat: geo.lat, lng: geo.lng },
        };

        return {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `🚗 **Navigable road route plotted to ${destClean}**:\n\n* **Distance:** ${(routeRes.distanceMeters / 1000).toFixed(1)} km\n* **Estimated Driving Duration:** ${Math.round(routeRes.durationSeconds / 60)} minutes\n* **Corridor Summary:** ${routeRes.steps.slice(0, 3).map((s) => s.instruction).join(' → ')}...\n\n*Route rendered on the interactive map canvas. Open the Routes tab for alternative paths & weather checkpoints.*`,
          timestamp: new Date().toISOString(),
          toolCalls,
          action: mapAction,
        };
      }
    }
  }

  // 8. General AI Model Execution with Grounding (if Gemini API key configured)
  const effectiveKey = geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
  if (effectiveKey && effectiveKey.trim().length > 5) {
    try {
      const [w, aqi] = await Promise.all([
        fetchComprehensiveWeather(city.latitude, city.longitude).catch(() => null),
        fetchAirQuality(city.latitude, city.longitude).catch(() => null),
      ]);

      const systemContext = `You are the CityPulse Smart City Intelligence AI Assistant for ${city.label} (lat: ${city.latitude}, lng: ${city.longitude}).
Grounded telemetry available right now:
- Temperature: ${w ? `${w.temperature}°C, ${w.weatherLabel}, humidity ${w.humidity}%, wind ${w.windSpeed} km/h` : 'Available via live sensors'}
- Air Quality: ${aqi ? `${aqi.aqi} US AQI (${aqi.category}), PM2.5: ${aqi.pm2_5}` : 'Available via Copernicus CAMS'}
Never fabricate non-existent facilities or arbitrary numbers. Keep your response concise, helpful, and formatted in clean markdown.`;

      const aiReply = await callGeminiModel(query, systemContext, effectiveKey, conversationHistory);

      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'AI model execution failed.';
      // Return structured error message with clear explanation
      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **AI Service Notice:** ${errMsg}\n\nYou can click **Retry** or continue using CityPulse's built-in live tools for weather, traffic, and facility lookups.`,
        timestamp: new Date().toISOString(),
        error: true,
      };
    }
  }

  // 9. Built-in Deterministic Intelligent Help
  return {
    id: `msg_${Date.now()}`,
    role: 'assistant',
    content: `I am your **CityPulse Smart City Assistant** for **${city.name}**.\n\nI connect directly to verified municipal telematics and geospatial tools:\n\n* 🏥 **Locate Facilities:** *"Find hospitals within 5 km"*, *"Show police stations near Jaipur Railway Station"*\n* 🌤️ **Live Atmospheric Sensors:** *"What is the current weather and AQI?"*, *"Show PM2.5 pollution"*\n* 📅 **Urban Forecasting:** *"Show the 7-day forecast for my city"*\n* 🚗 **Route & Traffic Intelligence:** *"Plan route to Hawa Mahal"*, *"Show traffic around my location"*\n* 🚨 **Civic Bulletins:** *"Are there any active flood or storm warnings?"*\n\n*(Note: Add your free Google Gemini API key in Settings to unlock open-ended conversational reasoning).*`,
    timestamp: new Date().toISOString(),
  };
}
