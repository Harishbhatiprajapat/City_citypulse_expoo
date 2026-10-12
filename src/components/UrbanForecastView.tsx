import { useState, useEffect } from 'react';
import {
  Calendar,
  Cloud,
  Car,
  Gauge,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Wind,
  Droplets,
  Sun,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { fetchSevenDayUrbanForecast } from '@/services/forecastService';
import type {
  CityInfo,
  SevenDayUrbanForecast,
  DailyWeatherForecastDetail,
  DailyAirQualityForecastDetail,
  DailyTrafficForecastDetail,
} from '@/types';

interface UrbanForecastViewProps {
  currentCity: CityInfo;
  tomtomKey?: string;
  onPlanRouteTo?: (destName: string, lat: number, lng: number) => void;
}

export function UrbanForecastView({ currentCity, tomtomKey }: UrbanForecastViewProps) {
  const [forecast, setForecast] = useState<SevenDayUrbanForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'weather' | 'air_quality' | 'traffic'>('all');

  async function loadForecast() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSevenDayUrbanForecast(currentCity, tomtomKey);
      setForecast(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve 7-day municipal forecasts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadForecast();
  }, [currentCity, tomtomKey]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-12 text-center shadow-sm max-w-5xl mx-auto space-y-4">
        <Loader2 className="w-10 h-10 text-citynavy-accent animate-spin mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-citynavy-text">
          Compiling 7-Day Municipal Telemetry
        </h3>
        <p className="text-xs text-slate-400 dark:text-citynavy-muted max-w-md mx-auto">
          Synchronizing Open-Meteo numerical atmospheric models, Copernicus CAMS atmospheric chemistry feeds, and 90-day recurrent traffic baseline algorithms for {currentCity.name}...
        </p>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-8 max-w-4xl mx-auto shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <h3 className="text-base font-bold">Forecast Telemetry Unavailable</h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {error || 'Unable to load forecast data.'}
        </p>
        <button
          onClick={loadForecast}
          className="px-4 py-2 bg-citynavy-accent hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Forecast Retrieval</span>
        </button>
      </div>
    );
  }

  const selectedWeather: DailyWeatherForecastDetail = forecast.weatherDaily[selectedDayIndex] || forecast.weatherDaily[0];
  const selectedAqi: DailyAirQualityForecastDetail = forecast.airQualityDaily[selectedDayIndex] || forecast.airQualityDaily[0];
  const selectedTraffic: DailyTrafficForecastDetail = forecast.trafficDaily[selectedDayIndex] || forecast.trafficDaily[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-citynavy-text flex items-center gap-2">
                <span>7-Day Urban Intelligence Forecast</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  7-Day Horizon
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-citynavy-muted mt-0.5">
                Multi-domain municipal forecasting for <strong>{forecast.city.label}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-citynavy-secondary rounded-xl p-1 self-start md:self-auto overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'Overview' },
            { id: 'weather', label: 'Atmospheric' },
            { id: 'air_quality', label: 'Air Quality' },
            { id: 'traffic', label: 'Traffic Mobility' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${
                activeTab === t.id
                  ? 'bg-white dark:bg-citynavy-card text-citynavy-accent shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Warnings & Advisories Section */}
      {forecast.warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex items-start gap-3 text-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-900 dark:text-amber-200">
              Active Severe Weather & Meteorological Warnings ({forecast.warnings.length})
            </h4>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
              {forecast.warnings.map((w) => `• [${w.severity.toUpperCase()}] ${w.headline}`).join(' ')}
            </p>
          </div>
        </div>
      )}

      {/* Interactive 7-Day Timeline Bar */}
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-citynavy-muted uppercase tracking-wider">
            Select Day for Deep Drill-Down
          </span>
          <span className="text-[11px] text-slate-400 dark:text-citynavy-muted">
            Generated: {new Date(forecast.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {forecast.weatherDaily.map((wDay, idx) => {
            const isSelected = selectedDayIndex === idx;
            const aDay = forecast.airQualityDaily[idx];
            const tDay = forecast.trafficDaily[idx];

            return (
              <button
                key={wDay.date}
                onClick={() => setSelectedDayIndex(idx)}
                className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-citynavy-border hover:bg-slate-50 dark:hover:bg-citynavy-secondary/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={isSelected ? 'text-citynavy-accent' : 'text-slate-700 dark:text-slate-300'}>
                      {wDay.dayName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {new Date(wDay.date).getDate()}
                    </span>
                  </div>
                  <p className="text-[11px] font-extrabold text-slate-900 dark:text-citynavy-text mt-1">
                    {wDay.tempMax}° / <span className="text-slate-400 font-normal">{wDay.tempMin}°</span>
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-citynavy-muted truncate mt-0.5">
                    {wDay.weatherLabel}
                  </p>
                </div>

                {/* Micro Badges for AQI & Congestion */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-citynavy-border/60 flex items-center justify-between text-[10px]">
                  <span
                    className="font-bold px-1 rounded"
                    style={{
                      color: aDay?.categoryColor || '#22C55E',
                      backgroundColor: `${aDay?.categoryColor || '#22C55E'}15`,
                    }}
                    title={`AQI ${aDay?.aqiMax} (${aDay?.aqiCategory})`}
                  >
                    AQI {aDay?.aqiMax}
                  </span>
                  <span
                    className={`font-semibold px-1 rounded ${
                      tDay?.congestionLevel === 'Heavy' || tDay?.congestionLevel === 'Severe'
                        ? 'text-red-600 bg-red-50 dark:bg-red-950/40'
                        : tDay?.congestionLevel === 'Moderate'
                        ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                        : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                    }`}
                    title={`Traffic ${tDay?.congestionIndex}/100 (${tDay?.congestionLevel})`}
                  >
                    {tDay?.congestionLevel[0]} &bull; {tDay?.congestionIndex}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Detailed Intelligence Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Atmospheric Weather */}
        {(activeTab === 'all' || activeTab === 'weather') && (
          <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-citynavy-border pb-3">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-citynavy-accent" />
                <h3 className="text-sm font-black text-slate-900 dark:text-citynavy-text">
                  Weather: {selectedWeather.dayName}
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                {selectedWeather.date}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-black text-slate-900 dark:text-citynavy-text">
                  {selectedWeather.tempMax}°C
                </span>
                <span className="text-xs text-slate-400 font-medium ml-2">
                  Min: {selectedWeather.tempMin}°C
                </span>
              </div>
              <span className="text-xs font-bold text-citynavy-accent px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40">
                {selectedWeather.weatherLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-citynavy-secondary/60">
                <span className="text-[10px] text-slate-400 block">Precipitation Prob</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {selectedWeather.precipitationProbability}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-citynavy-secondary/60">
                <span className="text-[10px] text-slate-400 block">Expected Rainfall</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {selectedWeather.precipitationSum} mm
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-citynavy-secondary/60">
                <span className="text-[10px] text-slate-400 block">Max Wind Velocity</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {selectedWeather.windSpeedMax} km/h
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-citynavy-secondary/60">
                <span className="text-[10px] text-slate-400 block">Mean Humidity</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {selectedWeather.humidityMean}%
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 dark:text-citynavy-muted border-t border-slate-100 dark:border-citynavy-border pt-2">
              Source: {forecast.dataSource.weather}
            </p>
          </div>
        )}

        {/* Card 2: Copernicus Air Quality */}
        {(activeTab === 'all' || activeTab === 'air_quality') && (
          <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-citynavy-border pb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-citynavy-text">
                  Air Quality & Pollutants
                </h3>
              </div>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  color: selectedAqi.categoryColor,
                  backgroundColor: `${selectedAqi.categoryColor}15`,
                }}
              >
                {selectedAqi.aqiCategory}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span
                  className="text-3xl font-black"
                  style={{ color: selectedAqi.categoryColor }}
                >
                  {selectedAqi.aqiMax}
                </span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">US AQI Max</span>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                Dominant: {selectedAqi.dominantPollutant}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-citynavy-secondary/60">
                <span className="text-[10px] text-slate-400 block">PM2.5 Concentration</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {selectedAqi.pm2_5} µg/m³
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-citynavy-secondary/60">
                <span className="text-[10px] text-slate-400 block">PM10 Coarse Dust</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {selectedAqi.pm10} µg/m³
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-citynavy-secondary/60">
                <span className="text-[10px] text-slate-400 block">Nitrogen Dioxide (NO₂)</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {selectedAqi.no2} µg/m³
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-citynavy-secondary/60">
                <span className="text-[10px] text-slate-400 block">Ground Ozone (O₃)</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {selectedAqi.ozone} µg/m³
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 dark:text-citynavy-muted border-t border-slate-100 dark:border-citynavy-border pt-2">
              Source: {forecast.dataSource.airQuality}
            </p>
          </div>
        )}

        {/* Card 3: Urban Traffic & Corridor Congestion Patterns */}
        {(activeTab === 'all' || activeTab === 'traffic') && (
          <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-citynavy-border pb-3">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-citynavy-text">
                  Corridor Congestion Patterns
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                {selectedTraffic.confidenceScore}% Confidence
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-black text-slate-900 dark:text-citynavy-text">
                  {selectedTraffic.congestionIndex}
                </span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">/ 100 Index</span>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                  selectedTraffic.congestionLevel === 'Heavy' || selectedTraffic.congestionLevel === 'Severe'
                    ? 'text-red-600 bg-red-50 dark:bg-red-950/40'
                    : selectedTraffic.congestionLevel === 'Moderate'
                    ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                    : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                }`}
              >
                {selectedTraffic.congestionLevel} Congestion
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-citynavy-secondary/60">
                <span className="text-[10px] text-slate-400 block">Morning Rush Window</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {selectedTraffic.morningPeakHours}
                </span>
                <span className="text-[10px] text-amber-500 font-medium block">
                  +{Math.round((selectedTraffic.morningDelayMultiplier - 1) * 100)}% transit delay
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-citynavy-secondary/60">
                <span className="text-[10px] text-slate-400 block">Evening Rush Window</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {selectedTraffic.eveningPeakHours}
                </span>
                <span className="text-[10px] text-red-500 font-medium block">
                  +{Math.round((selectedTraffic.eveningDelayMultiplier - 1) * 100)}% transit delay
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 dark:text-citynavy-muted border-t border-slate-100 dark:border-citynavy-border pt-2 leading-relaxed">
              <p>
                <strong>Methodology:</strong> {selectedTraffic.methodology}
              </p>
              {forecast.trafficNotice && (
                <p className="mt-1 text-slate-400 italic">{forecast.trafficNotice}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transparent Technical Notice */}
      <div className="bg-slate-50 dark:bg-citynavy-secondary/50 border border-slate-200 dark:border-citynavy-border rounded-2xl p-4 text-xs text-slate-500 dark:text-citynavy-muted flex items-start gap-2.5">
        <Info className="w-4 h-4 text-citynavy-accent flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Forecast Horizon & Integrity Disclosures:</strong> CityPulse presents live numerical predictions derived from verified scientific models. Atmospheric forecasts are published via ECMWF & GFS high-resolution grids. Atmospheric chemistry is monitored via Copernicus CAMS satellite telemetry. Road corridor traffic estimates reflect a 90-day time-aware recurrent workday baseline model; sudden unexpected incidents or unannounced roadworks are dynamically overlaid via TomTom real-time probe telemetry when configured.
        </div>
      </div>
    </div>
  );
}
