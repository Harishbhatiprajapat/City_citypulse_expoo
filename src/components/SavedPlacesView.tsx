import { useState, useEffect } from 'react';
import { Bookmark, MapPin, Trash2, Navigation } from 'lucide-react';
import { getSavedPlaces, fetchSavedPlaces, removeSavedPlace } from '@/services/savedPlacesService';
import { calculateDistanceKm } from '@/services/geoService';
import { useAuth } from '@/contexts/AuthContext';
import type { SavedPlace, CityInfo } from '@/types';

interface SavedPlacesViewProps {
  currentCity?: CityInfo;
  onPlanRouteTo?: (destName: string, lat: number, lng: number) => void;
  onSelectCoordinates?: (lat: number, lng: number) => void;
}

export function SavedPlacesView({
  currentCity,
  onPlanRouteTo,
  onSelectCoordinates,
}: SavedPlacesViewProps) {
  const { user } = useAuth();
  const [places, setPlaces] = useState<SavedPlace[]>([]);

  useEffect(() => {
    fetchSavedPlaces(user?.id).then(setPlaces);
  }, [user]);

  async function handleDelete(id: string) {
    await removeSavedPlace(id, user?.id);
    const updated = await fetchSavedPlaces(user?.id);
    setPlaces(updated);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-citynavy-accent">
              <Bookmark className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-citynavy-text">
              Saved Places & Civic Bookmarks
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-citynavy-muted mt-1">
            Quickly access your frequent hospitals, schools, stations, and key municipal coordinates
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-citynavy-secondary text-slate-600 dark:text-slate-300">
          {places.length} saved
        </span>
      </div>

      {places.length === 0 ? (
        <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-12 text-center shadow-sm space-y-3">
          <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-citynavy-text">
            No Bookmarked Locations Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-citynavy-muted max-w-md mx-auto leading-relaxed">
            While exploring the interactive map or nearby services, click the bookmark icon on any hospital,
            transit hub, school, or municipal facility to pin it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {places.map((place) => (
            <div
              key={place.id}
              className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      {place.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-citynavy-text mt-1.5">
                      {place.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-citynavy-muted mt-0.5 line-clamp-2">
                      {place.label}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(place.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    title="Remove saved place"
                    aria-label="Remove saved place"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-citynavy-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-citynavy-muted">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}</span>
                  </span>
                  {currentCity && (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      &middot; {calculateDistanceKm(currentCity.latitude, currentCity.longitude, place.latitude, place.longitude)} km away
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {onSelectCoordinates && (
                    <button
                      onClick={() => onSelectCoordinates(place.latitude, place.longitude)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-citynavy-border text-slate-600 dark:text-slate-300 font-medium text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      View on Map
                    </button>
                  )}
                  {onPlanRouteTo && (
                    <button
                      onClick={() => onPlanRouteTo(place.name, place.latitude, place.longitude)}
                      className="px-2.5 py-1 rounded-lg bg-citynavy-accent text-white font-medium text-[11px] hover:bg-blue-600 transition-colors flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Directions</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
