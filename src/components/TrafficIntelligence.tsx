import { useState, useEffect } from 'react';
import {
  Car,
  AlertTriangle,
  Loader2,
  Key,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { LiveMap } from './LiveMap';
import { fetchLiveTrafficIncidents, getTrafficProviderConfig } from '@/services/trafficService';
import type { Zone, CityInfo, TrafficIncident } from '@/types';

interface TrafficIntelligenceProps {
  zones: Zone[];
  selectedZoneId: number | null;
  onSelectZone: (id: number) => void;
  currentCity: CityInfo;
  tomtomKey?: string;
  onOpenSettings?: () => void;
}

export function TrafficIntelligence({
  zones,
  selectedZoneId,
  onSelectZone,
  currentCity,
  tomtomKey,
  onOpenSettings,
}: TrafficIntelligenceProps) {
  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const providerConfig = getTrafficProviderConfig(tomtomKey);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchLiveTrafficIncidents(
      currentCity.latitude,
      currentCity.longitude,
      15,
      tomtomKey
    ).then((res) => {
      if (active) {
        setIncidents(res.incidents);
        setNotice(res.notice || null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [currentCity.latitude, currentCity.longitude, tomtomKey]);

  return (
    <div className="space-y-6">
      {/* Traffic Header & Provider Status */}
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-citynavy-accent">
                <Car className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-citynavy-text">
                Live Traffic Intelligence & Probe Telemetry
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-citynavy-muted mt-1">
              Corridor monitoring, flow classification, and traffic incidents for {currentCity.label}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {providerConfig.hasApiKey ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                TomTom Telemetry Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-200 dark:border-amber-800">
                <Info className="w-3.5 h-3.5" />
                Live Telemetry Key Pending
              </span>
            )}
          </div>
        </div>

        {/* Informational banner when TomTom key is not configured */}
        {!providerConfig.hasApiKey && (
          <div className="bg-slate-50 dark:bg-citynavy-secondary/60 border border-slate-200 dark:border-citynavy-border rounded-xl p-4 flex items-start gap-3 text-xs">
            <Key className="w-4 h-4 text-citynavy-accent flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-800 dark:text-citynavy-text">
                Connect Real-Time TomTom Traffic Flow Tiles & Incident Data
              </p>
              <p className="text-slate-500 dark:text-citynavy-muted leading-relaxed">
                CityPulse strictly adheres to data integrity rules: we never generate fake random road
                colors or simulated traffic probe data. To display road-level live green/yellow/red traffic
                raster tiles and live probe incidents, configure your free{' '}
                <a
                  href="https://developer.tomtom.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-citynavy-accent underline"
                >
                  TomTom API Key
                </a>{' '}
                in Settings or add <code className="text-slate-700 dark:text-slate-300 font-mono">VITE_TOMTOM_API_KEY</code> to your environment.
              </p>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="mt-1 inline-flex items-center gap-1 font-semibold text-citynavy-accent hover:underline"
                >
                  Configure in Settings &rarr;
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Traffic Map with Live Flow Layer Enabled */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-800 dark:text-citynavy-text">
            Corridor Map & Live Overlay
          </h3>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-citynavy-muted">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Free-flowing
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Moderate
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Heavy
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Severe Congestion
            </span>
          </div>
        </div>

        <LiveMap
          zones={zones}
          selectedZoneId={selectedZoneId}
          onSelectZone={onSelectZone}
          cityLabel={currentCity.label}
          cityCoords={{ lat: currentCity.latitude, lng: currentCity.longitude }}
          trafficIncidents={incidents}
          tomtomKey={tomtomKey}
          heightClass="h-[460px] sm:h-[520px]"
        />
      </div>

      {/* Verified Traffic Incidents & Road Disruption Table */}
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-citynavy-text">
              Active Traffic Incidents & Road Closures
            </h3>
          </div>
          <span className="text-xs text-slate-400 dark:text-citynavy-muted">
            {incidents.length} incident(s) reported
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-citynavy-accent animate-spin" />
            <p className="text-xs text-slate-400">Scanning traffic provider telemetry...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 dark:text-citynavy-muted bg-slate-50 dark:bg-citynavy-secondary/30 rounded-xl px-4 leading-relaxed">
            {notice
              ? notice
              : providerConfig.hasApiKey
              ? 'No active traffic incidents or major road closures reported in this metro area.'
              : 'Add your TomTom API Key to populate real-time probe telemetry and road-closure incidents.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-citynavy-border/60">
            {incidents.map((inc) => (
              <div key={inc.id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        inc.severity === 'severe'
                          ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                          : inc.severity === 'major'
                          ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                          : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {inc.severity}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-citynavy-text">
                      {inc.type}
                    </span>
                    {inc.roadClosed && (
                      <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
                        ROAD CLOSED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-citynavy-muted">{inc.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    +{Math.round(inc.delaySeconds / 60)} min delay
                  </span>
                  <p className="text-[10px] text-slate-400 dark:text-citynavy-muted">
                    {new Date(inc.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
