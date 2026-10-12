// CityPulse weather-data edge function v2
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CurrentWeather {
  temperature: number;
  windspeed: number;
  winddirection: number;
  weathercode: number;
  is_day: number;
  time: string;
}

interface HourlyForecast {
  time: string[];
  temperature_2m: number[];
  precipitation: number[];
  weathercode: number[];
  windspeed_10m: number[];
  relative_humidity_2m: number[];
  visibility: number[];
}

interface ArchiveData {
  time: string[];
  temperature_2m_mean: number[];
  precipitation_sum: number[];
  windspeed_10m_max: number[];
  weathercode: number[];
}

interface ZoneWeather {
  zoneName: string;
  latitude: number;
  longitude: number;
  current: {
    temperature: number;
    windspeed: number;
    weathercode: number;
    precipitation: number;
    humidity: number;
    visibility: number;
  };
  hourly: {
    time: string[];
    temperature: number[];
    precipitation: number[];
    weathercode: number[];
    windspeed: number[];
  };
  daily7: {
    date: string[];
    tempMean: number[];
    precipSum: number[];
    windMax: number[];
    weathercode: number[];
  };
}

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Clear Skies",
  1: "Mainly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Freezing Fog",
  51: "Light Drizzle",
  53: "Moderate Drizzle",
  55: "Dense Drizzle",
  56: "Freezing Drizzle",
  57: "Dense Freezing Drizzle",
  61: "Light Rain",
  63: "Moderate Rain",
  65: "Heavy Rain",
  66: "Freezing Rain",
  67: "Heavy Freezing Rain",
  71: "Light Snow",
  73: "Moderate Snow",
  75: "Heavy Snow",
  77: "Snow Grains",
  80: "Light Showers",
  81: "Moderate Showers",
  82: "Violent Showers",
  85: "Snow Showers",
  86: "Heavy Snow Showers",
  95: "Thunderstorm",
  96: "Thunderstorm with Hail",
  99: "Severe Thunderstorm",
};

function weatherDescription(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? "Unknown";
}

function weatherSeverityScore(code: number): number {
  if (code >= 95) return 40;
  if (code >= 82) return 35;
  if (code >= 65) return 30;
  if (code >= 71) return 20;
  if (code >= 61) return 15;
  if (code >= 51) return 10;
  if (code >= 45) return 12;
  if (code >= 3) return 5;
  return 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const latStr = url.searchParams.get("lat");
    const lngStr = url.searchParams.get("lng");

    if (!latStr || !lngStr) {
      return new Response(
        JSON.stringify({ error: "Missing lat/lng parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const zonesParam = url.searchParams.get("zones") || "4";
    const zoneCount = Math.min(6, Math.max(1, parseInt(zonesParam)));

    const zoneOffsets = [
      { dLat: 0.0, dLng: 0.0, name: "Central" },
      { dLat: 0.015, dLng: 0.01, name: "Eastside" },
      { dLat: -0.015, dLng: -0.01, name: "Westside" },
      { dLat: 0.015, dLng: -0.01, name: "Northside" },
      { dLat: -0.015, dLng: 0.01, name: "Southside" },
      { dLat: 0.0, dLng: 0.02, name: "Riverside" },
    ];

    const activeZones = zoneOffsets.slice(0, zoneCount);

    const now = new Date();
    const endDate = now.toISOString().slice(0, 10);
    const startDate7d = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const startDate30d = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const zonePromises = activeZones.map(async (zone) => {
      const zLat = lat + zone.dLat;
      const zLng = lng + zone.dLng;

      const currentUrl = `https://api.open-meteo.com/v1/forecast?latitude=${zLat}&longitude=${zLng}&current=temperature_2m,wind_speed_10m,weather_code,relative_humidity_2m,precipitation&hourly=temperature_2m,precipitation,weather_code,wind_speed_10m,relative_humidity_2m,visibility&forecast_days=2&timezone=auto`;

      const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${zLat}&longitude=${zLng}&start_date=${startDate7d}&end_date=${endDate}&daily=temperature_2m_mean,precipitation_sum,wind_speed_10m_max,weather_code&timezone=auto`;

      const archive30Url = `https://archive-api.open-meteo.com/v1/archive?latitude=${zLat}&longitude=${zLng}&start_date=${startDate30d}&end_date=${endDate}&daily=temperature_2m_mean,precipitation_sum,wind_speed_10m_max,weather_code&timezone=auto`;

      const [currentRes, archiveRes, archive30Res] = await Promise.all([
        fetch(currentUrl, { headers: { Accept: "application/json" } }),
        fetch(archiveUrl, { headers: { Accept: "application/json" } }),
        fetch(archive30Url, { headers: { Accept: "application/json" } }),
      ]);

      if (!currentRes.ok) {
        throw new Error(`Weather API failed for zone ${zone.name}`);
      }

      const currentData = await currentRes.json();
      const archiveData = archiveRes.ok ? await archiveRes.json() : null;
      const archive30Data = archive30Res.ok ? await archive30Res.json() : null;

      const current = currentData.current || {};
      const hourly = currentData.hourly || {};

      const currentHourIdx = hourly.time ? Math.max(0, hourly.time.indexOf(current.time?.slice(0, 13))) : 0;

      const zoneWeather: ZoneWeather = {
        zoneName: zone.name,
        latitude: zLat,
        longitude: zLng,
        current: {
          temperature: Math.round(current.temperature_2m ?? 0),
          windspeed: Math.round(current.wind_speed_10m ?? 0),
          weathercode: current.weather_code ?? 0,
          precipitation: current.precipitation ?? 0,
          humidity: current.relative_humidity_2m ?? 0,
          visibility: hourly.visibility?.[currentHourIdx] ?? 10000,
        },
        hourly: {
          time: (hourly.time || []).slice(-24),
          temperature: (hourly.temperature_2m || []).slice(-24),
          precipitation: (hourly.precipitation || []).slice(-24),
          weathercode: (hourly.weather_code || []).slice(-24),
          windspeed: (hourly.wind_speed_10m || []).slice(-24),
        },
        daily7: {
          date: archiveData?.daily?.time || [],
          tempMean: archiveData?.daily?.temperature_2m_mean || [],
          precipSum: archiveData?.daily?.precipitation_sum || [],
          windMax: archiveData?.daily?.wind_speed_10m_max || [],
          weathercode: archiveData?.daily?.weather_code || [],
        },
      };

      const daily30 = archive30Data?.daily || null;

      const wmoSeverity = weatherSeverityScore(current.weather_code ?? 0);
      const precipSeverity = Math.min(25, Math.round((current.precipitation ?? 0) * 10));
      const windSeverity = Math.min(20, Math.round((current.wind_speed_10m ?? 0) * 0.5));

      const totalWeatherSeverity = wmoSeverity + precipSeverity + windSeverity;

      const transitDelay = Math.min(25, Math.round(
        (current.precipitation ?? 0) * 3 +
        (current.wind_speed_10m ?? 0) * 0.2 +
        (totalWeatherSeverity > 30 ? 8 : 0)
      ));

      const complaintCount = Math.min(60, Math.round(
        3 +
        (current.precipitation ?? 0) * 5 +
        (current.wind_speed_10m ?? 0) * 0.3 +
        totalWeatherSeverity * 0.4
      ));

      const severityScore = Math.min(100, Math.max(5, Math.round(
        totalWeatherSeverity * 0.5 +
        transitDelay * 1.5 +
        complaintCount * 0.6
      )));

      const status = severityScore >= 70 ? "alert" : severityScore >= 40 ? "watch" : "normal";

      const weatherLabel = weatherDescription(current.weather_code ?? 0);

      const hourly24: { hour: string; complaints: number; transit: number; weather: number }[] = [];
      const hTime = hourly.time || [];
      const hPrecip = hourly.precipitation || [];
      const hWind = hourly.wind_speed_10m || [];
      const hCode = hourly.weather_code || [];

      for (let i = Math.max(0, hTime.length - 24); i < hTime.length; i++) {
        const dt = new Date(hTime[i]);
        const hourLabel = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
        const wSev = weatherSeverityScore(hCode[i] ?? 0);
        const pSev = Math.min(15, Math.round((hPrecip[i] ?? 0) * 8));
        const windSev = Math.min(10, Math.round((hWind[i] ?? 0) * 0.4));
        const wTotal = wSev + pSev + windSev;
        const estComplaints = Math.max(0, Math.round(1 + (hPrecip[i] ?? 0) * 3 + wTotal * 0.3));
        const estTransit = Math.max(0, Math.round((hPrecip[i] ?? 0) * 1.5 + (hWind[i] ?? 0) * 0.15));
        hourly24.push({
          hour: hourLabel,
          complaints: estComplaints,
          transit: estTransit,
          weather: wTotal,
        });
      }

      const daily7Data: { hour: string; complaints: number; transit: number; weather: number }[] = [];
      const d7Time = archiveData?.daily?.time || [];
      const d7Precip = archiveData?.daily?.precipitation_sum || [];
      const d7Wind = archiveData?.daily?.wind_speed_10m_max || [];
      const d7Code = archiveData?.daily?.weather_code || [];

      for (let i = 0; i < d7Time.length; i++) {
        const dt = new Date(d7Time[i]);
        const dayLabel = dt.toLocaleDateString("en-US", { weekday: "short" });
        const wSev = weatherSeverityScore(d7Code[i] ?? 0);
        const pSev = Math.min(20, Math.round((d7Precip[i] ?? 0) * 8));
        const windSev = Math.min(15, Math.round((d7Wind[i] ?? 0) * 0.4));
        const wTotal = wSev + pSev + windSev;
        const estComplaints = Math.max(0, Math.round(2 + (d7Precip[i] ?? 0) * 2 + wTotal * 0.2));
        const estTransit = Math.max(0, Math.round((d7Precip[i] ?? 0) * 1 + (d7Wind[i] ?? 0) * 0.1));
        daily7Data.push({
          hour: dayLabel,
          complaints: estComplaints,
          transit: estTransit,
          weather: wTotal,
        });
      }

      const daily30Data: { hour: string; complaints: number; transit: number; weather: number }[] = [];
      const d30Time = daily30?.time || [];
      const d30Precip = daily30?.precipitation_sum || [];
      const d30Wind = daily30?.wind_speed_10m_max || [];
      const d30Code = daily30?.weather_code || [];

      const weekBuckets: { complaints: number; transit: number; weather: number; count: number }[] = [
        { complaints: 0, transit: 0, weather: 0, count: 0 },
        { complaints: 0, transit: 0, weather: 0, count: 0 },
        { complaints: 0, transit: 0, weather: 0, count: 0 },
        { complaints: 0, transit: 0, weather: 0, count: 0 },
      ];

      for (let i = 0; i < d30Time.length; i++) {
        const weekIdx = Math.min(3, Math.floor(i / 7));
        const wSev = weatherSeverityScore(d30Code[i] ?? 0);
        const pSev = Math.min(20, Math.round((d30Precip[i] ?? 0) * 8));
        const windSev = Math.min(15, Math.round((d30Wind[i] ?? 0) * 0.4));
        const wTotal = wSev + pSev + windSev;
        weekBuckets[weekIdx].complaints += Math.max(0, Math.round(2 + (d30Precip[i] ?? 0) * 2 + wTotal * 0.2));
        weekBuckets[weekIdx].transit += Math.max(0, Math.round((d30Precip[i] ?? 0) * 1 + (d30Wind[i] ?? 0) * 0.1));
        weekBuckets[weekIdx].weather += wTotal;
        weekBuckets[weekIdx].count++;
      }

      weekBuckets.forEach((wb, i) => {
        const c = wb.count || 1;
        daily30Data.push({
          hour: `Wk ${i + 1}`,
          complaints: Math.round(wb.complaints / c),
          transit: Math.round(wb.transit / c),
          weather: Math.round(wb.weather / c),
        });
      });

      return {
        zoneName: zone.name,
        latitude: zLat,
        longitude: zLng,
        current: {
          temperature: Math.round(current.temperature_2m ?? 0),
          windspeed: Math.round(current.wind_speed_10m ?? 0),
          weathercode: current.weather_code ?? 0,
          weatherLabel,
          precipitation: current.precipitation ?? 0,
          humidity: current.relative_humidity_2m ?? 0,
        },
        derived: {
          transitDelay,
          complaintCount,
          severityScore,
          status,
          weatherSeverity: totalWeatherSeverity,
        },
        hourly24,
        daily7: daily7Data,
        daily30: daily30Data,
      };
    });

    const zoneResults = await Promise.all(zonePromises);

    const avgSeverity = Math.round(
      zoneResults.reduce((sum, z) => sum + z.derived.severityScore, 0) / zoneResults.length
    );

    const allHourly = zoneResults.map((z) => z.hourly24);
    const merged24h: { hour: string; complaints: number; transit: number; weather: number }[] = [];
    if (allHourly.length > 0 && allHourly[0]) {
      for (let i = 0; i < allHourly[0].length; i++) {
        let c = 0, t = 0, w = 0;
        for (const zh of allHourly) {
          if (zh[i]) {
            c += zh[i].complaints;
            t += zh[i].transit;
            w += zh[i].weather;
          }
        }
        merged24h.push({
          hour: allHourly[0][i].hour,
          complaints: Math.round(c / allHourly.length),
          transit: Math.round(t / allHourly.length),
          weather: Math.round(w / allHourly.length),
        });
      }
    }

    return new Response(
      JSON.stringify({
        zones: zoneResults,
        citySeverity: avgSeverity,
        trend24h: merged24h,
        anomalyThreshold: 25,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
