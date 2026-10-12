import { useState, useEffect } from 'react';
import {
  Navigation,
  MapPin,
  Car,
  Footprints,
  Bike,
  Plus,
  Trash2,
  Clock,
  Calendar,
  Cloud,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { LiveMap } from './LiveMap';
import { calculateMultiRouteJourney } from '@/services/routingService';
import { searchCities } from '@/services/geoService';
import { saveJourney } from '@/services/savedJourneysService';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Zone,
  CityInfo,
  MultiRouteResult,
  RouteAlternative,
  RouteWaypoint,
  TravelMode,
  RoutePreference,
  CitySearchResult,
} from '@/types';

interface RoutePlannerProps {
  zones: Zone[];
  selectedZoneId: number | null;
  onSelectZone: (id: number) => void;
  currentCity: CityInfo;
  initialDestination?: { name: string; lat: number; lng: number } | null;
  tomtomKey?: string;
}

export function RoutePlanner({
  zones,
  selectedZoneId,
  onSelectZone,
  currentCity,
  initialDestination,
  tomtomKey,
}: RoutePlannerProps) {
  const { user } = useAuth();

  // Route Origin
  const [originText, setOriginText] = useState(`${currentCity.name} Center`);
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number }>({
    lat: currentCity.latitude,
    lng: currentCity.longitude,
  });

  // Intermediate Waypoints
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [newWaypointText, setNewWaypointText] = useState('');
  const [waypointSuggestions, setWaypointSuggestions] = useState<CitySearchResult[]>([]);
  const [loadingWaypointSuggestions, setLoadingWaypointSuggestions] = useState(false);

  // Destination
  const [destText, setDestText] = useState(initialDestination?.name || '');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(
    initialDestination ? { lat: initialDestination.lat, lng: initialDestination.lng } : null
  );
  const [destSuggestions, setDestSuggestions] = useState<CitySearchResult[]>([]);
  const [loadingDestSuggestions, setLoadingDestSuggestions] = useState(false);

  // Departure Options
  const [travelMode, setTravelMode] = useState<TravelMode>('driving');
  const [routePreference, setRoutePreference] = useState<RoutePreference>('fastest');
  const [departureTime, setDepartureTime] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 10);
    return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  });

  // Calculation Results
  const [multiRoute, setMultiRoute] = useState<MultiRouteResult | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Saving Journey state
  const [savingJourney, setSavingJourney] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (initialDestination) {
      setDestText(initialDestination.name);
      setDestCoords({ lat: initialDestination.lat, lng: initialDestination.lng });
    }
  }, [initialDestination]);

  async function handleSearchDest(text: string) {
    setDestText(text);
    if (text.trim().length < 2) {
      setDestSuggestions([]);
      return;
    }
    setLoadingDestSuggestions(true);
    try {
      const results = await searchCities(text);
      setDestSuggestions(results);
    } catch {
      setDestSuggestions([]);
    } finally {
      setLoadingDestSuggestions(false);
    }
  }

  function handleSelectDest(s: CitySearchResult) {
    setDestText(s.label);
    setDestCoords({ lat: s.latitude, lng: s.longitude });
    setDestSuggestions([]);
  }

  async function handleSearchWaypoint(text: string) {
    setNewWaypointText(text);
    if (text.trim().length < 2) {
      setWaypointSuggestions([]);
      return;
    }
    setLoadingWaypointSuggestions(true);
    try {
      const results = await searchCities(text);
      setWaypointSuggestions(results);
    } catch {
      setWaypointSuggestions([]);
    } finally {
      setLoadingWaypointSuggestions(false);
    }
  }

  function handleAddWaypoint(s: CitySearchResult) {
    const wp: RouteWaypoint = {
      id: `wp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: s.label.split(',')[0],
      lat: s.latitude,
      lng: s.longitude,
    };
    setWaypoints((prev) => [...prev, wp]);
    setNewWaypointText('');
    setWaypointSuggestions([]);
  }

  function handleRemoveWaypoint(id: string) {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  }

  async function handleCalculateJourney() {
    if (!originCoords || !destCoords) {
      setRouteError('Please select both a valid starting location and destination.');
      return;
    }

    setLoadingRoute(true);
    setRouteError(null);
    setSaveSuccess(false);

    try {
      const res = await calculateMultiRouteJourney({
        origin: { id: 'orig', name: originText, lat: originCoords.lat, lng: originCoords.lng },
        destination: { id: 'dest', name: destText, lat: destCoords.lat, lng: destCoords.lng },
        waypoints,
        travelMode,
        departureTime: new Date(departureTime).toISOString(),
        routePreference,
        tomtomKey,
      });

      setMultiRoute(res);
      setSelectedRouteId(res.selectedRouteId);
    } catch (err) {
      setRouteError(err instanceof Error ? err.message : 'Could not find a navigable route for this journey.');
    } finally {
      setLoadingRoute(false);
    }
  }

  const selectedAlternative: RouteAlternative | null =
    multiRoute?.routes.find((r) => r.id === selectedRouteId) || multiRoute?.routes[0] || null;

  async function handleSaveThisJourney() {
    if (!selectedAlternative || !multiRoute) return;
    setSavingJourney(true);
    try {
      await saveJourney(
        {
          originName: multiRoute.origin.name,
          originLat: multiRoute.origin.lat,
          originLng: multiRoute.origin.lng,
          destName: multiRoute.destination.name,
          destLat: multiRoute.destination.lat,
          destLng: multiRoute.destination.lng,
          travelMode,
          routePreference,
          distanceKm: Number((selectedAlternative.distanceMeters / 1000).toFixed(1)),
          durationMins: Math.round(selectedAlternative.durationSeconds / 60),
        },
        user?.id
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSavingJourney(false);
    }
  }

  function handleSwap() {
    if (!destCoords) return;
    const tempText = originText;
    const tempCoords = originCoords;
    setOriginText(destText);
    setOriginCoords(destCoords);
    setDestText(tempText);
    setDestCoords(tempCoords);
    setMultiRoute(null);
  }

  function handleClear() {
    setMultiRoute(null);
    setSelectedRouteId('');
  }

  return (
    <div className="space-y-6">
      {/* Route Inputs Deck */}
      <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-citynavy-text flex items-center gap-2">
                <span>Smart Multi-Route Journey Planner</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Weather &amp; Traffic Grounded
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-citynavy-muted mt-0.5">
                OSRM road topology machine with Open-Meteo atmospheric forecasts &amp; TomTom corridor flow
              </p>
            </div>
          </div>

          {/* Travel Mode Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-citynavy-secondary rounded-xl p-1 self-start sm:self-auto text-xs">
            {[
              { id: 'driving' as TravelMode, label: 'Driving', icon: Car },
              { id: 'walking' as TravelMode, label: 'Walking', icon: Footprints },
              { id: 'cycling' as TravelMode, label: 'Cycling', icon: Bike },
            ].map((m) => {
              const Icon = m.icon;
              const isActive = travelMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTravelMode(m.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-white dark:bg-citynavy-card text-citynavy-accent shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Origin & Destination Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Origin */}
          <div className="relative">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
              Origin (Starting Point)
            </label>
            <div className="relative flex items-center">
              <MapPin className="absolute left-3.5 w-4 h-4 text-emerald-500" />
              <input
                type="text"
                value={originText}
                onChange={(e) => setOriginText(e.target.value)}
                placeholder="Start location..."
                className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-citynavy-accent"
              />
            </div>
          </div>

          {/* Destination */}
          <div className="relative">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
              Destination
            </label>
            <div className="relative flex items-center">
              <MapPin className="absolute left-3.5 w-4 h-4 text-red-500" />
              <input
                type="text"
                value={destText}
                onChange={(e) => handleSearchDest(e.target.value)}
                placeholder="Search destination city or landmark..."
                className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-citynavy-accent"
              />
              {loadingDestSuggestions && (
                <Loader2 className="absolute right-3 w-4 h-4 animate-spin text-citynavy-accent" />
              )}
            </div>

            {/* Destination Autocomplete List */}
            {destSuggestions.length > 0 && (
              <div className="absolute top-full mt-1.5 w-full bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto p-1.5 space-y-1">
                {destSuggestions.map((s, idx) => (
                  <button
                    key={`${s.id}-${idx}`}
                    type="button"
                    onClick={() => handleSelectDest(s)}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-citynavy-secondary text-slate-800 dark:text-slate-200"
                  >
                    <p className="font-bold">{s.name}</p>
                    <p className="text-[10px] text-slate-400">{s.label}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Intermediate Stops (Waypoints) */}
        {waypoints.length > 0 && (
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-citynavy-muted block">
              Via Intermediate Stops ({waypoints.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {waypoints.map((wp, idx) => (
                <div
                  key={wp.id}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2"
                >
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white font-black text-[9px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-bold">{wp.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveWaypoint(wp.id)}
                    className="hover:text-red-500 ml-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Intermediate Stop & Options Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Add Stop Input */}
          <div className="relative">
            <label className="text-xs font-semibold text-slate-500 dark:text-citynavy-muted mb-1 block">
              + Optional Intermediate Stop
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={newWaypointText}
                onChange={(e) => handleSearchWaypoint(e.target.value)}
                placeholder="Search via stop..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-citynavy-accent"
              />
              {loadingWaypointSuggestions && (
                <Loader2 className="absolute right-2.5 w-3.5 h-3.5 animate-spin text-citynavy-accent" />
              )}
            </div>
            {waypointSuggestions.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl shadow-xl z-50 max-h-40 overflow-y-auto p-1.5 space-y-1">
                {waypointSuggestions.map((s, idx) => (
                  <button
                    key={`${s.id}-${idx}`}
                    type="button"
                    onClick={() => handleAddWaypoint(s)}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-citynavy-secondary text-slate-800 dark:text-slate-200"
                  >
                    <p className="font-bold">{s.name}</p>
                    <p className="text-[10px] text-slate-400">{s.label}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Departure Date/Time */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-citynavy-muted mb-1 block">
              Departure Time
            </label>
            <input
              type="datetime-local"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-citynavy-accent"
            />
          </div>

          {/* Route Preference */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-citynavy-muted mb-1 block">
              Route Preference
            </label>
            <select
              value={routePreference}
              onChange={(e) => setRoutePreference(e.target.value as RoutePreference)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-citynavy-accent"
            >
              <option value="fastest">⚡ Fastest Route</option>
              <option value="balanced">⚖️ Balanced Arterial</option>
              <option value="shortest">📏 Shortest Distance</option>
              <option value="weather_aware">🌤️ Weather-Aware Corridor</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <button
            type="button"
            onClick={handleCalculateJourney}
            disabled={loadingRoute || !destCoords}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-md shadow-blue-500/25 disabled:opacity-50"
          >
            {loadingRoute ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            <span>Calculate Multi-Route Journey</span>
          </button>

          {destCoords && (
            <button
              type="button"
              onClick={handleSwap}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-citynavy-border text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-citynavy-secondary transition-colors"
            >
              Swap Origin/Dest
            </button>
          )}

          {multiRoute && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3.5 py-2.5 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              Clear Routes
            </button>
          )}
        </div>

        {routeError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{routeError}</span>
          </div>
        )}
      </div>

      {/* Alternative Routes Comparison Cards (Shown when routes are retrieved) */}
      {multiRoute && multiRoute.routes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-citynavy-muted uppercase tracking-wider">
              Candidate Routes Found ({multiRoute.routes.length}) — Click to Highlight
            </span>
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-pulse">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Journey saved to account!</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveThisJourney}
                disabled={savingJourney}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border hover:bg-slate-200 dark:hover:bg-citynavy-secondary text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                {savingJourney ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5 text-citynavy-accent" />}
                <span>Save Route</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {multiRoute.routes.map((alt, idx) => {
              const isSelected = alt.id === selectedRouteId;
              const distKm = (alt.distanceMeters / 1000).toFixed(1);
              const durMins = Math.round(alt.durationSeconds / 60);

              return (
                <div
                  key={alt.id}
                  onClick={() => setSelectedRouteId(alt.id)}
                  className={`p-4 rounded-3xl border text-left cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-md ring-2 ring-blue-500/25'
                      : 'border-slate-200 dark:border-citynavy-border bg-white dark:bg-citynavy-card hover:bg-slate-50 dark:hover:bg-citynavy-secondary/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-citynavy-text">
                        {alt.label}
                      </span>
                      {alt.isRecommended && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Recommended
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                      <span className="text-2xl font-black text-slate-900 dark:text-citynavy-text">
                        {durMins} mins
                      </span>
                      <span className="text-xs text-slate-500">
                        ({distKm} km)
                      </span>
                      {alt.trafficDelaySeconds > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                          +{Math.round(alt.trafficDelaySeconds / 60)}m delay
                        </span>
                      )}
                    </div>

                    {/* Route Obstruction Badges */}
                    {alt.incidentMatches && alt.incidentMatches.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {alt.incidentMatches.some((m) => m.incident.roadClosed && m.isDirectImpact) ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                            ⛔ Road Closure on Route
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                            ⚠️ {alt.incidentMatches.filter((m) => m.isDirectImpact).length || alt.incidentMatches.length} Hazard(s) Nearby
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 dark:text-citynavy-muted mt-1">
                      Departure: {new Date(alt.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr; Arrives: <strong>{alt.estimatedArrivalTime}</strong>
                    </p>
                  </div>

                  {/* Badges: Weather & Traffic & Tolls */}
                  <div className="pt-2 border-t border-slate-100 dark:border-citynavy-border/60 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Cloud className="w-3.5 h-3.5 text-sky-500" />
                      <span>Safety: {alt.weatherSafetyScore}/100</span>
                    </div>
                    {alt.tollEstimateAmount ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        Toll: ₹{alt.tollEstimateAmount}
                      </span>
                    ) : (
                      <span className="text-slate-400">No Tolls</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Map + Turn-by-Turn Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Interactive Map with Route Polylines */}
        <div className="lg:col-span-2">
          <LiveMap
            zones={zones}
            selectedZoneId={selectedZoneId}
            onSelectZone={onSelectZone}
            cityLabel={currentCity.label}
            cityCoords={{ lat: currentCity.latitude, lng: currentCity.longitude }}
            multiRoute={multiRoute}
            selectedRouteId={selectedRouteId}
            onSelectRouteAlternative={setSelectedRouteId}
            trafficIncidents={selectedAlternative?.incidentsAlongRoute || []}
            onClearRoute={handleClear}
            tomtomKey={tomtomKey}
            heightClass="h-[520px] sm:h-[620px]"
          />
        </div>

        {/* Selected Route Turn-by-Turn & Weather Details Panel */}
        <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl p-5 shadow-sm flex flex-col h-[520px] sm:h-[620px]">
          <div className="pb-3 border-b border-slate-100 dark:border-citynavy-border">
            <h3 className="text-sm font-black text-slate-900 dark:text-citynavy-text flex items-center justify-between">
              <span>Turn-by-Turn Journey Guidance</span>
              {selectedAlternative && (
                <span className="text-xs text-citynavy-accent font-bold">
                  {selectedAlternative.label.split('—')[0]}
                </span>
              )}
            </h3>

            {selectedAlternative ? (
              <div className="mt-2 space-y-1 text-xs">
                <p className="font-bold text-emerald-600 dark:text-emerald-400">
                  {(selectedAlternative.distanceMeters / 1000).toFixed(1)} km &bull; {Math.round(selectedAlternative.durationSeconds / 60)} mins &bull; Arrival {selectedAlternative.estimatedArrivalTime}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-citynavy-muted leading-tight">
                  {selectedAlternative.weatherNotice}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-citynavy-muted mt-1">
                Configure origin, destination, and departure options above to view guidance.
              </p>
            )}
          </div>

          {/* Spatial Route Incident Alerts */}
          {selectedAlternative?.incidentMatches && selectedAlternative.incidentMatches.length > 0 && (
            <div className="my-3 p-3 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1.5 flex-shrink-0">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Route Disruption Alerts ({selectedAlternative.incidentMatches.length})</span>
                </span>
                <span className="text-[10px] font-normal text-amber-700 dark:text-amber-300">
                  Buffer &le; 1.2km
                </span>
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {selectedAlternative.incidentMatches.map((m, mIdx) => (
                  <div
                    key={`m_${mIdx}`}
                    className={`p-2 rounded-xl text-xs flex items-start justify-between gap-2 border ${
                      m.incident.roadClosed
                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                        : 'bg-white dark:bg-citynavy-card border-amber-100 dark:border-amber-900/40 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1 font-bold text-[11px]">
                        <span>{m.incident.roadClosed ? '⛔' : '⚠️'}</span>
                        <span>{m.incident.type}</span>
                        <span className="text-[9px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {m.isDirectImpact ? 'Direct Path' : `${m.distanceToRouteMeters}m off`}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 leading-tight">
                        {m.impactSummary}
                      </p>
                    </div>
                    {m.incident.delaySeconds > 0 && (
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex-shrink-0">
                        +{Math.round(m.incident.delaySeconds / 60)}m
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Steps */}
          <div className="flex-1 overflow-y-auto space-y-2.5 mt-3 pr-1">
            {!selectedAlternative ? (
              <div className="py-24 text-center text-xs text-slate-400 dark:text-citynavy-muted leading-relaxed">
                No active route loaded. Enter an origin and destination above, then click &ldquo;Calculate Multi-Route Journey&rdquo;.
              </div>
            ) : selectedAlternative.steps.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Direct route ready. Proceed along indicated corridor.
              </div>
            ) : (
              selectedAlternative.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-2xl bg-slate-50 dark:bg-citynavy-secondary/40 border border-slate-100 dark:border-citynavy-border/50 text-xs flex items-start gap-2.5"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {step.instruction}
                    </p>
                    {step.distanceMeters > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {step.distanceMeters >= 1000
                          ? `${(step.distanceMeters / 1000).toFixed(1)} km`
                          : `${step.distanceMeters} m`}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Metadata */}
          {selectedAlternative && (
            <div className="pt-3 border-t border-slate-100 dark:border-citynavy-border text-[10px] text-slate-400 dark:text-citynavy-muted leading-tight">
              <strong>Telemetry:</strong> {selectedAlternative.trafficDataSource}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
