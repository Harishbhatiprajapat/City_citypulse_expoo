import { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Mail,
  MapPin,
  Sun,
  Moon,
  Save,
  Loader2,
  Calendar,
  Bookmark,
  Navigation,
  Trash2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchSavedPlaces, removeSavedPlace } from '@/services/savedPlacesService';
import { getSavedJourneys, removeSavedJourney } from '@/services/savedJourneysService';
import type { Page, SavedPlace, SavedJourney } from '@/types';

interface AccountPageProps {
  onNavigate: (page: Page) => void;
}

export function AccountPage({ onNavigate }: AccountPageProps) {
  const { user, fullName, setFullName, favoriteCity, setFavoriteCity, theme, setTheme, signOut } = useAuth();
  const [editName, setEditName] = useState(fullName);
  const [editCity, setEditCity] = useState(favoriteCity);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [journeys, setJourneys] = useState<SavedJourney[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    setEditName(fullName);
    setEditCity(favoriteCity);
  }, [fullName, favoriteCity]);

  useEffect(() => {
    let isMounted = true;
    async function loadUserData() {
      setLoadingData(true);
      try {
        const [p, j] = await Promise.all([
          fetchSavedPlaces(user?.id),
          getSavedJourneys(user?.id),
        ]);
        if (isMounted) {
          setPlaces(p);
          setJourneys(j);
        }
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }
    loadUserData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 bg-slate-50 dark:bg-citynavy">
        <div className="text-center max-w-sm bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-8 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-citynavy-accent flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-citynavy-text mb-1">
            Authentication Required
          </h2>
          <p className="text-xs text-slate-500 dark:text-citynavy-muted mb-5 leading-relaxed">
            Please sign in to access your saved places, journeys, and personalized city settings.
          </p>
          <button
            onClick={() => onNavigate('login')}
            className="w-full py-2.5 bg-citynavy-accent hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  async function handleSaveProfile() {
    setSaving(true);
    await setFullName(editName);
    await setFavoriteCity(editCity);
    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  }

  async function handleDeletePlace(id: string) {
    await removeSavedPlace(id, user?.id);
    const updated = await fetchSavedPlaces(user?.id);
    setPlaces(updated);
  }

  async function handleDeleteJourney(id: string) {
    await removeSavedJourney(id, user?.id);
    const updated = await getSavedJourneys(user?.id);
    setJourneys(updated);
  }

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active Session';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-citynavy py-8 px-4 sm:px-6 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
              <UserIcon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-citynavy-text">
                {fullName || 'CityPulse Citizen Profile'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-citynavy-muted mt-0.5">
                {user.email} &bull; Member since {memberSince}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Authenticated</span>
          </span>
        </div>

        {/* Profile Details Form */}
        <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-citynavy-text uppercase tracking-wider">
            Personalization & Region Settings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                Display Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl focus:outline-none focus:ring-1 focus:ring-citynavy-accent text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                Default Favorite City
              </label>
              <input
                type="text"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                placeholder="e.g. Jaipur, Delhi, Mumbai"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl focus:outline-none focus:ring-1 focus:ring-citynavy-accent text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {savedSuccess && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold animate-pulse">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Changes synchronized successfully!</span>
                </span>
              )}
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-4 py-2 bg-citynavy-accent hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Saved Places Grid */}
        <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-citynavy-accent" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-citynavy-text uppercase tracking-wider">
                Cloud Synchronized Bookmarks ({places.length})
              </h2>
            </div>
            <button
              onClick={() => onNavigate('saved')}
              className="text-xs text-citynavy-accent hover:underline font-semibold"
            >
              Manage all places &rarr;
            </button>
          </div>

          {loadingData ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-citynavy-accent" />
              <span>Fetching cloud bookmarks...</span>
            </div>
          ) : places.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-citynavy-muted py-3">
              No saved facilities yet. Star any hospital or school from the Explore Map to pin it here.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {places.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-citynavy-secondary/60 border border-slate-200/60 dark:border-citynavy-border flex items-center justify-between text-xs"
                >
                  <div className="overflow-hidden pr-2">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-citynavy-muted truncate">
                      {p.label || `${p.latitude.toFixed(3)}, ${p.longitude.toFixed(3)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeletePlace(p.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Remove place"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved Journeys Grid */}
        <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-citynavy-text uppercase tracking-wider">
                Saved Multi-Route Journeys ({journeys.length})
              </h2>
            </div>
            <button
              onClick={() => onNavigate('routes')}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Open Journey Planner &rarr;
            </button>
          </div>

          {loadingData ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              <span>Fetching saved routes...</span>
            </div>
          ) : journeys.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-citynavy-muted py-3">
              No saved itineraries yet. Plan and save your daily commute in the Routes tab.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {journeys.slice(0, 4).map((j) => (
                <div
                  key={j.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-citynavy-secondary/60 border border-slate-200/60 dark:border-citynavy-border flex items-center justify-between text-xs"
                >
                  <div className="overflow-hidden pr-2">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {j.originName} &rarr; {j.destName}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-citynavy-muted">
                      {j.distanceKm} km &bull; {j.durationMins} mins &bull; {j.travelMode}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteJourney(j.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Remove journey"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Appearance & Session Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl shadow-sm p-6">
            <h3 className="text-xs font-bold text-slate-900 dark:text-citynavy-text uppercase tracking-wider mb-3">
              Cartography Theme
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  theme === 'light'
                    ? 'bg-blue-50 text-citynavy-accent border border-blue-200 font-bold'
                    : 'bg-slate-50 dark:bg-citynavy-secondary text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  theme === 'dark'
                    ? 'bg-blue-950/60 text-blue-400 border border-blue-800 font-bold'
                    : 'bg-slate-50 dark:bg-citynavy-secondary text-slate-600 dark:text-slate-400'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-citynavy-text uppercase tracking-wider mb-1">
                Account Session
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-citynavy-muted">
                End active session on this device. Your cloud data remains secured.
              </p>
            </div>
            <button
              onClick={signOut}
              className="mt-3 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-bold rounded-xl transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
