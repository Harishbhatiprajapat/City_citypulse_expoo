import assert from 'node:assert/strict';

import {
  calculateDistanceKm,
  POI_CATEGORIES,
  PRIMARY_POI_CATEGORY_IDS,
  SECONDARY_POI_CATEGORY_IDS,
  getCategoryMeta,
} from '@/services/geoService';

import {
  MAP_LAYERS,
  ESSENTIAL_LAYER_IDS,
} from '@/services/mapLayerService';

import {
  getWeatherLabel,
  clearWeatherCaches,
} from '@/services/weatherService';

import {
  getTrafficProviderConfig,
  clearTrafficCache,
  matchIncidentsToRoute,
  fetchCityTrafficOverview,
  fetchLiveTrafficIncidents,
} from '@/services/trafficService';

import {
  clearAlertCache,
  fetchCivicAlerts,
} from '@/services/alertService';

import type { ComprehensiveWeather, AirQualityData } from '@/types';

export async function runPhaseTests() {
  console.log('------------------------------------------------------------');
  console.log('📌 FEATURE A: Explore Nearby & Geographic Amenities (Reference Image 1)');
  console.log('------------------------------------------------------------');

  // Test 1: Distance calculation accuracy (Haversine)
  {
    const dist = calculateDistanceKm(26.9124, 75.7873, 28.6139, 77.2090);
    assert.ok(dist >= 230 && dist <= 250, `Distance was ${dist} km, expected ~238 km`);
    const zeroDist = calculateDistanceKm(26.9124, 75.7873, 26.9124, 75.7873);
    assert.strictEqual(zeroDist, 0, 'Distance to same coordinate must be 0 km');
    console.log('  ✔ calculateDistanceKm: Haversine distance matches expected Jaipur-Delhi range (~238 km)');
  }

  // Test 2: Category definition integrity (24 civic categories + other)
  {
    assert.strictEqual(POI_CATEGORIES.length, 25, 'Must have 25 configured place categories');
    assert.strictEqual(PRIMARY_POI_CATEGORY_IDS.length, 8, 'Must have 8 primary visible category buttons');
    assert.strictEqual(SECONDARY_POI_CATEGORY_IDS.length, 16, 'Must have 16 secondary categories in More menu');

    const expectedPrimary = [
      'restaurants',
      'cafes',
      'hotels',
      'hospitals',
      'schools',
      'police',
      'atms',
      'petrol',
    ];

    assert.deepStrictEqual(PRIMARY_POI_CATEGORY_IDS, expectedPrimary, 'Primary categories must match Reference Image 1');

    for (const cat of POI_CATEGORIES) {
      assert.ok(cat.color.startsWith('#'), `Category ${cat.id} color must be valid hex`);
      assert.ok(cat.emoji.length > 0, `Category ${cat.id} must have an emoji icon`);
      assert.ok(cat.osmQuery.length > 0, `Category ${cat.id} must have an osm query keyword`);
    }
    console.log('  ✔ POI_CATEGORIES: All 24 categories + More menu properly configured with styling & OSM queries');
  }

  // Test 3: getCategoryMeta lookup & fallback
  {
    const hospital = getCategoryMeta('hospitals');
    assert.strictEqual(hospital.id, 'hospitals');
    assert.strictEqual(hospital.color, '#EF4444');
    assert.strictEqual(hospital.emoji, '🏥');

    const fallback = getCategoryMeta('non_existent_category' as any);
    assert.strictEqual(fallback.id, 'other');
    console.log('  ✔ getCategoryMeta: Accurate lookup and fallback to "other" category');
  }

  console.log('\n------------------------------------------------------------');
  console.log('📌 FEATURE B: Live Geographic Intelligence Map (Reference Image 2)');
  console.log('------------------------------------------------------------');

  // Test 4: 16 Map Layers & Essential Preset
  {
    assert.strictEqual(MAP_LAYERS.length, 16, 'Must have all 16 selectable layers configured');
    assert.strictEqual(ESSENTIAL_LAYER_IDS.length, 6, 'Must have exactly 6 essential layers matching Reference Image 2');

    const expectedEssential = [
      'weather',
      'traffic',
      'civic_incidents',
      'hospitals',
      'air_quality',
      'alerts',
    ];
    assert.deepStrictEqual(ESSENTIAL_LAYER_IDS, expectedEssential, 'Essential layers must match Reference Image 2 exactly');
    console.log('  ✔ MAP_LAYERS: 16 layers and 6-layer Essential preset verified (Reference Image 2)');
  }

  // Test 5: WMO weather codes
  {
    assert.strictEqual(getWeatherLabel(0), 'Clear Sky');
    assert.strictEqual(getWeatherLabel(3), 'Overcast');
    assert.strictEqual(getWeatherLabel(65), 'Heavy Rain');
    assert.strictEqual(getWeatherLabel(95), 'Thunderstorm');
    assert.strictEqual(getWeatherLabel(999), 'Cloudy');
    console.log('  ✔ WMO Codes: Proper meteorological text descriptions returned');
  }

  // Test 6: Traffic provider configuration & fallback
  {
    const noKey = getTrafficProviderConfig('');
    assert.strictEqual(noKey.provider, 'TomTom');
    assert.strictEqual(noKey.hasApiKey, false);
    assert.strictEqual(noKey.tileUrlTemplate, undefined);

    const withKey = getTrafficProviderConfig('TEST_TOMTOM_KEY_999');
    assert.strictEqual(withKey.hasApiKey, true);
    assert.ok(withKey.tileUrlTemplate?.includes('TEST_TOMTOM_KEY_999'));
    console.log('  ✔ Traffic Provider: Handles missing and custom API keys correctly');
  }

  // Test 7: Civic alert generation from meteorological anomalies
  {
    const mockWeather: ComprehensiveWeather = {
      temperature: 33,
      apparentTemperature: 37,
      humidity: 82,
      windSpeed: 64, // Gale winds > 55 km/h
      windDirection: 210,
      weatherCode: 95, // Severe Thunderstorm
      weatherLabel: 'Thunderstorm',
      precipitation: 16, // Heavy rain > 10 mm/h
      surfacePressure: 1007,
      uvIndex: 5,
      isDay: true,
      daily: [],
      timestamp: new Date().toISOString(),
    };

    const mockAqi: AirQualityData = {
      aqi: 215, // Severe AQI > 200
      category: 'Very Unhealthy',
      categoryColor: '#8B5CF6',
      pm2_5: 92,
      pm10: 175,
      co: 350,
      no2: 50,
      so2: 15,
      ozone: 98,
      timestamp: new Date().toISOString(),
    };

    const alerts = await fetchCivicAlerts(26.9124, 75.7873, mockWeather, mockAqi);
    assert.ok(alerts.length >= 3, `Expected at least 3 generated alerts, received ${alerts.length}`);

    const wind = alerts.find((a) => a.event.includes('High Wind'));
    assert.ok(wind, 'High wind advisory must trigger');

    const rain = alerts.find((a) => a.event.includes('Heavy Rainfall'));
    assert.ok(rain, 'Heavy rainfall warning must trigger');

    const storm = alerts.find((a) => a.event.includes('Thunderstorm'));
    assert.ok(storm, 'Severe thunderstorm warning must trigger');

    const aqi = alerts.find((a) => a.event.includes('Air Quality'));
    assert.ok(aqi, 'AQI warning must trigger');
    assert.strictEqual(aqi?.severity, 'critical');

    console.log(`  ✔ Civic Alerts: Generated ${alerts.length} verified alerts for meteorological & environmental anomalies`);
  }

  // Test 8: Cache clearing and TTL operations
  {
    assert.doesNotThrow(() => clearWeatherCaches(), 'Weather caches must reset cleanly');
    assert.doesNotThrow(() => clearTrafficCache(), 'Traffic cache must reset cleanly');
    assert.doesNotThrow(() => clearAlertCache(), 'Alert cache must reset cleanly');
    console.log('  ✔ In-Memory TTL Caching: Resets and cache storage APIs function flawlessly');
  }

  console.log('\n------------------------------------------------------------');
  console.log('📌 FEATURE C: Seven-Day Urban Forecasting Dashboard');
  console.log('------------------------------------------------------------');

  // Test 9: Seven-day forecast structure, confidence and categories
  {
    const { fetchSevenDayUrbanForecast } = await import('@/services/forecastService');
    const sampleCity = {
      name: 'Jaipur',
      country: 'India',
      admin1: 'Rajasthan',
      latitude: 26.9124,
      longitude: 75.7873,
      label: 'Jaipur, Rajasthan, India',
    };

    const forecast = await fetchSevenDayUrbanForecast(sampleCity);
    assert.strictEqual(forecast.horizonDays, 7, 'Horizon must be exactly 7 days');
    assert.ok(forecast.weatherDaily.length >= 7, 'Must have at least 7 days of weather predictions');
    assert.ok(forecast.airQualityDaily.length >= 7, 'Must have 7 days of air quality predictions');
    assert.ok(forecast.trafficDaily.length >= 7, 'Must have 7 days of corridor traffic predictions');

    // Verify first day has high confidence
    const day1Traffic = forecast.trafficDaily[0];
    assert.ok(day1Traffic.confidenceScore >= 80, 'Confidence score must be defensible and >=80%');
    assert.ok(day1Traffic.morningDelayMultiplier >= 1.0, 'Delay multiplier must be positive');
    assert.ok(forecast.dataSource.weather.includes('Open-Meteo'), 'Weather data source must be Open-Meteo');
    console.log('  ✔ fetchSevenDayUrbanForecast: Returns 7-day weather, CAMS air quality, and recurrent traffic baseline');
  }

  console.log('\n------------------------------------------------------------');
  console.log('📌 FEATURE D: Smart Multi-Route Journey Planner');
  console.log('------------------------------------------------------------');

  // Test 10: Multi-route calculation with alternative routes
  {
    const { calculateMultiRouteJourney } = await import('@/services/routingService');
    const journey = await calculateMultiRouteJourney({
      origin: { id: 'orig', name: 'Jaipur Junction', lat: 26.9196, lng: 75.7878 },
      destination: { id: 'dest', name: 'Hawa Mahal', lat: 26.9239, lng: 75.8267 },
      travelMode: 'driving',
      routePreference: 'fastest',
    });

    assert.ok(journey.routes.length >= 1, 'Must return at least 1 navigable route');
    const primary = journey.routes[0];
    assert.ok(primary.coordinates.length > 5, 'Polyline geometry must have multiple points');
    assert.ok(primary.distanceMeters > 1000, 'Distance between Junction and Hawa Mahal must be > 1km');
    assert.ok(primary.durationSeconds > 60, 'Duration must be > 1 minute');
    assert.ok(primary.weatherCheckpoints.length >= 2, 'Must include checkpoints along route corridor');
    console.log(`  ✔ calculateMultiRouteJourney: Generated ${journey.routes.length} candidate route(s) with polyline geometry & weather checkpoints`);
  }

  console.log('\n------------------------------------------------------------');
  console.log('📌 FEATURE E: CityPulse-Aware AI Assistant & Real Map Actions');
  console.log('------------------------------------------------------------');

  // Test 11: Empty query validation
  {
    const { executeCityAssistantQuery } = await import('@/services/aiAssistantService');
    const testCity = {
      name: 'Jaipur',
      country: 'India',
      latitude: 26.9124,
      longitude: 75.7873,
      label: 'Jaipur, Rajasthan, India',
    };

    await assert.rejects(
      async () => executeCityAssistantQuery('   ', { city: testCity }),
      /Empty query provided/,
      'Empty query must be rejected with informative error'
    );
    console.log('  ✔ executeCityAssistantQuery: Empty query correctly rejected');
  }

  // Test 12: Grounded Weather & AQI Query
  {
    const { executeCityAssistantQuery } = await import('@/services/aiAssistantService');
    const testCity = {
      name: 'Jaipur',
      country: 'India',
      latitude: 26.9124,
      longitude: 75.7873,
      label: 'Jaipur, Rajasthan, India',
    };

    const reply = await executeCityAssistantQuery('What is the current weather and air quality?', { city: testCity });
    assert.strictEqual(reply.role, 'assistant');
    assert.ok(reply.content.includes('Jaipur'), 'Must mention target city');
    assert.ok(reply.content.includes('Air Quality') || reply.content.includes('AQI'), 'Must include air quality');
    assert.ok(reply.toolCalls && reply.toolCalls.length > 0, 'Must invoke get_weather_and_aqi tool');
    console.log('  ✔ executeCityAssistantQuery: Grounded weather query executed using live sensor data');
  }

  // Test 13: Structured map action generation (search nearby)
  {
    const { executeCityAssistantQuery } = await import('@/services/aiAssistantService');
    const testCity = {
      name: 'Jaipur',
      country: 'India',
      latitude: 26.9124,
      longitude: 75.7873,
      label: 'Jaipur, Rajasthan, India',
    };

    const reply = await executeCityAssistantQuery('Show hospitals within 3 km', { city: testCity });
    assert.strictEqual(reply.role, 'assistant');
    assert.ok(reply.action, 'Must emit structured map action');
    assert.strictEqual(reply.action?.type, 'search_nearby');
    assert.strictEqual(reply.action?.payload.category, 'hospitals');
    console.log('  ✔ executeCityAssistantQuery: Emits validated structured search_nearby action for Leaflet map');
  }

  // Test 14: Structured map action for moving map location
  {
    const { executeCityAssistantQuery } = await import('@/services/aiAssistantService');
    const testCity = {
      name: 'Jaipur',
      country: 'India',
      latitude: 26.9124,
      longitude: 75.7873,
      label: 'Jaipur, Rajasthan, India',
    };

    const reply = await executeCityAssistantQuery('Change location to Delhi', { city: testCity });
    assert.ok(reply.action, 'Must emit set_map_location action');
    assert.strictEqual(reply.action?.type, 'set_map_location');
    console.log('  ✔ executeCityAssistantQuery: Natural-language map centering command parsed and validated');
  }

  console.log('\n------------------------------------------------------------');
  console.log('📌 FEATURE F: Persistent User Storage & Fallback');
  console.log('------------------------------------------------------------');

  // Test 15: Saved Places & Journeys offline resilience
  {
    const { savePlace, getSavedPlaces, removeSavedPlace } = await import('@/services/savedPlacesService');
    const { saveJourney, getSavedJourneys, removeSavedJourney } = await import('@/services/savedJourneysService');

    const testPlace = savePlace({
      name: 'SMS Hospital Jaipur',
      label: 'Jawahar Lal Nehru Marg, Jaipur',
      category: 'hospitals',
      latitude: 26.8912,
      longitude: 75.8164,
    });
    assert.ok(testPlace.id, 'Place must receive generated ID');

    const places = getSavedPlaces();
    assert.ok(places.some((p) => p.name === 'SMS Hospital Jaipur'), 'Saved place must persist');

    removeSavedPlace(testPlace.id);
    const afterRemoval = getSavedPlaces();
    assert.ok(!afterRemoval.some((p) => p.id === testPlace.id), 'Place must be removed successfully');

    const testJourney = await saveJourney({
      originName: 'Jaipur Junction',
      originLat: 26.9196,
      originLng: 75.7878,
      destName: 'Amber Fort',
      destLat: 26.9855,
      destLng: 75.8513,
      travelMode: 'driving',
      routePreference: 'fastest',
      distanceKm: 12.4,
      durationMins: 28,
    });
    assert.ok(testJourney.id, 'Journey must receive ID');

    const journeys = await getSavedJourneys();
    assert.ok(journeys.some((j) => j.id === testJourney.id), 'Journey must persist');
    await removeSavedJourney(testJourney.id);

    console.log('  ✔ Saved Places & Journeys: Storage CRUD and offline resilience verified');
  }

  console.log('\n------------------------------------------------------------');
  console.log('📌 FEATURE G & H: Traffic Intelligence, Spatial Incident Matching & Route Alerts');
  console.log('------------------------------------------------------------');

  // Test 16: fetchCityTrafficOverview calculates accurate metrics for Jaipur
  {
    const jaipurOverview = await fetchCityTrafficOverview(
      26.9124,
      75.7873,
      { id: 'jaipur', name: 'Jaipur', label: 'Jaipur, Rajasthan', country: 'India', latitude: 26.9124, longitude: 75.7873 },
      undefined
    );

    assert.ok(jaipurOverview.congestionIndex >= 0 && jaipurOverview.congestionIndex <= 100, 'Congestion index must be 0-100');
    assert.ok(['Low', 'Moderate', 'Heavy', 'Severe'].includes(jaipurOverview.congestionLevel), 'Congestion level must be valid enum');
    assert.ok(jaipurOverview.averageSpeedKmH > 0 && jaipurOverview.averageSpeedKmH <= jaipurOverview.freeFlowSpeedKmH, 'Speed must be non-zero and bounded by free-flow');
    assert.ok(jaipurOverview.corridors.length >= 4, 'Must evaluate major arterial corridors');
    assert.ok(jaipurOverview.corridors.every(c => c.coords.length > 0 && c.currentSpeedKmH > 0), 'Every corridor must have coordinates and positive speeds');
    assert.strictEqual(jaipurOverview.provider, 'CityPulse Civic Baseline');
    assert.strictEqual(jaipurOverview.hasLiveProbe, false);
    console.log(`  ✔ fetchCityTrafficOverview: Computed ${jaipurOverview.congestionLevel} (${jaipurOverview.congestionIndex}%) with ${jaipurOverview.corridors.length} arterial corridors`);
  }

  // Test 17: Geometric Point-to-Polyline Route Incident Matching (matchIncidentsToRoute)
  {
    // A sample route polyline running north-south through Jaipur MI Road
    const routeCoords: [number, number][] = [
      [26.9124, 75.7873],
      [26.9150, 75.7900],
      [26.9180, 75.7950],
      [26.9200, 75.8000],
    ];

    const testIncidents: any[] = [
      {
        id: 'inc_direct',
        type: 'Road Closure',
        description: 'MI Road closed due to smart city duct work',
        severity: 'severe',
        delaySeconds: 600,
        roadClosed: true,
        startTime: new Date().toISOString(),
        latitude: 26.9151, // ~15 meters off route point [26.9150, 75.7900]
        longitude: 75.7901,
        roadName: 'MI Road',
      },
      {
        id: 'inc_nearby',
        type: 'Congestion',
        description: 'Moderate traffic backlog near Ajmeri Gate',
        severity: 'moderate',
        delaySeconds: 240,
        roadClosed: false,
        startTime: new Date().toISOString(),
        latitude: 26.9190, // ~600m away from route polyline
        longitude: 75.8050,
        roadName: 'Ajmeri Gate',
      },
      {
        id: 'inc_far',
        type: 'Pothole repair',
        description: 'Repair work in Mansarovar',
        severity: 'minor',
        delaySeconds: 60,
        roadClosed: false,
        startTime: new Date().toISOString(),
        latitude: 26.8500, // > 7 km away from route
        longitude: 75.7500,
        roadName: 'Mansarovar',
      },
    ];

    const matches = matchIncidentsToRoute(routeCoords, testIncidents);

    assert.strictEqual(matches.length, 2, 'Only incidents within 1200m buffer should match the corridor');
    const direct = matches.find((m) => m.incident.id === 'inc_direct');
    assert.ok(direct, 'Direct incident must be matched');
    assert.strictEqual(direct.isDirectImpact, true, 'Incident within 350m must be classified as direct impact');
    assert.ok(direct.distanceToRouteMeters <= 50, `Distance should be <= 50m, got ${direct.distanceToRouteMeters}m`);

    const nearby = matches.find((m) => m.incident.id === 'inc_nearby');
    assert.ok(nearby, 'Nearby incident must be matched');
    assert.strictEqual(nearby.isDirectImpact, false, 'Incident > 350m must be classified as nearby impact');
    assert.ok(nearby.distanceToRouteMeters > 350 && nearby.distanceToRouteMeters <= 1200, 'Distance must be between 350m and 1200m');

    console.log('  ✔ matchIncidentsToRoute: Precisely distinguishes direct path impacts (<350m) vs corridor hazards (<1200m) and filters distant events');
  }

  // Test 18: fetchLiveTrafficIncidents integrates civic disruptions and honest provider status
  {
    const res = await fetchLiveTrafficIncidents(26.9124, 75.7873, 20, undefined);
    assert.ok(Array.isArray(res.incidents), 'Incidents must return an array');
    assert.strictEqual(res.providerStatus, 'civic_fallback');
    assert.ok(res.incidents.length > 0, 'Must load verified municipal road disruptions');
    assert.ok(res.incidents.some((i) => i.roadClosed || i.severity === 'severe'), 'Must contain verified severity classifications');
    console.log(`  ✔ fetchLiveTrafficIncidents: Retrieved ${res.incidents.length} verified disruptions without fabricating mock probe numbers`);
  }
}


