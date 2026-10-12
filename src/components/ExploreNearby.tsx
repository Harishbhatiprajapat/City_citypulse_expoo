import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Compass,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Loader2,
  MapPin,
  ExternalLink,
  Navigation,
  Phone,
  Clock,
  Sparkles,
  AlertCircle,
  X,
  Search,
} from 'lucide-react';
import type { POICategory, POIPlace } from '@/types';
import {
  POI_CATEGORIES,
  PRIMARY_POI_CATEGORY_IDS,
  SECONDARY_POI_CATEGORY_IDS,
  getCategoryMeta,
  searchPlacesFree,
  geocodeLocation,
} from '@/services/geoService';

export interface ExploreNearbyProps {
  center: { lat: number; lng: number; label: string };
  onCenterChange: (center: { lat: number; lng: number; label: string }) => void;
  radiusKm: number;
  onRadiusChange: (radiusKm: number) => void;
  showMapRing: boolean;
  onToggleMapRing: (show: boolean) => void;
  selectedCategory: POICategory | null;
  onSelectCategory: (cat: POICategory | null) => void;
  places: POIPlace[];
  loading: boolean;
  error: string | null;
  selectedPlace: POIPlace | null;
  onSelectPlace: (place: POIPlace | null) => void;
  onPlanRouteTo?: (name: string, lat: number, lng: number) => void;
  cityName: string;
}

const RADIUS_OPTIONS = [
  { label: '500 m', value: 0.5 },
  { label: '1 km', value: 1.0 },
  { label: '2 km', value: 2.0 },
  { label: '5 km', value: 5.0 },
  { label: '10 km', value: 10.0 },
];

export function ExploreNearby({
  center,
  onCenterChange,
  radiusKm,
  onRadiusChange,
  showMapRing,
  onToggleMapRing,
  selectedCategory,
  onSelectCategory,
  places,
  loading,
  error,
  selectedPlace,
  onSelectPlace,
  onPlanRouteTo,
  cityName,
}: ExploreNearbyProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeNotice, setGeocodeNotice] = useState<string | null>(null);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(event.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    }
    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreMenuOpen]);

  // Close more menu on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && moreMenuOpen) {
        setMoreMenuOpen(false);
        moreButtonRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moreMenuOpen]);

  const activeRadiusLabel =
    RADIUS_OPTIONS.find((r) => Math.abs(r.value - radiusKm) < 0.05)?.label ||
    `${radiusKm < 1 ? Math.round(radiusKm * 1000) + ' m' : radiusKm + ' km'}`;

  const currentCatMeta = selectedCategory ? getCategoryMeta(selectedCategory) : null;

  // Handle location geocode
  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim() || isGeocoding) return;

    setIsGeocoding(true);
    setGeocodeNotice(null);

    try {
      const result = await geocodeLocation(addressInput.trim());
      if (result) {
        onCenterChange({
          lat: result.lat,
          lng: result.lng,
          label: result.label,
        });
        setAddressInput('');
        setSearchFocused(false);
      } else {
        setGeocodeNotice(`Could not find "${addressInput}". Try a landmark or city name.`);
      }
    } catch {
      setGeocodeNotice('Address geocoding request failed. Please retry.');
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="w-full bg-[#0a1120] text-slate-100 rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-800/90 relative overflow-visible transition-all">
      {/* Top Header Deck (Reference Image 1) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        {/* Left: Icon, Title, Pill Badge, Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Explore Nearby
              </h2>
              {selectedCategory && currentCatMeta ? (
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-semibold shadow-sm flex items-center gap-1 text-white"
                  style={{ backgroundColor: currentCatMeta.color }}
                >
                  <span>{currentCatMeta.emoji}</span>
                  <span>{currentCatMeta.label}</span>
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  Select a category
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live OpenStreetMap discovery within {activeRadiusLabel}
              <span className="text-slate-500 ml-1.5 hidden sm:inline">
                · Center: {center.label.split(',')[0]}
              </span>
            </p>
          </div>
        </div>

        {/* Right: WITHIN Radius Selector + Map Ring Toggle Button */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Within Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 select-none">
              WITHIN:
            </span>
            {RADIUS_OPTIONS.map((opt) => {
              const isActive = Math.abs(opt.value - radiusKm) < 0.05;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => onRadiusChange(opt.value)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-xl transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 font-bold scale-105'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                  aria-pressed={isActive}
                  title={`Search within ${opt.label} radius`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Map Ring Toggle (Reference Image 1) */}
          <button
            type="button"
            onClick={() => onToggleMapRing(!showMapRing)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-2xl border transition-all ${
              showMapRing
                ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-300 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500/40'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
            aria-pressed={showMapRing}
            title={showMapRing ? 'Hide geographic radius circle' : 'Show geographic radius circle on map'}
          >
            <CircleDot className={`w-3.5 h-3.5 ${showMapRing ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span>Map Ring</span>
          </button>
        </div>
      </div>

      {/* Middle: Category Buttons Bar & More Menu (Reference Image 1) */}
      <div className="pt-3.5 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none relative">
          {/* 8 Primary Category Buttons */}
          {PRIMARY_POI_CATEGORY_IDS.map((catId) => {
            const meta = getCategoryMeta(catId);
            const isSelected = selectedCategory === catId;

            return (
              <button
                key={catId}
                type="button"
                onClick={() => onSelectCategory(isSelected ? null : catId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-600/90 text-white shadow-lg shadow-emerald-950/60 scale-[1.02]'
                    : 'bg-slate-900/90 border-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-700'
                }`}
                aria-pressed={isSelected}
              >
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}

          {/* More Categories Dropdown Button (Reference Image 1) */}
          <div className="relative inline-block flex-shrink-0">
            <button
              ref={moreButtonRef}
              type="button"
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                moreMenuOpen || (selectedCategory && SECONDARY_POI_CATEGORY_IDS.includes(selectedCategory))
                  ? 'bg-slate-800 border-slate-700 text-white ring-1 ring-slate-600'
                  : 'bg-slate-900/90 border-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              aria-haspopup="true"
              aria-expanded={moreMenuOpen}
            >
              <span>More</span>
              {moreMenuOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Dropdown Menu (Reference Image 1) */}
            {moreMenuOpen && (
              <div
                ref={moreMenuRef}
                className="absolute right-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-[#0a1120] border border-slate-700/90 rounded-2xl shadow-2xl z-[500] p-1.5 divide-y divide-slate-800/60 animate-in fade-in zoom-in-95 duration-150"
                role="menu"
                aria-orientation="vertical"
              >
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Additional Place Categories
                </div>
                <div className="py-1 space-y-0.5">
                  {SECONDARY_POI_CATEGORY_IDS.map((catId) => {
                    const meta = getCategoryMeta(catId);
                    const isSelected = selectedCategory === catId;

                    return (
                      <button
                        key={catId}
                        type="button"
                        onClick={() => {
                          onSelectCategory(catId);
                          setMoreMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                        role="menuitem"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-sm">{meta.emoji}</span>
                          <span className="truncate">{meta.label}</span>
                        </div>
                        {isSelected && <span className="text-[10px] text-emerald-200">Active</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Search Center Bar (Section 3.3) */}
      <div className="pt-1 pb-3 flex items-center justify-between gap-3 flex-wrap text-xs text-slate-400 border-t border-slate-800/40 mt-1">
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-slate-400">Search Center:</span>
          <span className="font-semibold text-slate-200 truncate">{center.label}</span>
        </div>

        <div className="flex items-center gap-2">
          {!searchFocused ? (
            <button
              type="button"
              onClick={() => setSearchFocused(true)}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 flex items-center gap-1"
            >
              <Search className="w-3 h-3" />
              <span>Change Search Center</span>
            </button>
          ) : (
            <form onSubmit={handleAddressSearch} className="flex items-center gap-1.5">
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="City, landmark, or address..."
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44 sm:w-60"
                autoFocus
              />
              <button
                type="submit"
                disabled={isGeocoding}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
              >
                {isGeocoding ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Set'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchFocused(false);
                  setGeocodeNotice(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>

      {geocodeNotice && (
        <div className="mb-3 px-3 py-1.5 rounded-xl bg-amber-950/50 border border-amber-600/30 text-amber-300 text-xs flex items-center justify-between">
          <span>{geocodeNotice}</span>
          <button onClick={() => setGeocodeNotice(null)} className="text-amber-400 hover:text-amber-200">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Content Area (Reference Image 1: Welcome/Prompt State OR Active Results) */}
      {!selectedCategory ? (
        /* Empty / Prompt State (Matching Reference Image 1 exactly!) */
        <div className="mt-2 py-10 px-4 bg-[#080d19] border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center text-center shadow-inner">
          {/* Glowing Compass Badge */}
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 mb-4 animate-pulse-slow">
            <Compass className="w-7 h-7" />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
            Select a category to explore nearby places
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mb-6 leading-relaxed">
            Search real physical amenities within {activeRadiusLabel}. Click any category above or choose a quick option below:
          </p>

          {/* Quick Option Buttons (Reference Image 1) */}
          <div className="flex items-center justify-center gap-2.5 flex-wrap max-w-xl">
            {[
              { id: 'schools' as POICategory, label: 'Schools', emoji: '🎓' },
              { id: 'hospitals' as POICategory, label: 'Hospitals', emoji: '🏥' },
              { id: 'police' as POICategory, label: 'Police', emoji: '🛡️' },
              { id: 'hotels' as POICategory, label: 'Hotels', emoji: '🏨' },
              { id: 'atms' as POICategory, label: 'ATMs', emoji: '💳' },
              { id: 'petrol' as POICategory, label: 'Petrol', emoji: '⛽' },
            ].map((quick) => (
              <button
                key={quick.id}
                type="button"
                onClick={() => onSelectCategory(quick.id)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-sm hover:scale-105"
              >
                <span>{quick.emoji}</span>
                <span>{quick.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Active Category Results Deck */
        <div className="mt-2 bg-[#080d19] border border-slate-800/80 rounded-2xl p-4">
          {/* Status Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-base">{currentCatMeta?.emoji}</span>
              <span className="text-xs sm:text-sm font-bold text-white">
                {loading
                  ? `Searching ${currentCatMeta?.label}...`
                  : `Found ${places.length} ${currentCatMeta?.label}`}
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                within {activeRadiusLabel} of {center.label.split(',')[0]}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear category</span>
            </button>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs text-slate-300">
                Querying verified OpenStreetMap geographic nodes within {activeRadiusLabel}...
              </p>
            </div>
          )}

          {/* Error Message */}
          {!loading && error && (
            <div className="py-6 px-4 bg-red-950/40 border border-red-500/30 rounded-xl my-3 text-xs text-red-200 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Failed to load nearby places</p>
                <p className="text-slate-400 mt-0.5">{error}</p>
                <button
                  type="button"
                  onClick={() => onSelectCategory(selectedCategory)}
                  className="mt-2 text-xs font-semibold text-emerald-400 hover:underline"
                >
                  Retry query
                </button>
              </div>
            </div>
          )}

          {/* Zero Results State (Section 3.5 & 8 Example A) */}
          {!loading && !error && places.length === 0 && (
            <div className="py-8 text-center px-4">
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                No {currentCatMeta?.label.toLowerCase()} found within {activeRadiusLabel} of this location.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try expanding the search radius or exploring another neighborhood:
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                {radiusKm < 2.0 && (
                  <button
                    type="button"
                    onClick={() => onRadiusChange(2.0)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 transition-colors"
                  >
                    Expand to 2 km
                  </button>
                )}
                {radiusKm < 5.0 && (
                  <button
                    type="button"
                    onClick={() => onRadiusChange(5.0)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 transition-colors"
                  >
                    Expand to 5 km
                  </button>
                )}
                {radiusKm < 10.0 && (
                  <button
                    type="button"
                    onClick={() => onRadiusChange(10.0)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 transition-colors"
                  >
                    Expand to 10 km
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSearchFocused(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition-colors"
                >
                  Change Search Location
                </button>
              </div>
            </div>
          )}

          {/* Results Grid List */}
          {!loading && !error && places.length > 0 && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {places.map((place) => {
                const isSelected = selectedPlace?.id === place.id;
                const distanceStr =
                  place.distanceKm < 1
                    ? `${Math.round(place.distanceKm * 1000)} m`
                    : `${place.distanceKm.toFixed(1)} km`;

                return (
                  <div
                    key={place.id}
                    onClick={() => onSelectPlace(place)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/40'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="text-xs font-bold text-white truncate flex-1">
                          {place.name}
                        </h4>
                        <span className="text-[11px] font-bold text-emerald-400 flex-shrink-0">
                          {distanceStr}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {place.address || 'Address registered in OpenStreetMap'}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="text-slate-500 truncate max-w-[140px]">
                        {place.operator || currentCatMeta?.label}
                      </span>
                      {onPlanRouteTo && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlanRouteTo(place.name, place.latitude, place.longitude);
                          }}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                          title="Get driving directions"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Directions</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Data Source Footer */}
          {!loading && places.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Source: OpenStreetMap Community Contributors</span>
              <span>Showing up to {places.length} verified physical nodes</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
