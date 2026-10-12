import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2,
  AlertCircle,
  Cloud,
  Gauge,
  Car,
  ShieldAlert,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NavBar } from '@/components/NavBar';
import { AlertBanner } from '@/components/AlertBanner';
import { ZoneGrid } from '@/components/ZoneGrid';
import { TrendChart } from '@/components/TrendChart';
import { FeedStatusFooter } from '@/components/FeedStatusFooter';
import { LiveMap } from '@/components/LiveMap';
import { SearchBar } from '@/components/SearchBar';
import { AISummary } from '@/components/AISummary';
import { SeverityGauge } from '@/components/SeverityGauge';
import { HistoricalReplay } from '@/components/HistoricalReplay';

// New Advanced Views
import { ExploreMap } from '@/components/ExploreMap';
import { TrafficIntelligence } from '@/components/TrafficIntelligence';
import { WeatherAirQuality } from '@/components/WeatherAirQuality';
import { UrbanForecastView } from '@/components/UrbanForecastView';
import { CivicAlertCenter } from '@/components/CivicAlertCenter';
import { RoutePlanner } from '@/components/RoutePlanner';
import { SavedPlacesView } from '@/components/SavedPlacesView';
import { SettingsView } from '@/components/SettingsView';
import { AIAssistantView } from '@/components/AIAssistantView';

// Civic Intelligence & Real-Time Citizen Services
import { WhatsHappeningNow } from '@/components/WhatsHappeningNow';
import { CivicReportingModal } from '@/components/CivicReportingModal';
import { IssueTrackerModal } from '@/components/IssueTrackerModal';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';
import { getCivicIncidents, CivicIncidentItem } from '@/services/civicIncidentService';

// Existing Pages
import { LoginPage } from '@/pages/LoginPage';
import { AccountPage } from '@/pages/AccountPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { AboutPage } from '@/pages/AboutPage';

import { fetchWeatherData, buildZonesFromWeather, buildReplayData } from '@/lib/weatherApi';
import { fetchComprehensiveWeather, fetchAirQuality } from '@/services/weatherService';
import { fetchCivicAlerts } from '@/services/alertService';
import { searchNearbyPOIs } from '@/services/geoService';
import { supabase } from '@/lib/supabase';
import type {
  Zone,
  TrendPoint,
  Page,
  CityInfo,
  CitySearchResult,
  ComprehensiveWeather,
  AirQualityData,
  CivicAlert,
  UserSettings,
  POICategory,
  POIPlace,
} from '@/types';

const defaultCity: CityInfo = {
  name: 'Jaipur',
  country: 'India',
  admin1: 'Rajasthan',
  latitude: 26.9124,
  longitude: 75.7873,
  label: 'Jaipur, Rajasthan, India',
};

const PRESET_INDIAN_CITIES: CityInfo[] = [
  { name: 'Jaipur', country: 'India', admin1: 'Rajasthan', latitude: 26.9124, longitude: 75.7873, label: 'Jaipur, Rajasthan, India' },
  { name: 'Delhi', country: 'India', admin1: 'Delhi', latitude: 28.6139, longitude: 77.2090, label: 'Delhi, India' },
  { name: 'Mumbai', country: 'India', admin1: 'Maharashtra', latitude: 19.0760, longitude: 72.8777, label: 'Mumbai, Maharashtra, India' },
  { name: 'Bengaluru', country: 'India', admin1: 'Karnataka', latitude: 12.9716, longitude: 77.5946, label: 'Bengaluru, Karnataka, India' },
  { name: 'Hyderabad', country: 'India', admin1: 'Telangana', latitude: 17.3850, longitude: 78.4867, label: 'Hyderabad, Telangana, India' },
  { name: 'Chennai', country: 'India', admin1: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707, label: 'Chennai, Tamil Nadu, India' },
  { name: 'Kolkata', country: 'India', admin1: 'West Bengal', latitude: 22.5726, longitude: 88.3639, label: 'Kolkata, West Bengal, India' },
  { name: 'Pune', country: 'India', admin1: 'Maharashtra', latitude: 18.5204, longitude: 73.8567, label: 'Pune, Maharashtra, India' },
  { name: 'Ahmedabad', country: 'India', admin1: 'Gujarat', latitude: 23.0225, longitude: 72.5714, label: 'Ahmedabad, Gujarat, India' },
  { name: 'Lucknow', country: 'India', admin1: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462, label: 'Lucknow, Uttar Pradesh, India' },
];

const DEFAULT_SETTINGS: UserSettings = {
  tempUnit: 'C',
  distanceUnit: 'km',
  mapStyle: 'dark',
  tomtomApiKey: import.meta.env.VITE_TOMTOM_API_KEY || '',
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
};

function AppContent() {
  const { theme, user } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('overview');
  const [currentCity, setCurrentCity] = useState<CityInfo>(defaultCity);
  const [zones, setZones] = useState<Zone[]>([]);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [replayData, setReplayData] = useState<Record<string, TrendPoint[]>>({});
  const [anomalyThreshold, setAnomalyThreshold] = useState(25);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Environmental KPIs
  const [liveWeather, setLiveWeather] = useState<ComprehensiveWeather | null>(null);
  const [liveAqi, setLiveAqi] = useState<AirQualityData | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<CivicAlert[]>([]);

  // Civic Incident & Reporting State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackInitialId, setTrackInitialId] = useState<string | undefined>(undefined);
  const [incidents, setIncidents] = useState<CivicIncidentItem[]>(() => getCivicIncidents(defaultCity.name));

  // Settings
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('citypulse_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  });

  // Inter-tab navigation state (e.g. from ExploreMap directions to RoutePlanner)
  const [routeDestination, setRouteDestination] = useState<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [dismissedCity, setDismissedCity] = useState<string>('');
  const [expandedZoneId, setExpandedZoneId] = useState<number | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(1);
  const [searchFocused, setSearchFocused] = useState(false);

  // Overview Infrastructure Shortcuts state (Section 5)
  const [overviewCategory, setOverviewCategory] = useState<POICategory | null>(null);
  const [overviewPOIs, setOverviewPOIs] = useState<POIPlace[]>([]);
  const [overviewLoadingPOIs, setOverviewLoadingPOIs] = useState(false);
  const [selectedOverviewPOI, setSelectedOverviewPOI] = useState<POIPlace | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const currentCityRef = useRef<CityInfo>(defaultCity);
  currentCityRef.current = currentCity;

  // Sync theme class to documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Load telemetry data for given city
  const loadData = useCallback(async (city: CityInfo) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [raw, wData, aqiData] = await Promise.all([
        fetchWeatherData(city),
        fetchComprehensiveWeather(city.latitude, city.longitude).catch(() => null),
        fetchAirQuality(city.latitude, city.longitude).catch(() => null),
      ]);

      const newZones = buildZonesFromWeather(raw, city);
      const newReplay = buildReplayData(raw);

      setZones(newZones);
      setTrendData(raw.trend24h.length > 0 ? raw.trend24h : []);
      setReplayData(newReplay);
      setAnomalyThreshold(raw.anomalyThreshold || 25);
      setSelectedZoneId(newZones[0]?.id ?? 1);
      setExpandedZoneId(null);
      setAlertDismissed(false);
      setLiveWeather(wData);
      setLiveAqi(aqiData);
      setIncidents(getCivicIncidents(city.name));
      setOverviewCategory(null);
      setOverviewPOIs([]);
      setSelectedOverviewPOI(null);

      // Fetch official civic bulletins
      if (wData) {
        fetchCivicAlerts(city.latitude, city.longitude, wData, aqiData || undefined)
          .then((alerts) => setActiveAlerts(alerts))
          .catch(() => setActiveAlerts([]));
      }

      setLastUpdated(new Date());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load live city data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
            { headers: { 'User-Agent': 'CityPulse-Civic/2.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            const cityName =
              data.address?.city ||
              data.address?.town ||
              data.address?.municipality ||
              data.address?.state_district ||
              'Current Location';
            const country = data.address?.country || '';
            const admin1 = data.address?.state || '';
            const label = [cityName, admin1, country].filter(Boolean).join(', ');
            const newCity: CityInfo = {
              name: cityName,
              country,
              admin1,
              latitude,
              longitude,
              label,
            };
            setCurrentCity(newCity);
            loadData(newCity);
          }
        } catch {
          const newCity: CityInfo = {
            name: 'My GPS Location',
            country: '',
            latitude,
            longitude,
            label: `GPS Coordinates: ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
          };
          setCurrentCity(newCity);
          loadData(newCity);
        }
      },
      (err) => {
        setIsLoading(false);
        alert(`Location permission unavailable (${err.message}). You can select Jaipur or search any city.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [loadData]);

  useEffect(() => {
    loadData(defaultCity);
  }, [loadData]);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await loadData(currentCityRef.current);
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleSaveSettings(newSettings: UserSettings) {
    setSettings(newSettings);
    try {
      localStorage.setItem('citypulse_settings', JSON.stringify(newSettings));
    } catch (err) {
      console.error('Error saving settings to storage:', err);
    }
  }

  function handleToggleZone(id: number) {
    setExpandedZoneId((prev) => (prev === id ? null : id));
    setSelectedZoneId(id);
  }

  async function handleSearch(cityResult: CitySearchResult) {
    const cityInfo: CityInfo = {
      name: cityResult.name,
      country: cityResult.country,
      admin1: cityResult.admin1,
      latitude: cityResult.latitude,
      longitude: cityResult.longitude,
      label: cityResult.label,
    };
    setCurrentCity(cityInfo);
    await loadData(cityInfo);

    if (user) {
      supabase
        .from('search_history')
        .insert({ query: cityResult.label, results_count: 4 })
        .then(() => {});
    }

    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleNavigate(page: Page) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handlePlanRouteTo(destName: string, lat: number, lng: number) {
    setRouteDestination({ name: destName, lat, lng });
    setCurrentPage('routes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSelectOverviewCategory(cat: POICategory) {
    if (overviewCategory === cat) {
      setOverviewCategory(null);
      setOverviewPOIs([]);
      setSelectedOverviewPOI(null);
      return;
    }

    setOverviewCategory(cat);
    setSelectedOverviewPOI(null);
    setOverviewLoadingPOIs(true);
    try {
      const places = await searchNearbyPOIs(cat, currentCity.latitude, currentCity.longitude, 6);
      setOverviewPOIs(places);
    } catch {
      setOverviewPOIs([]);
    } finally {
      setOverviewLoadingPOIs(false);
    }
  }

  function handleClearOverviewCategory() {
    setOverviewCategory(null);
    setOverviewPOIs([]);
    setSelectedOverviewPOI(null);
  }

  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? zones[0];
  const activeAlertZone = zones.find((z) => z.status === 'alert');
  const hasActiveOfficialAlert = activeAlerts.length > 0;
  const hasActiveAlert =
    (!!activeAlertZone || hasActiveOfficialAlert) &&
    !alertDismissed &&
    dismissedCity !== currentCity.label;

  const topAlert = activeAlerts[0];
  const alertDisplayMessage = topAlert
    ? `[${topAlert.severity.toUpperCase()}] ${topAlert.headline} (${topAlert.source})`
    : activeAlertZone
    ? `${activeAlertZone.name} in ${currentCity.name} — ${activeAlertZone.weather.value}. Severity score at ${activeAlertZone.severityScore}/100.`
    : '';

  const navBarProps = {
    lastUpdated,
    onRefresh: handleRefresh,
    isRefreshing,
    hasAlert: hasActiveAlert,
    currentPage,
    onNavigate: handleNavigate,
    onSearchFocus: () => {
      if (currentPage !== 'overview' && currentPage !== 'dashboard') {
        handleNavigate('overview');
      }
      setTimeout(() => {
        searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setSearchFocused(true);
        setTimeout(() => setSearchFocused(false), 500);
      }, 100);
    },
  };

  // Dedicated secondary views
  if (currentPage === 'login') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-citynavy flex flex-col">
        <NavBar {...navBarProps} />
        <LoginPage onNavigate={handleNavigate} />
        <FeedStatusFooter tomtomConnected={Boolean(settings.tomtomApiKey)} />
      </div>
    );
  }

  if (currentPage === 'account') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-citynavy flex flex-col">
        <NavBar {...navBarProps} />
        <AccountPage onNavigate={handleNavigate} />
        <FeedStatusFooter tomtomConnected={Boolean(settings.tomtomApiKey)} />
      </div>
    );
  }

  if (currentPage === 'history') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-citynavy flex flex-col">
        <NavBar {...navBarProps} />
        <HistoryPage onNavigate={handleNavigate} />
        <FeedStatusFooter tomtomConnected={Boolean(settings.tomtomApiKey)} />
      </div>
    );
  }

  if (currentPage === 'about') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-citynavy flex flex-col">
        <NavBar {...navBarProps} />
        <AboutPage onNavigate={handleNavigate} />
        <FeedStatusFooter tomtomConnected={Boolean(settings.tomtomApiKey)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-citynavy flex flex-col text-slate-900 dark:text-citynavy-text transition-colors">
      <NavBar {...navBarProps} />

      {/* Active Civic Alert Banner */}
      {hasActiveAlert && alertDisplayMessage && (
        <AlertBanner
          message={alertDisplayMessage}
          onDismiss={() => {
            setAlertDismissed(true);
            setDismissedCity(currentCity.label);
          }}
        />
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Global Place Search Bar (always visible on primary tabs) */}
        <div ref={searchRef}>
          <SearchBar onSearch={handleSearch} autoFocus={searchFocused} />
        </div>

        {/* Indian Smart Cities Shortcut Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 text-xs">
          <span className="font-semibold text-slate-400 dark:text-citynavy-muted whitespace-nowrap pr-1 text-[11px]">
            Smart Cities:
          </span>
          {PRESET_INDIAN_CITIES.map((c) => {
            const isActive = currentCity.name === c.name;
            return (
              <button
                key={c.name}
                onClick={() => {
                  setCurrentCity(c);
                  loadData(c);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-citynavy-accent text-white shadow-sm shadow-blue-500/25'
                    : 'bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-citynavy-secondary'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Global City Indicator Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-slow" />
            <span className="text-xs sm:text-sm text-slate-500 dark:text-citynavy-muted">
              {isLoading ? 'Synchronizing GIS feeds for' : 'Active Intelligence Region:'}
            </span>
            <span className="text-xs sm:text-sm font-bold text-citynavy-accent">
              {currentCity.label}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-citynavy-muted">
            <span>Coordinates:</span>
            <span className="font-mono text-slate-600 dark:text-slate-300">
              {currentCity.latitude.toFixed(3)}, {currentCity.longitude.toFixed(3)}
            </span>
          </div>
        </div>

        {/* Error notification if live data failed */}
        {loadError && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Failed to load real-time data
              </p>
              <p className="text-xs text-red-500 dark:text-red-400">
                {loadError}. Tap refresh to retry.
              </p>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-citynavy-accent animate-spin" />
            <p className="text-sm text-slate-500 dark:text-citynavy-muted">
              Retrieving live geospatial, weather, and civic feeds...
            </p>
          </div>
        )}

        {/* ROUTED CONTENT VIEWS */}
        {!isLoading && (
          <>
            {/* VIEW 1: OVERVIEW DASHBOARD */}
            {(currentPage === 'overview' || currentPage === 'dashboard') && zones.length > 0 && (
              <div className="space-y-6">
                {/* What's Happening Now & City Health Score Feed */}
                <WhatsHappeningNow
                  currentCity={currentCity}
                  liveWeather={liveWeather}
                  liveAqi={liveAqi}
                  activeAlerts={activeAlerts}
                  incidents={incidents}
                  onOpenReportModal={() => setIsReportModalOpen(true)}
                  onOpenTrackModal={() => {
                    setTrackInitialId(undefined);
                    setIsTrackModalOpen(true);
                  }}
                  onLocateNearMe={handleLocateMe}
                  onNavigateTab={(tab) => handleNavigate(tab as Page)}
                />

                {/* Executive KPI Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Weather KPI */}
                  <div
                    onClick={() => handleNavigate('weather')}
                    className="p-4 rounded-2xl bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-citynavy-muted font-semibold">
                      <span>Atmospheric Status</span>
                      <Cloud className="w-4 h-4 text-citynavy-accent group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-citynavy-text">
                        {liveWeather ? `${liveWeather.temperature}°C` : zones[0]?.weather.value}
                      </span>
                      <span className="text-xs text-slate-400">
                        {liveWeather?.weatherLabel || 'Observed'}
                      </span>
                    </div>
                    <p className="text-[11px] text-citynavy-accent font-medium mt-1 flex items-center gap-1">
                      <span>View Detailed Forecast</span>
                      <ArrowRight className="w-3 h-3" />
                    </p>
                  </div>

                  {/* AQI KPI */}
                  <div
                    onClick={() => handleNavigate('weather')}
                    className="p-4 rounded-2xl bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-citynavy-muted font-semibold">
                      <span>Air Quality Index</span>
                      <Gauge className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span
                        className="text-2xl font-black"
                        style={{ color: liveAqi?.categoryColor || '#22C55E' }}
                      >
                        {liveAqi ? `${liveAqi.aqi} AQI` : '38 AQI'}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {liveAqi?.category || 'Good'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-citynavy-muted mt-1">
                      PM2.5: {liveAqi?.pm2_5 ?? 8.4} µg/m³ &middot; PM10: {liveAqi?.pm10 ?? 12.1} µg/m³
                    </p>
                  </div>

                  {/* Traffic KPI */}
                  <div
                    onClick={() => handleNavigate('traffic')}
                    className="p-4 rounded-2xl bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-citynavy-muted font-semibold">
                      <span>Corridor Traffic</span>
                      <Car className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-citynavy-text">
                        {zones[0]?.transit.value || 'Normal'}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Passable
                      </span>
                    </div>
                    <p className="text-[11px] text-citynavy-accent font-medium mt-1 flex items-center gap-1">
                      <span>Inspect Corridors & Flow</span>
                      <ArrowRight className="w-3 h-3" />
                    </p>
                  </div>

                  {/* Civic Alerts KPI */}
                  <div
                    onClick={() => handleNavigate('alerts')}
                    className="p-4 rounded-2xl bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-citynavy-muted font-semibold">
                      <span>Verified Civic Alerts</span>
                      <ShieldAlert className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-citynavy-text">
                        {activeAlerts.length}
                      </span>
                      <span className="text-xs text-slate-400">Active Bulletins</span>
                    </div>
                    <p className="text-[11px] text-citynavy-accent font-medium mt-1 flex items-center gap-1">
                      <span>Open Alert Operations Center</span>
                      <ArrowRight className="w-3 h-3" />
                    </p>
                  </div>
                </div>

                {/* Quick Services Shortcut Chips (Section 5) */}
                <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-xl p-3 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none text-xs">
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                    <span className="font-semibold text-slate-400 dark:text-citynavy-muted whitespace-nowrap pl-1">
                      Quick Infrastructure Lookups:
                    </span>
                    {[
                      { label: '🏥 Nearby Hospitals', cat: 'hospitals' as POICategory },
                      { label: '👮 Police Stations', cat: 'police' as POICategory },
                      { label: '🏫 Schools & Colleges', cat: 'schools' as POICategory },
                      { label: '🚌 Bus & Rail Hubs', cat: 'bus_stations' as POICategory },
                      { label: '💊 Pharmacies', cat: 'pharmacies' as POICategory },
                      { label: '🌳 Public Parks', cat: 'parks' as POICategory },
                    ].map((chip) => {
                      const isActive = overviewCategory === chip.cat;
                      return (
                        <button
                          key={chip.cat}
                          onClick={() => handleSelectOverviewCategory(chip.cat)}
                          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-citynavy-secondary hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>{chip.label}</span>
                          {isActive && overviewLoadingPOIs && (
                            <Loader2 className="w-3 h-3 animate-spin text-white" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    {overviewCategory && (
                      <button
                        onClick={handleClearOverviewCategory}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold whitespace-nowrap flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-citynavy-border"
                      >
                        <span>✕ Clear Filter</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleNavigate('explore')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs whitespace-nowrap transition-colors flex items-center gap-1"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Explore Nearby</span>
                    </button>
                  </div>
                </div>

                {/* Live GIS Zone Map */}
                <LiveMap
                  zones={zones}
                  selectedZoneId={selectedZoneId}
                  onSelectZone={handleToggleZone}
                  cityLabel={currentCity.label}
                  cityCoords={{ lat: currentCity.latitude, lng: currentCity.longitude }}
                  poiPlaces={overviewPOIs}
                  selectedPOI={selectedOverviewPOI}
                  onSelectPOI={setSelectedOverviewPOI}
                  activeInfrastructureCategory={overviewCategory}
                  onClearCategory={handleClearOverviewCategory}
                  onPlanRouteTo={handlePlanRouteTo}
                  tomtomKey={settings.tomtomApiKey}
                  liveWeather={liveWeather}
                  liveAqi={liveAqi}
                  activeAlerts={activeAlerts}
                  onSimulateAlert={() => {
                    const testAlert: CivicAlert = {
                      id: `sim_alert_${Date.now()}`,
                      event: 'Simulated Public Safety Warning',
                      headline: `Active civic test alert dispatched for ${currentCity.name}`,
                      description: 'Simulated alert verification scenario. Municipal safety protocols triggered for testing.',
                      severity: 'critical',
                      effective: new Date().toISOString(),
                      source: 'CityPulse Emergency Simulation Engine',
                      areaDesc: currentCity.label,
                      category: 'public_safety',
                      coordinates: { lat: currentCity.latitude, lng: currentCity.longitude },
                    };
                    setActiveAlerts((prev) => [testAlert, ...prev]);
                  }}
                  onOpenAssistant={() => handleNavigate('ai')}
                  heightClass="h-[480px] sm:h-[560px]"
                />

                {/* Zone Cards Grid */}
                <ZoneGrid
                  zones={zones}
                  expandedId={expandedZoneId}
                  onToggle={handleToggleZone}
                />

                {/* Severity Gauge & AI Plain-Language Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SeverityGauge zone={selectedZone} />
                  <AISummary zone={selectedZone} />
                </div>

                {/* 24-Hour Activity Trend Chart */}
                <TrendChart
                  data={trendData}
                  title={`24-Hour Activity Trend — ${currentCity.name}`}
                  anomalyThreshold={anomalyThreshold}
                />

                {/* Historical Replay Component */}
                <HistoricalReplay replayData={replayData} />
              </div>
            )}

            {/* VIEW 2: EXPLORE MAP */}
            {currentPage === 'explore' && (
              <ExploreMap
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleToggleZone}
                currentCity={currentCity}
                onPlanRouteTo={handlePlanRouteTo}
                onSelectCity={(city) => {
                  setCurrentCity(city);
                  loadData(city);
                }}
                tomtomKey={settings.tomtomApiKey}
              />
            )}

            {/* VIEW 3: TRAFFIC INTELLIGENCE */}
            {currentPage === 'traffic' && (
              <TrafficIntelligence
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleToggleZone}
                currentCity={currentCity}
                tomtomKey={settings.tomtomApiKey}
                onOpenSettings={() => handleNavigate('settings')}
              />
            )}

            {/* VIEW 4: WEATHER & AIR QUALITY */}
            {currentPage === 'weather' && (
              <WeatherAirQuality currentCity={currentCity} />
            )}

            {/* VIEW 4.5: SEVEN-DAY URBAN FORECAST DASHBOARD */}
            {currentPage === 'forecast' && (
              <UrbanForecastView
                currentCity={currentCity}
                tomtomKey={settings.tomtomApiKey}
                onPlanRouteTo={handlePlanRouteTo}
              />
            )}

            {/* VIEW 5: CIVIC ALERT CENTER */}
            {currentPage === 'alerts' && (
              <CivicAlertCenter currentCity={currentCity} />
            )}

            {/* VIEW 6: ROUTE PLANNING */}
            {currentPage === 'routes' && (
              <RoutePlanner
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleToggleZone}
                currentCity={currentCity}
                initialDestination={routeDestination}
                tomtomKey={settings.tomtomApiKey}
              />
            )}

            {/* VIEW 7: SAVED PLACES */}
            {currentPage === 'saved' && (
              <SavedPlacesView
                currentCity={currentCity}
                onPlanRouteTo={handlePlanRouteTo}
              />
            )}

            {/* VIEW 8: SETTINGS */}
            {currentPage === 'settings' && (
              <SettingsView
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {/* VIEW 9: AI CITY ASSISTANT */}
            {currentPage === 'ai' && (
              <AIAssistantView
                currentCity={currentCity}
                geminiApiKey={settings.geminiApiKey}
                onNavigateToTab={handleNavigate}
                onPlanRouteTo={handlePlanRouteTo}
              />
            )}
          </>
        )}
      </main>

      {/* Persistent Feeds Status Footer */}
      <FeedStatusFooter tomtomConnected={Boolean(settings.tomtomApiKey)} />

      {/* Floating CityPulse AI Assistant */}
      <FloatingAIAssistant
        currentCity={currentCity}
        geminiApiKey={settings.geminiApiKey}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenTrackModal={(id) => {
          setTrackInitialId(id);
          setIsTrackModalOpen(true);
        }}
      />

      {/* Citizen Issue Reporting Modal */}
      <CivicReportingModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        currentCity={currentCity}
        onTrackIssue={(id) => {
          setTrackInitialId(id);
          setIsTrackModalOpen(true);
        }}
      />

      {/* Issue Tracking Modal */}
      <IssueTrackerModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        initialIssueId={trackInitialId}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
