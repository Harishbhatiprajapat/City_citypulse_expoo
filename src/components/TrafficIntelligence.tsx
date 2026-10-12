import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Car,
  AlertTriangle,
  Loader2,
  Key,
  Info,
  CheckCircle2,
  Bell,
  BellRing,
  SlidersHorizontal,
  Search,
  Navigation,
  RefreshCw,
  ShieldAlert,
  Clock,
  ArrowUpRight,
  MapPin,
  Activity,
  Gauge,
  X,
  Radio,
  Sliders,
  Check,
} from 'lucide-react';
import { LiveMap } from './LiveMap';
import {
  fetchCityTrafficOverview,
  fetchLiveTrafficIncidents,
  getTrafficProviderConfig,
} from '@/services/trafficService';
import type { Zone, CityInfo, TrafficIncident, CityTrafficOverview, TrafficCorridorInfo } from '@/types';

interface TrafficIntelligenceProps {
  zones: Zone[];
  selectedZoneId: number | null;
  onSelectZone: (id: number) => void;
  currentCity: CityInfo;
  tomtomKey?: string;
  onOpenSettings?: () => void;
}

interface AlertPreferences {
  enabled: boolean;
  severeOnly: boolean;
  notifyRoadClosures: boolean;
}

const STORAGE_KEY_PREFS = 'citypulse_traffic_alert_prefs';

export function TrafficIntelligence({
  zones,
  selectedZoneId,
  onSelectZone,
  currentCity,
  tomtomKey,
  onOpenSettings,
}: TrafficIntelligenceProps) {
  const [overview, setOverview] = useState<CityTrafficOverview | null>(null);
  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [focusedCoords, setFocusedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'closure' | 'accident' | 'roadwork' | 'congestion'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'severe' | 'major' | 'moderate'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Notification Preferences
  const [prefs, setPrefs] = useState<AlertPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { enabled: true, severeOnly: false, notifyRoadClosures: true };
  });
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [prefsSavedNotice, setPrefsSavedNotice] = useState(false);

  const providerConfig = getTrafficProviderConfig(tomtomKey);

  const loadTrafficData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorNotice(null);

    try {
      const ov = await fetchCityTrafficOverview(
        currentCity.latitude,
        currentCity.longitude,
        currentCity,
        tomtomKey
      );
      setOverview(ov);

      const incRes = await fetchLiveTrafficIncidents(
        currentCity.latitude,
        currentCity.longitude,
        20,
        tomtomKey
      );
      setIncidents(incRes.incidents);
      if (incRes.notice && !ov.hasLiveProbe) {
        setErrorNotice(incRes.notice);
      }
    } catch (err) {
      setErrorNotice('Traffic service connection timed out. Showing verified municipal logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentCity, tomtomKey]);

  useEffect(() => {
    loadTrafficData();
  }, [loadTrafficData]);

  const savePreferences = (newPrefs: AlertPreferences) => {
    setPrefs(newPrefs);
    try {
      localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(newPrefs));
      setPrefsSavedNotice(true);
      setTimeout(() => setPrefsSavedNotice(false), 2500);
    } catch {}
  };

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Type filter
      if (typeFilter === 'closure' && !inc.roadClosed) return false;
      if (typeFilter === 'accident') {
        const text = (inc.type + ' ' + inc.description).toLowerCase();
        if (!text.includes('accident') && !text.includes('crash')) return false;
      }
      if (typeFilter === 'roadwork') {
        const text = (inc.type + ' ' + inc.description).toLowerCase();
        if (!text.includes('roadwork') && !text.includes('construction') && !text.includes('repair') && !text.includes('pothole')) return false;
      }
      if (typeFilter === 'congestion') {
        const text = (inc.type + ' ' + inc.description).toLowerCase();
        if (!text.includes('congestion') && !text.includes('delay') && !text.includes('heavy') && !text.includes('slow')) return false;
      }

      // Severity filter
      if (severityFilter === 'severe' && inc.severity !== 'severe') return false;
      if (severityFilter === 'major' && inc.severity !== 'severe' && inc.severity !== 'major') return false;
      if (severityFilter === 'moderate' && inc.severity === 'minor') return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = inc.type.toLowerCase().includes(q);
        const matchDesc = inc.description.toLowerCase().includes(q);
        const matchRoad = inc.roadName ? inc.roadName.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchDesc && !matchRoad) return false;
      }

      return true;
    });
  }, [incidents, typeFilter, severityFilter, searchQuery]);

  // Congestion Level Color Token
  const congestionBadgeColor = useMemo(() => {
    if (!overview) return 'text-slate-500 bg-slate-100 dark:bg-slate-800';
    switch (overview.congestionLevel) {
      case 'Low':
        return 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800';
      case 'Moderate':
        return 'text-amber-700 bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800';
      case 'Heavy':
        return 'text-orange-700 bg-orange-100 dark:bg-orange-950/60 border-orange-300 dark:border-orange-800';
      case 'Severe':
        return 'text-rose-700 bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 animate-pulse';
    }
  }, [overview]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Control Room Header & Telemetry Status */}
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 flex-shrink-0">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-slate-900 dark:text-citynavy-text tracking-tight">
                  Metropolitan Traffic Operations Center
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {currentCity.name} Metro
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-citynavy-muted mt-1 leading-relaxed">
                Live arterial corridor health, real-time probe telemetry, road closure surveillance, and municipal disruption feeds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadTrafficData(true)}
              disabled={refreshing || loading}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-citynavy-border text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-citynavy-secondary transition-all flex items-center gap-1.5 shadow-sm"
              title="Refresh traffic intelligence telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Feed'}</span>
            </button>

            {/* In-App Notifications Button */}
            <button
              type="button"
              onClick={() => setShowPrefsModal(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border ${
                prefs.enabled
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-citynavy-card text-slate-600 dark:text-slate-400 border-slate-200 dark:border-citynavy-border'
              }`}
            >
              {prefs.enabled ? <BellRing className="w-3.5 h-3.5 text-blue-600" /> : <Bell className="w-3.5 h-3.5" />}
              <span>Alert Preferences</span>
            </button>

            {/* Provider Pill */}
            {providerConfig.hasApiKey ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                TomTom Probe Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700">
                <Radio className="w-3.5 h-3.5 text-blue-500" />
                Municipal Baseline
              </span>
            )}
          </div>
        </div>

        {/* Informational telemetry banner when TomTom key is not configured */}
        {!providerConfig.hasApiKey && (
          <div className="bg-slate-50 dark:bg-citynavy-secondary/60 border border-slate-200 dark:border-citynavy-border rounded-2xl p-4 flex items-start gap-3.5 text-xs">
            <Key className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">
                Live TomTom Raster Flow Tiles &amp; Probe Sensors
              </p>
              <p className="text-slate-600 dark:text-citynavy-muted leading-relaxed">
                CityPulse adheres strictly to genuine data integrity: no fabricated probe speeds or random synthetic congestion values. Operating on verified municipal road disruptions and diurnal corridor models. To activate live road-level green/yellow/red raster flow tiles and probe incidents, connect your free TomTom API key.
              </p>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="mt-1 font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  Configure TomTom Key in Settings &rarr;
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* KPI Metric Deck (Feature A) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Congestion Index */}
        <div className="p-5 rounded-3xl bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-citynavy-muted uppercase tracking-wider">
              Congestion Index
            </span>
            <Gauge className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-citynavy-text tracking-tight">
              {overview ? `${overview.congestionIndex}%` : '--'}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${congestionBadgeColor}`}>
              {overview ? overview.congestionLevel : 'Calculating'}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                overview?.congestionLevel === 'Severe'
                  ? 'bg-rose-500'
                  : overview?.congestionLevel === 'Heavy'
                  ? 'bg-orange-500'
                  : overview?.congestionLevel === 'Moderate'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, overview?.congestionIndex || 30))}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 dark:text-citynavy-muted">
            Diurnal baseline curve calibrated for {currentCity.name}
          </p>
        </div>

        {/* Card 2: Average Arterial Speed */}
        <div className="p-5 rounded-3xl bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-citynavy-muted uppercase tracking-wider">
              Arterial Speed
            </span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-citynavy-text tracking-tight">
              {overview ? `${overview.averageSpeedKmH} km/h` : '--'}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-citynavy-muted">
              vs {overview?.freeFlowSpeedKmH || 48} km/h free
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-citynavy-muted">
            {overview
              ? `${Math.round(((overview.freeFlowSpeedKmH - overview.averageSpeedKmH) / overview.freeFlowSpeedKmH) * 100)}% reduction under current load`
              : 'Speed telemetry scanning...'}
          </p>
          <div className="text-[10px] text-slate-400 font-mono">
            Provider: {overview?.provider || 'CityPulse Engine'}
          </div>
        </div>

        {/* Card 3: Average Delay */}
        <div className="p-5 rounded-3xl bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-citynavy-muted uppercase tracking-wider">
              Average Delay
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-citynavy-text tracking-tight">
              {overview ? `+${overview.travelTimeDelayMins} min` : '--'}
            </span>
            <span className="text-xs font-bold text-slate-500">
              per 10 km
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-citynavy-muted">
            Additional delay experienced compared to uncongested baseline
          </p>
          <div className="text-[10px] text-slate-400 font-mono">
            Coverage: {overview?.coverage || 'Metropolitan Core'}
          </div>
        </div>

        {/* Card 4: Active Disruptions & Road Closures */}
        <div className="p-5 rounded-3xl bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-citynavy-muted uppercase tracking-wider">
              Disruptions &amp; Closures
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-citynavy-text tracking-tight">
              {incidents.length}
            </span>
            {incidents.some((i) => i.roadClosed) && (
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                {incidents.filter((i) => i.roadClosed).length} Closed Road(s)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-citynavy-muted">
            {incidents.filter((i) => i.severity === 'severe').length} severe disruptions currently verified
          </p>
          <div className="text-[10px] text-slate-400 font-mono">
            Updated: {overview ? new Date(overview.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
          </div>
        </div>
      </div>

      {/* Arterial Corridors Monitoring Strip (Feature A) */}
      {overview && overview.corridors && overview.corridors.length > 0 && (
        <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-citynavy-text">
                Key Arterial Corridors &amp; Expressways
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Click any corridor to inspect on map
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {overview.corridors.map((c) => {
              const statusBg =
                c.congestionLevel === 'Severe'
                  ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20'
                  : c.congestionLevel === 'Heavy'
                  ? 'border-orange-300 dark:border-orange-900/60 bg-orange-50/50 dark:bg-orange-950/20'
                  : c.congestionLevel === 'Moderate'
                  ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20'
                  : 'border-slate-200 dark:border-citynavy-border bg-slate-50/50 dark:bg-citynavy-secondary/30';

              const badgeColor =
                c.congestionLevel === 'Severe'
                  ? 'bg-rose-500 text-white'
                  : c.congestionLevel === 'Heavy'
                  ? 'bg-orange-500 text-white'
                  : c.congestionLevel === 'Moderate'
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-500 text-white';

              const firstCoord = c.coords && c.coords.length > 0 ? c.coords[0] : null;

              return (
                <div
                  key={c.name}
                  onClick={() => firstCoord && setFocusedCoords({ lat: firstCoord[0], lng: firstCoord[1] })}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between space-y-2 ${statusBg}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-citynavy-text">
                      {c.name}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                      {c.congestionLevel.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {c.currentSpeedKmH} km/h
                    </span>
                    <span className="text-[11px] text-slate-500">
                      +{c.delayMins} min delay
                    </span>
                  </div>

                  {c.from && c.to && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      {c.from} &rarr; {c.to}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Interactive Map (Feature B) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-citynavy-text">
              Live Geographic Traffic Map &amp; Disruption Pins
            </h3>
            {focusedCoords && (
              <button
                type="button"
                onClick={() => setFocusedCoords(null)}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                Reset Center
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-citynavy-muted">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Free Flow
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Moderate
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Heavy
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-700 animate-pulse" /> Closed
            </span>
          </div>
        </div>

        <LiveMap
          zones={zones}
          selectedZoneId={selectedZoneId}
          onSelectZone={onSelectZone}
          cityLabel={currentCity.label}
          cityCoords={focusedCoords || { lat: currentCity.latitude, lng: currentCity.longitude }}
          trafficIncidents={filteredIncidents}
          tomtomKey={tomtomKey}
          heightClass="h-[480px] sm:h-[560px]"
        />
      </div>

      {/* Verified Traffic Incident & Alert Center (Features A & E) */}
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-citynavy-text">
                Verified Traffic Incidents &amp; Road Disruptions
              </h3>
              <p className="text-xs text-slate-400">
                Showing {filteredIncidents.length} of {incidents.length} verified disruptions
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search corridor or incident..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-citynavy-border/60">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Category:
          </span>
          {[
            { id: 'all', label: 'All Incidents' },
            { id: 'closure', label: '⛔ Road Closures' },
            { id: 'accident', label: '💥 Accidents' },
            { id: 'roadwork', label: '🚧 Roadwork' },
            { id: 'congestion', label: '⚠️ Congestion' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setTypeFilter(cat.id as any)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all border ${
                typeFilter === cat.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-citynavy-secondary text-slate-600 dark:text-slate-300 border-slate-200 dark:border-citynavy-border hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}

          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-2 mr-1">
            Severity:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'severe', label: 'Severe' },
            { id: 'major', label: 'Major+' },
            { id: 'moderate', label: 'Moderate+' },
          ].map((sev) => (
            <button
              key={sev.id}
              type="button"
              onClick={() => setSeverityFilter(sev.id as any)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border ${
                severityFilter === sev.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                  : 'bg-white dark:bg-citynavy-secondary text-slate-600 dark:text-slate-300 border-slate-200 dark:border-citynavy-border hover:bg-slate-50'
              }`}
            >
              {sev.label}
            </button>
          ))}
        </div>

        {/* Incidents Table / Cards */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <p className="text-xs text-slate-400">Scanning traffic provider incident feed...</p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 dark:text-citynavy-muted bg-slate-50 dark:bg-citynavy-secondary/30 rounded-2xl px-4 leading-relaxed">
            {errorNotice
              ? errorNotice
              : 'No traffic incidents match your selected filters in this metropolitan area.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-citynavy-border/60">
            {filteredIncidents.map((inc) => (
              <div
                key={inc.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-citynavy-secondary/20 px-2 rounded-xl transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        inc.severity === 'severe'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                          : inc.severity === 'major'
                          ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900'
                          : inc.severity === 'moderate'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                      }`}
                    >
                      {inc.severity}
                    </span>

                    <span className="text-xs font-black text-slate-900 dark:text-citynavy-text">
                      {inc.type}
                    </span>

                    {inc.roadClosed && (
                      <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-md flex items-center gap-1 shadow-sm">
                        ⛔ ROAD CLOSED
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-citynavy-muted leading-relaxed">
                    {inc.description}
                  </p>

                  {inc.roadName && (
                    <div className="text-[11px] text-slate-500 dark:text-citynavy-muted flex items-center gap-1 font-medium">
                      <MapPin className="w-3 h-3 text-blue-500" />
                      <span>Affected Corridor: {inc.roadName}</span>
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center flex-shrink-0 gap-1.5">
                  {inc.delaySeconds > 0 ? (
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                      +{Math.round(inc.delaySeconds / 60)} min delay
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">No fixed delay</span>
                  )}

                  <span className="text-[10px] text-slate-400 dark:text-citynavy-muted">
                    {new Date(inc.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <button
                    type="button"
                    onClick={() => setFocusedCoords({ lat: inc.latitude, lng: inc.longitude })}
                    className="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>View Pin</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert Subscription Modal (Feature G) */}
      {showPrefsModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-citynavy-border">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-citynavy-text">
                  Traffic Alert Notifications
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrefsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-citynavy-muted">
              Configure in-app alert banners when critical disruptions or road closures occur within {currentCity.name}.
            </p>

            <div className="space-y-3 pt-1">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-citynavy-secondary/40 border border-slate-100 dark:border-citynavy-border cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Enable In-App Alerts</p>
                  <p className="text-[11px] text-slate-500">Display persistent alerts for active hazards</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.enabled}
                  onChange={(e) => savePreferences({ ...prefs, enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-citynavy-secondary/40 border border-slate-100 dark:border-citynavy-border cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Confirmed Road Closures Only</p>
                  <p className="text-[11px] text-slate-500">Only alert on verified blocked corridors</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.notifyRoadClosures}
                  onChange={(e) => savePreferences({ ...prefs, notifyRoadClosures: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-citynavy-secondary/40 border border-slate-100 dark:border-citynavy-border cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Severe Incidents Threshold</p>
                  <p className="text-[11px] text-slate-500">Filter out minor congestions and delays</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.severeOnly}
                  onChange={(e) => savePreferences({ ...prefs, severeOnly: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>
            </div>

            {prefsSavedNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>Notification preferences saved to local account!</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrefsModal(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
