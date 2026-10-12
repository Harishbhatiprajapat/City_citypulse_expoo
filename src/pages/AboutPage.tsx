import { Activity, Cloud, Bus, MessageSquareWarning, Brain, Map, Clock, Shield, Search } from 'lucide-react';
import type { Page } from '@/types';

interface AboutPageProps {
  onNavigate: (page: Page) => void;
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  const features = [
    {
      icon: Map,
      title: 'Live Zone Mapping',
      desc: 'Interactive SVG-based map showing real-time health status of every neighborhood zone, with color-coded severity overlays and pulsing alert markers.',
    },
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      desc: 'Plain-language summaries of complex situations, plus correlation explanations that surface hidden relationships between weather, transit, and civic complaints.',
    },
    {
      icon: Shield,
      title: 'Severity Scoring',
      desc: 'Each zone gets a 0-100 severity score computed from weather intensity, transit disruption levels, and complaint anomaly deviation from baseline.',
    },
    {
      icon: Clock,
      title: 'Historical Replay',
      desc: 'Scrub through 24-hour, 7-day, or 30-day timelines to replay how events unfolded — ideal for post-incident analysis and pattern discovery.',
    },
    {
      icon: Search,
      title: 'City Search',
      desc: 'Search any city to instantly see all zone updates, alerts, and live feeds. Your searches are saved to your personal history for quick reference.',
    },
    {
      icon: Activity,
      title: 'Anomaly Detection',
      desc: 'Automatic threshold-based anomaly detection flags when complaint volume exceeds historical baselines, with alert banners explaining the likely cause.',
    },
  ];

  const dataSources = [
    { icon: Cloud, name: 'Weather API', desc: 'Real-time weather conditions, storm warnings, and precipitation data' },
    { icon: Bus, name: 'Transit Feed', desc: 'Live transit delay tracking, service disruptions, and route detours' },
    { icon: MessageSquareWarning, name: 'Civic Reports', desc: '311 complaint data, road issues, and citizen-reported incidents' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500 shadow-xl shadow-blue-500/30 mb-4">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
            CityPulse
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            A real-time neighborhood health monitor that fuses weather, transit, and civic complaint data
            into one glanceable view — with anomaly detection and AI-powered explanations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {features.map((feat, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 hover:shadow-lg transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-3">
                <feat.icon className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white mb-1.5">
                {feat.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Data Sources</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            CityPulse integrates three independent data feeds and correlates them to detect anomalies
            that no single source would reveal on its own.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {dataSources.map((src, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <src.icon className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{src.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{src.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-6 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white mb-2">
            Ready to explore your city?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Jump into the live dashboard and see real-time zone health at a glance.
          </p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors shadow-md shadow-blue-500/20"
          >
            View Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
