import { Cloud, Bus, MessageSquareWarning, ArrowUp, ArrowDown, Minus, ChevronDown } from 'lucide-react';
import type { Zone, ZoneStat } from '@/types';

interface ZoneCardProps {
  zone: Zone;
  isExpanded: boolean;
  onToggle: () => void;
}

const statusConfig = {
  normal: {
    label: 'Normal',
    border: 'border-l-emerald-500',
    pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  watch: {
    label: 'Watch',
    border: 'border-l-amber-500',
    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  alert: {
    label: 'Alert',
    border: 'border-l-red-500',
    pill: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500',
  },
};

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <ArrowUp className="w-3 h-3 text-red-500" />;
  if (trend === 'down') return <ArrowDown className="w-3 h-3 text-emerald-500" />;
  return <Minus className="w-3 h-3 text-slate-400" />;
}

function StatRow({ icon: Icon, label, stat }: { icon: React.ElementType; label: string; stat: ZoneStat }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{stat.value}</span>
        <TrendIcon trend={stat.trend} />
      </div>
    </div>
  );
}

const eventTypeIcon: Record<string, React.ElementType> = {
  complaint: MessageSquareWarning,
  weather: Cloud,
  transit: Bus,
  civic: Cloud,
};

export function ZoneCard({ zone, isExpanded, onToggle }: ZoneCardProps) {
  const cfg = statusConfig[zone.status];

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 ${cfg.border} rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden`}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${cfg.dot} ${zone.status === 'alert' ? 'animate-pulse-slow' : ''}`} />
            <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{zone.name}</h3>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.pill}`}>
            {cfg.label}
          </span>
        </div>

        <div className="space-y-0.5">
          <StatRow icon={Cloud} label="Weather" stat={zone.weather} />
          <StatRow icon={Bus} label="Transit" stat={zone.transit} />
          <StatRow icon={MessageSquareWarning} label="Complaints" stat={zone.complaints} />
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">Severity Score</span>
          <span
            className={`text-lg font-bold ${
              zone.severityScore >= 70
                ? 'text-red-500'
                : zone.severityScore >= 40
                ? 'text-amber-500'
                : 'text-emerald-500'
            }`}
          >
            {zone.severityScore}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-center gap-1 text-xs text-blue-500 dark:text-blue-400">
          <span>{isExpanded ? 'Hide details' : 'View details'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50 dark:bg-slate-950/50 animate-fade-in">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Recent Events
          </h4>
          <ul className="space-y-2">
            {zone.recentEvents.map((event, i) => {
              const Icon = eventTypeIcon[event.type] || Cloud;
              return (
                <li key={i} className="flex items-start gap-2">
                  <Icon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{event.text}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{event.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
