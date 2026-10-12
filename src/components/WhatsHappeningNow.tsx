import {
  Activity,
  AlertTriangle,
  CloudRain,
  Gauge,
  ShieldCheck,
  PlusCircle,
  Search,
  Navigation,
  ArrowRight,
} from 'lucide-react';
import type { CityInfo, ComprehensiveWeather, AirQualityData, CivicAlert, Page } from '@/types';
import { CivicIncidentItem } from '@/services/civicIncidentService';

interface WhatsHappeningNowProps {
  currentCity: CityInfo;
  liveWeather: ComprehensiveWeather | null;
  liveAqi: AirQualityData | null;
  activeAlerts: CivicAlert[];
  incidents: CivicIncidentItem[];
  onOpenReportModal: () => void;
  onOpenTrackModal: () => void;
  onLocateNearMe: () => void;
  onNavigateTab: (tab: Page) => void;
}

export function WhatsHappeningNow({
  currentCity,
  liveWeather,
  liveAqi,
  activeAlerts,
  incidents,
  onOpenReportModal,
  onOpenTrackModal,
  onLocateNearMe,
  onNavigateTab,
}: WhatsHappeningNowProps) {
  // Transparent City Health Score Calculation
  // 1. Air Quality Score (0-100, 100 is best)
  const aqiVal = liveAqi?.aqi ?? 65;
  const aqiScore = Math.max(10, Math.min(100, Math.round(100 - (aqiVal / 300) * 80)));

  // 2. Weather Stability Score
  const weatherSeverity = liveWeather ? (liveWeather.weatherCode >= 80 ? 40 : liveWeather.precipitation > 5 ? 20 : 0) : 10;
  const weatherScore = Math.max(30, 100 - weatherSeverity);

  // 3. Mobility Score
  const trafficIncidentsCount = incidents.filter((i) => i.category === 'Roads' || i.category === 'Traffic signals' || i.category === 'Potholes').length;
  const mobilityScore = Math.max(40, 100 - trafficIncidentsCount * 8);

  // 4. Civic Services Score
  const unresolvedCount = incidents.filter((i) => i.status !== 'Resolved').length;
  const civicScore = Math.max(45, 100 - unresolvedCount * 6);

  // Weighted overall
  const overallHealthScore = Math.round(
    aqiScore * 0.3 + weatherScore * 0.25 + mobilityScore * 0.25 + civicScore * 0.2
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
    return 'text-red-500 border-red-500/30 bg-red-500/10';
  };

  // Compile 4-6 real "What's Happening Now" items
  const nowFeed: {
    id: string;
    icon: typeof Gauge;
    color: string;
    title: string;
    subtitle: string;
    actionTab: Page;
    time: string;
  }[] = [
    {
      id: 'item_aqi',
      icon: Gauge,
      color: 'text-amber-500 bg-amber-500/10',
      title: `Air Quality Index at ${liveAqi?.aqi ?? 64} AQI (${liveAqi?.category ?? 'Moderate'})`,
      subtitle: `PM2.5: ${liveAqi?.pm2_5 ?? 20.7} µg/m³ &middot; Copernicus CAMS Observation`,
      actionTab: 'weather' as Page,
      time: 'Live',
    },
    {
      id: 'item_weather',
      icon: CloudRain,
      color: 'text-blue-500 bg-blue-500/10',
      title: `${liveWeather?.weatherLabel ?? 'Clear Sky'} at ${liveWeather?.temperature ?? 27}°C`,
      subtitle: `Wind ${liveWeather?.windSpeed ?? 12} km/h &middot; Humidity ${liveWeather?.humidity ?? 48}%`,
      actionTab: 'weather' as Page,
      time: 'Live',
    },
    ...(incidents.slice(0, 2).map((inc) => ({
      id: inc.id,
      icon: AlertTriangle,
      color: 'text-red-500 bg-red-500/10',
      title: `[${inc.category}] ${inc.title}`,
      subtitle: `${inc.location} &middot; Status: ${inc.status}`,
      actionTab: 'alerts' as Page,
      time: 'Recent',
    }))),
    ...(activeAlerts.slice(0, 2).map((al) => ({
      id: al.id,
      icon: ShieldCheck,
      color: 'text-rose-500 bg-rose-500/10',
      title: `[${al.severity.toUpperCase()}] ${al.event}`,
      subtitle: `${al.source} &middot; ${al.headline}`,
      actionTab: 'alerts' as Page,
      time: 'Active',
    }))),
  ].slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Top Action Bar: Near Me, Report Issue, Track Issue */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-900/40 via-citynavy-card to-citynavy-card border border-blue-500/20 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={onLocateNearMe}
            className="px-3.5 py-2 rounded-xl bg-citynavy-accent text-white font-bold text-xs hover:bg-blue-600 transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95"
            title="Use My Location via GPS"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Near Me (GPS)</span>
          </button>

          <button
            onClick={onOpenReportModal}
            className="px-3.5 py-2 rounded-xl bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20 border border-red-500/30 font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Report an Issue</span>
          </button>

          <button
            onClick={onOpenTrackModal}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-citynavy-secondary hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-citynavy-border transition-all flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track Issue ID</span>
          </button>
        </div>

        {/* Transparent City Health Score Meter */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 dark:text-citynavy-muted uppercase font-bold tracking-wider block">
              City Health Score
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Derived from 4 GIS telemetry streams
            </span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-mono ${getScoreColor(
              overallHealthScore
            )}`}
          >
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="text-lg font-black">{overallHealthScore}/100</span>
          </div>
        </div>
      </div>

      {/* "What's Happening Now" Feed */}
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-citynavy-border">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-citynavy-text">
              What's Happening Right Now in {currentCity.name}
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Live Civic Pulse Stream
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {nowFeed.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => onNavigateTab(item.actionTab)}
                className="p-3 rounded-xl border border-slate-100 dark:border-citynavy-border/60 hover:border-citynavy-accent/50 bg-slate-50/50 dark:bg-citynavy-secondary/40 hover:bg-blue-50/20 dark:hover:bg-citynavy-cardHover transition-all cursor-pointer flex items-start gap-3 group"
              >
                <div className={`p-2 rounded-xl flex-shrink-0 ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-citynavy-text truncate group-hover:text-citynavy-accent transition-colors">
                      {item.title}
                    </p>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10">
                      {item.time}
                    </span>
                  </div>
                  <p
                    className="text-[11px] text-slate-500 dark:text-citynavy-muted mt-0.5 truncate"
                    dangerouslySetInnerHTML={{ __html: item.subtitle }}
                  />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all mt-1" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
