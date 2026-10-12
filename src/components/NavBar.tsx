import { useState } from 'react';
import {
  Activity,
  RefreshCw,
  Loader2,
  Sun,
  Moon,
  Search,
  LogOut,
  User,
  Clock,
  Compass,
  Car,
  Cloud,
  ShieldAlert,
  Bookmark,
  Settings,
  Sparkles,
  Menu,
  X,
  Navigation,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Page } from '@/types';

interface NavBarProps {
  lastUpdated: Date;
  onRefresh: () => void;
  isRefreshing: boolean;
  hasAlert: boolean;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onSearchFocus: () => void;
}

export function NavBar({
  lastUpdated,
  onRefresh,
  isRefreshing,
  hasAlert,
  currentPage,
  onNavigate,
  onSearchFocus,
}: NavBarProps) {
  const { user, signOut, theme, setTheme } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainNavLinks: { label: string; page: Page; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: 'Overview', page: 'overview', icon: Activity },
    { label: 'Explore Map', page: 'explore', icon: Compass },
    { label: 'Traffic', page: 'traffic', icon: Car },
    { label: 'Weather & AQI', page: 'weather', icon: Cloud },
    { label: '7-Day Forecast', page: 'forecast', icon: Calendar },
    { label: 'Civic Alerts', page: 'alerts', icon: ShieldAlert },
    { label: 'Routes', page: 'routes', icon: Navigation },
    { label: 'Saved', page: 'saved', icon: Bookmark },
    { label: 'Settings', page: 'settings', icon: Settings },
    { label: 'AI Assistant', page: 'ai', icon: Sparkles },
  ];

  function handleNav(page: Page) {
    onNavigate(page);
    setMobileMenuOpen(false);
  }

  // Treat 'dashboard' as 'overview'
  const isPageActive = (target: Page) => {
    if (target === 'overview' && (currentPage === 'overview' || currentPage === 'dashboard')) return true;
    return currentPage === target;
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-citynavy/95 backdrop-blur-md border-b border-slate-200 dark:border-citynavy-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => handleNav('overview')}
              className="flex items-center gap-2.5 text-left group"
              aria-label="CityPulse Home"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white block">
                  CityPulse
                </span>
                <span className="text-[10px] text-slate-400 dark:text-citynavy-muted font-medium hidden sm:block -mt-0.5">
                  Smart City Intelligence
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1 overflow-x-auto">
            {mainNavLinks.map((item) => {
              const active = isPageActive(item.page);
              const Icon = item.icon;
              return (
                <button
                  key={item.page}
                  onClick={() => handleNav(item.page)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    active
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-citynavy-card'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Toolbar Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border">
              <span
                className={`w-2 h-2 rounded-full ${
                  hasAlert ? 'bg-amber-500' : 'bg-emerald-500'
                } animate-pulse-slow`}
              />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                {hasAlert ? 'Alert Active' : 'GIS Live'}
              </span>
            </div>

            {/* Global Search Focus Button */}
            <button
              onClick={onSearchFocus}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-citynavy-card transition-colors"
              title="Search worldwide cities"
              aria-label="Search cities"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-citynavy-card transition-colors disabled:opacity-50"
              title="Refresh telemetry"
              aria-label="Refresh telemetry"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin text-citynavy-accent" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>

            {/* Dark / Light Mode Switcher */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-citynavy-card transition-colors"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Auth / Account */}
            {user ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleNav('account')}
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-citynavy-card transition-colors"
                  title="My Account"
                  aria-label="My Account"
                >
                  <User className="w-4 h-4" />
                </button>
                <button
                  onClick={signOut}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNav('login')}
                className="px-3 py-1.5 rounded-xl bg-citynavy-accent text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20"
              >
                Sign In
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="xl:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-citynavy-card"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Navigation Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden py-3 border-t border-slate-100 dark:border-citynavy-border space-y-1 animate-slide-down">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 pb-2">
              {mainNavLinks.map((item) => {
                const active = isPageActive(item.page);
                const Icon = item.icon;
                return (
                  <button
                    key={item.page}
                    onClick={() => handleNav(item.page)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                      active
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-citynavy-card'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-citynavy-border flex items-center justify-between text-xs text-slate-500 dark:text-citynavy-muted px-2">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={() => handleNav('about')}
                className="hover:underline text-citynavy-accent"
              >
                About Platform
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sub-bar Navigation for Desktop (Medium Viewport) */}
      <div className="hidden md:flex xl:hidden border-t border-slate-100 dark:border-citynavy-border px-4 py-1.5 overflow-x-auto gap-1 scrollbar-none">
        {mainNavLinks.map((item) => {
          const active = isPageActive(item.page);
          const Icon = item.icon;
          return (
            <button
              key={item.page}
              onClick={() => handleNav(item.page)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-citynavy-card'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
