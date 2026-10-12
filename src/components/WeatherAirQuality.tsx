import { useState, useEffect } from 'react';
import {
  Cloud,
  Wind,
  Droplets,
  Gauge,
  Loader2,
  Calendar,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { fetchComprehensiveWeather, fetchAirQuality } from '@/services/weatherService';
import type { ComprehensiveWeather, AirQualityData, CityInfo } from '@/types';

interface WeatherAirQualityProps {
  currentCity: CityInfo;
}

export function WeatherAirQuality({ currentCity }: WeatherAirQualityProps) {
  const [weather, setWeather] = useState<ComprehensiveWeather | null>(null);
  const [aqi, setAqi] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchComprehensiveWeather(currentCity.latitude, currentCity.longitude),
      fetchAirQuality(currentCity.latitude, currentCity.longitude),
    ])
      .then(([wData, aqiData]) => {
        if (active) {
          setWeather(wData);
          setAqi(aqiData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to fetch environmental data');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentCity.latitude, currentCity.longitude]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-citynavy-accent animate-spin" />
        <p className="text-sm text-slate-500 dark:text-citynavy-muted">
          Retrieving real atmospheric and air quality observations for {currentCity.name}...
        </p>
      </div>
    );
  }

  if (error || !weather || !aqi) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center gap-3">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-red-800 dark:text-red-300">
            Observation Feed Disrupted
          </h3>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* City & Timestamp Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-citynavy-text">
            Atmospheric & Air Quality Intelligence
          </h2>
          <p className="text-xs text-slate-500 dark:text-citynavy-muted mt-0.5">
            Real-time observations for {currentCity.label}
          </p>
        </div>
        <div className="text-xs text-slate-400 dark:text-citynavy-muted">
          Observed at: {new Date(weather.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Primary KPI Grid: Weather & AQI Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Weather Card */}
        <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-citynavy-muted uppercase tracking-wider">
              Current Weather
            </span>
            <Cloud className="w-5 h-5 text-citynavy-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-citynavy-text">
              {weather.temperature}°C
            </span>
            <span className="text-xs text-slate-400 dark:text-citynavy-muted">
              Feels like {weather.apparentTemperature}°C
            </span>
          </div>
          <p className="text-sm font-semibold text-citynavy-accent">{weather.weatherLabel}</p>
        </div>

        {/* Air Quality Index (AQI) Card */}
        <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-citynavy-muted uppercase tracking-wider">
              Air Quality (US AQI)
            </span>
            <Gauge className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-4xl font-extrabold"
              style={{ color: aqi.categoryColor }}
            >
              {aqi.aqi}
            </span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${aqi.categoryColor}20`,
                color: aqi.categoryColor,
              }}
            >
              {aqi.category}
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-citynavy-muted">
            PM2.5: {aqi.pm2_5} µg/m³ · PM10: {aqi.pm10} µg/m³
          </p>
        </div>

        {/* Wind & Pressure Card */}
        <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-citynavy-muted uppercase tracking-wider">
              Wind & Pressure
            </span>
            <Wind className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-citynavy-text">
              {weather.windSpeed} km/h
            </span>
            <span className="text-xs text-slate-400 dark:text-citynavy-muted">
              {weather.windDirection}° Azimuth
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-citynavy-muted">
            Surface Pressure: {weather.surfacePressure} hPa
          </p>
        </div>

        {/* Humidity & Precipitation Card */}
        <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-citynavy-muted uppercase tracking-wider">
              Humidity & Rain
            </span>
            <Droplets className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-citynavy-text">
              {weather.humidity}%
            </span>
            <span className="text-xs text-slate-400 dark:text-citynavy-muted">
              Relative humidity
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-citynavy-muted">
            Precipitation: {weather.precipitation} mm
          </p>
        </div>
      </div>

      {/* Atmospheric Pollutant Breakdown Table */}
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-citynavy-text flex items-center gap-2">
          <Activity className="w-4 h-4 text-citynavy-accent" />
          Real Atmospheric Pollutant Telemetry
        </h3>
        <p className="text-xs text-slate-400 dark:text-citynavy-muted">
          Direct sensor readouts from Copernicus Atmospheric Monitoring Service (CAMS)
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Fine PM2.5', value: `${aqi.pm2_5} µg/m³`, desc: 'Fine respirable particles' },
            { label: 'Coarse PM10', value: `${aqi.pm10} µg/m³`, desc: 'Inhalable dust & pollen' },
            { label: 'Ozone (O₃)', value: `${aqi.ozone} µg/m³`, desc: 'Ground-level photochemical' },
            { label: 'Nitrogen Dioxide', value: `${aqi.no2} µg/m³`, desc: 'Vehicle combustion' },
            { label: 'Carbon Monoxide', value: `${aqi.co} µg/m³`, desc: 'Industrial exhaust' },
            { label: 'Sulfur Dioxide', value: `${aqi.so2} µg/m³`, desc: 'Power generation' },
          ].map((item) => (
            <div
              key={item.label}
              className="p-3 rounded-xl bg-slate-50 dark:bg-citynavy-secondary/50 border border-slate-100 dark:border-citynavy-border/60"
            >
              <span className="text-[11px] font-semibold text-slate-500 dark:text-citynavy-muted block">
                {item.label}
              </span>
              <span className="text-base font-bold text-slate-800 dark:text-citynavy-text mt-1 block">
                {item.value}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-citynavy-muted mt-0.5 block truncate">
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 7-Day Forecast Horizon */}
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-citynavy-text flex items-center gap-2">
          <Calendar className="w-4 h-4 text-citynavy-accent" />
          7-Day Weather & Precipitation Outlook
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {weather.daily.map((day, idx) => (
            <div
              key={day.date}
              className={`p-3.5 rounded-xl border text-center transition-all ${
                idx === 0
                  ? 'border-citynavy-accent/50 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                  : 'border-slate-100 dark:border-citynavy-border/60 bg-slate-50/50 dark:bg-citynavy-secondary/30'
              }`}
            >
              <span className="text-xs font-bold text-slate-800 dark:text-citynavy-text block">
                {day.dayName}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-citynavy-muted block mt-0.5">
                {day.date.slice(5)}
              </span>
              <div className="my-2.5 text-xs font-semibold text-citynavy-accent line-clamp-1">
                {day.weatherLabel}
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                <span className="text-slate-800 dark:text-slate-200">{day.tempMax}°</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-400">{day.tempMin}°</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 dark:text-citynavy-muted">
                Rain: {day.precipitationSum} mm
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
