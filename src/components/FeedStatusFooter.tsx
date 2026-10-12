import { Cloud, Bus, MessageSquareWarning, Compass, Navigation, Shield } from 'lucide-react';

interface FeedStatusFooterProps {
  tomtomConnected?: boolean;
}

export function FeedStatusFooter({ tomtomConnected }: FeedStatusFooterProps) {
  const feeds = [
    { name: 'Open-Meteo Atmospheric Observation', status: 'Live Telemetry', icon: Cloud, active: true },
    { name: 'Copernicus CAMS Air Quality', status: 'Live Telemetry', icon: Shield, active: true },
    { name: 'OpenStreetMap Geospatial Facility Index', status: 'Live Query', icon: Compass, active: true },
    { name: 'OSRM Road Topology & Route Machine', status: 'Active', icon: Navigation, active: true },
    { name: 'Official Civic & NWS Bulletins', status: 'Verified', icon: MessageSquareWarning, active: true },
    {
      name: 'TomTom Probe Flow & Incidents',
      status: tomtomConnected ? 'Connected' : 'Telemetry Ready',
      icon: Bus,
      active: tomtomConnected,
    },
  ];

  return (
    <footer className="border-t border-slate-200 dark:border-citynavy-border bg-white dark:bg-citynavy-secondary/90 px-4 sm:px-6 py-4 mt-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
          <span className="font-semibold text-slate-500 dark:text-citynavy-muted mr-1">
            Verified Geospatial Feeds:
          </span>
          {feeds.map((feed) => (
            <div
              key={feed.name}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border"
            >
              <feed.icon className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300">
                {feed.name}:{' '}
                <span className={feed.active ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 font-medium'}>
                  {feed.status}
                </span>
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  feed.active ? 'bg-emerald-500 animate-pulse-slow' : 'bg-slate-400'
                }`}
              />
            </div>
          ))}
        </div>

        <div className="text-slate-400 dark:text-citynavy-muted text-[11px] text-center md:text-right">
          CityPulse Smart City Intelligence Platform &copy; {new Date().getFullYear()} &middot; Open GIS Standards
        </div>
      </div>
    </footer>
  );
}
