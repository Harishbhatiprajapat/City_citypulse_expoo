import type { Zone } from '@/types';

interface SeverityGaugeProps {
  zone: Zone;
}

export function SeverityGauge({ zone }: SeverityGaugeProps) {
  const score = zone.severityScore;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#10b981';

  const label =
    score >= 70 ? 'Critical' : score >= 40 ? 'Elevated' : 'Low Risk';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-5 flex items-center gap-6">
      <div className="relative flex-shrink-0" style={{ width: '140px', height: '140px' }}>
        <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="10"
            className="dark:stroke-slate-800"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-900 dark:text-white">{score}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">/ 100</span>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
          Severity Score
        </h3>
        <p className="text-2xl font-bold tracking-tight" style={{ color }}>
          {label}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          {zone.name} zone — computed from weather severity, transit disruption, and complaint anomaly deviation.
        </p>
      </div>
    </div>
  );
}
