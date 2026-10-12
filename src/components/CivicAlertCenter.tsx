import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  MapPin,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { fetchCivicAlerts } from '@/services/alertService';
import { fetchComprehensiveWeather, fetchAirQuality } from '@/services/weatherService';
import type { CivicAlert, CityInfo } from '@/types';

interface CivicAlertCenterProps {
  currentCity: CityInfo;
}

export function CivicAlertCenter({ currentCity }: CivicAlertCenterProps) {
  const [alerts, setAlerts] = useState<CivicAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      fetchComprehensiveWeather(currentCity.latitude, currentCity.longitude).catch(() => undefined),
      fetchAirQuality(currentCity.latitude, currentCity.longitude).catch(() => undefined),
    ]).then(([weather, aqi]) => {
      fetchCivicAlerts(currentCity.latitude, currentCity.longitude, weather, aqi).then((res) => {
        if (active) {
          setAlerts(res);
          setLoading(false);
        }
      });
    });

    return () => {
      active = false;
    };
  }, [currentCity.latitude, currentCity.longitude]);

  const filtered = alerts.filter((a) =>
    filterSeverity === 'all' ? true : a.severity === filterSeverity
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-citynavy-text">
                Verified Civic Alert & Emergency Operations Center
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-citynavy-muted mt-1">
              Active bulletins, hazard statements, and public emergency notices for {currentCity.label}
            </p>
          </div>

          {/* Severity Filter Chips */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-citynavy-secondary p-1 rounded-xl">
            {['all', 'critical', 'warning', 'watch', 'advisory'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filterSeverity === sev
                    ? 'bg-white dark:bg-citynavy-card text-citynavy-accent shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Feed */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-citynavy-accent animate-spin" />
          <p className="text-xs text-slate-400">Scanning public emergency feeds and meteorological advisories...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-12 text-center shadow-sm space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-citynavy-text">
            No Active Severe Bulletins
          </h3>
          <p className="text-xs text-slate-500 dark:text-citynavy-muted max-w-md mx-auto leading-relaxed">
            There are currently no active public safety emergency bulletins or severe weather watches in
            effect for this location. Feeds are continuously checked against official government agencies.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isCritical
                    ? 'bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
                    : isWarning
                    ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                    : 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isCritical
                            ? 'bg-red-500 text-white'
                            : isWarning
                            ? 'bg-amber-500 text-white'
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {alert.event}
                      </h4>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {alert.headline}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                      {alert.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <span className="text-slate-400">Source:</span> {alert.source}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {alert.areaDesc}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Effective: {new Date(alert.effective).toLocaleString()}
                  </span>
                  {alert.expires && (
                    <span className="flex items-center gap-1 text-slate-400">
                      Expires: {new Date(alert.expires).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
