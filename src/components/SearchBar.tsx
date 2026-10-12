import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, X, Loader2, Globe, Navigation } from 'lucide-react';
import { searchCities } from '@/services/geoService';
import type { CitySearchResult } from '@/types';

interface SearchBarProps {
  onSearch: (city: CitySearchResult) => void;
  autoFocus?: boolean;
}

export function SearchBar({ onSearch, autoFocus }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const executeSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const cities = await searchCities(q.trim(), controller.signal);
      setResults(cities);
    } catch (err: unknown) {
      if (!(err instanceof Error) || err.name !== 'AbortError') {
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    setShowResults(true);
    setLoading(true);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      executeSearch(value);
    }, 250);
  }

  function handleSelect(city: CitySearchResult) {
    setQuery(city.label);
    setShowResults(false);
    onSearch(city);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showResults || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  }

  function handleCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Reverse geocode via Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          );
          if (res.ok) {
            const data = await res.json();
            const cityName =
              data.address?.city ||
              data.address?.town ||
              data.address?.municipality ||
              data.address?.village ||
              data.name ||
              'Current Location';
            const country = data.address?.country || '';
            const admin1 = data.address?.state || '';
            const label = [cityName, admin1, country].filter(Boolean).join(', ');

            const locResult: CitySearchResult = {
              id: Date.now(),
              name: cityName,
              country,
              admin1,
              latitude,
              longitude,
              label,
            };
            handleSelect(locResult);
          }
        } catch {
          // Fallback with coordinates
          const locResult: CitySearchResult = {
            id: Date.now(),
            name: 'My Current Location',
            country: '',
            latitude,
            longitude,
            label: `Coordinates: ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
          };
          handleSelect(locResult);
        } finally {
          setGeoLocating(false);
        }
      },
      () => {
        setGeoLocating(false);
        alert('Could not retrieve your location. Please check browser permissions.');
      },
      { timeout: 10000 }
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={(e) => {
        e.preventDefault();
        if (results.length > 0) handleSelect(results[0]);
      }}>
        <div className="relative flex items-center">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Search any city or district worldwide (e.g. Tokyo, Berlin, San Francisco)..."
            className="w-full pl-12 pr-24 py-3.5 text-sm bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-citynavy-accent focus:border-transparent text-slate-800 dark:text-citynavy-text placeholder:text-slate-400 dark:placeholder:text-citynavy-muted transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {loading && <Loader2 className="w-4 h-4 text-citynavy-accent animate-spin" />}
            {query && !loading && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
            <button
              type="button"
              onClick={handleCurrentLocation}
              disabled={geoLocating}
              title="Locate my position"
              aria-label="Locate my position"
              className="p-1.5 rounded-lg bg-blue-50 dark:bg-citynavy-border hover:bg-blue-100 dark:hover:bg-slate-700 text-citynavy-accent transition-colors"
            >
              {geoLocating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </form>

      {showResults && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-400 dark:text-citynavy-muted">
              <Loader2 className="w-4 h-4 text-citynavy-accent animate-spin" />
              Searching geospatial index...
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center">
              <Globe className="w-5 h-5 text-slate-300 dark:text-citynavy-muted" />
              <p className="text-sm text-slate-400 dark:text-citynavy-muted">
                {query.trim().length >= 2
                  ? 'No locations found. Try checking the spelling.'
                  : 'Type at least 2 characters to search worldwide'}
              </p>
            </div>
          ) : (
            results.map((city, idx) => (
              <button
                key={`${city.id}-${city.name}-${idx}`}
                onClick={() => handleSelect(city)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                  selectedIndex === idx
                    ? 'bg-blue-50 dark:bg-citynavy-cardHover text-citynavy-accent'
                    : 'hover:bg-slate-50 dark:hover:bg-citynavy-cardHover text-slate-700 dark:text-slate-200'
                }`}
              >
                <MapPin className="w-4 h-4 text-citynavy-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block truncate">
                    {city.name}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-citynavy-muted block truncate">
                    {city.admin1 ? `${city.admin1}, ` : ''}{city.country}
                    {city.population ? ` · Pop: ${city.population.toLocaleString()}` : ''}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
