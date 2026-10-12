import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type { CityInfo, POICategory, POIPlace, AIMessage } from '@/types';
import { POI_CATEGORIES, geocodeLocation } from '@/services/geoService';

interface MapAssistantChatboxProps {
  currentCity: CityInfo;
  onSetMapLocation: (place: { name: string; lat: number; lng: number }) => Promise<boolean>;
  onSearchPlaces: (
    category: POICategory,
    radiusKm: number,
    customCenter?: { lat: number; lng: number; name: string }
  ) => Promise<POIPlace[]>;
  onGetCurrentLocation: () => Promise<{ lat: number; lng: number } | null>;
  onSelectMarker: (placeId: string) => void;
  onClearSearch: () => void;
  onCalculateRoute: (
    destName: string,
    destLat: number,
    destLng: number,
    originName?: string,
    originLat?: number,
    originLng?: number
  ) => Promise<boolean>;
  activePlacesCount: number;
  selectedPOI: POIPlace | null;
  className?: string;
}

export function MapAssistantChatbox({
  currentCity,
  onSetMapLocation,
  onSearchPlaces,
  onGetCurrentLocation,
  onSelectMarker,
  onClearSearch,
  onCalculateRoute,
  activePlacesCount,
  selectedPOI,
  className = '',
}: MapAssistantChatboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'map_assist_welcome',
      role: 'assistant',
      content: `👋 Hello! I am the **CityPulse Map Assistant** for **${currentCity.name}**.\n\nYou can give me natural-language map commands like:\n* *"Show Jaipur on the map"* or *"Change location to Delhi"*\n* *"Find hospitals near me"*\n* *"Find police stations within 3 km"*\n* *"Find hotels near Hawa Mahal"*\n* *"Clear the current search"*\n\nI control the actual map tools directly!`,
      timestamp: new Date().toISOString(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, loading]);

  /**
   * Natural Language Intent Parser and Map Tool Execution Engine
   * Conforming strictly to Requirements 6 & 7:
   * setMapLocation(placeOrCoordinates)
   * searchPlaces(category, location, radius)
   * getCurrentLocation()
   * selectMapMarker(placeId)
   * showPlaceDetails(placeId)
   * clearMapSearch()
   * calculateRoute(origin, destination)
   * getNearbyPlaces(location, category, radius)
   */
  async function processCommand(queryText: string) {
    const text = queryText.trim();
    if (!text || loading) return;

    const userMsg: AIMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const qLower = text.toLowerCase();
    const executedToolCalls: { name: string; args: Record<string, unknown>; result?: unknown }[] = [];

    try {
      // 1. Tool: clearMapSearch()
      if (
        qLower.includes('clear search') ||
        qLower.includes('clear the search') ||
        qLower.includes('reset search') ||
        qLower.includes('clear map') ||
        qLower === 'clear'
      ) {
        onClearSearch();
        executedToolCalls.push({ name: 'clearMapSearch', args: {} });
        setMessages((prev) => [
          ...prev,
          {
            id: `assist_${Date.now()}`,
            role: 'assistant',
            content: `🧹 **Map search cleared.** All category filters and active search markers have been reset to default city view.`,
            timestamp: new Date().toISOString(),
            toolCalls: executedToolCalls,
          },
        ]);
        setLoading(false);
        return;
      }

      // 2. Tool: getCurrentLocation() / Return to my location
      if (
        qLower.includes('return to my location') ||
        qLower.includes('my current location') ||
        qLower.includes('locate me') ||
        qLower === 'my location' ||
        qLower === 'where am i'
      ) {
        const coords = await onGetCurrentLocation();
        if (coords) {
          executedToolCalls.push({
            name: 'getCurrentLocation',
            args: {},
            result: coords,
          });
          setMessages((prev) => [
            ...prev,
            {
              id: `assist_${Date.now()}`,
              role: 'assistant',
              content: `📍 **Located device.** Map centered on your GPS position (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}). A pulsing blue marker is now visible on the map.`,
              timestamp: new Date().toISOString(),
              toolCalls: executedToolCalls,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `assist_${Date.now()}`,
              role: 'assistant',
              content: `⚠️ Could not acquire GPS coordinates. Please check that browser location permissions are enabled in your address bar and device location services are turned on.`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        setLoading(false);
        return;
      }

      // 3. Tool: showPlaceDetails / selectMapMarker
      if (
        (qLower.includes('details') || qLower.includes('show marker')) &&
        selectedPOI
      ) {
        onSelectMarker(selectedPOI.id);
        executedToolCalls.push({
          name: 'showPlaceDetails',
          args: { placeId: selectedPOI.id, name: selectedPOI.name },
        });
        setMessages((prev) => [
          ...prev,
          {
            id: `assist_${Date.now()}`,
            role: 'assistant',
            content: `📋 Opened location details panel for **${selectedPOI.name}** (${selectedPOI.categoryLabel}). Distance: ${selectedPOI.distanceKm} km.`,
            timestamp: new Date().toISOString(),
            toolCalls: executedToolCalls,
          },
        ]);
        setLoading(false);
        return;
      }

      // 4. Tool: calculateRoute(origin, destination)
      if (
        qLower.includes('directions to') ||
        qLower.includes('route to') ||
        qLower.includes('drive to') ||
        qLower.includes('navigate to')
      ) {
        const targetQuery = text
          .replace(/.*(?:directions to|route to|drive to|navigate to)\s+/i, '')
          .replace(/\b(on the map|please)\b/gi, '')
          .trim();

        if (targetQuery) {
          const geo = await geocodeLocation(targetQuery);
          if (geo) {
            const success = await onCalculateRoute(geo.label.split(',')[0], geo.lat, geo.lng);
            if (success) {
              executedToolCalls.push({
                name: 'calculateRoute',
                args: { destination: geo.label, lat: geo.lat, lng: geo.lng },
              });
              setMessages((prev) => [
                ...prev,
                {
                  id: `assist_${Date.now()}`,
                  role: 'assistant',
                  content: `🚗 **Route plotted to ${geo.label.split(',')[0]}**!\nRoad-network directions and polyline are now rendered on the map canvas.`,
                  timestamp: new Date().toISOString(),
                  toolCalls: executedToolCalls,
                },
              ]);
              setLoading(false);
              return;
            }
          }
        }
      }

      // 5. Tool: setMapLocation(placeOrCoordinates)
      // Matches "Show Jaipur on the map", "Change location to Delhi", "Move the map to Mumbai", "Go to Pune"
      const moveMatch = text.match(
        /(?:show|change location to|move map to|move the map to|go to|center on|switch to)\s+([^,.]+?)(?:\s+on the map)?$/i
      );

      // Check if this is a general city/landmark location change (not a category search)
      const isCategoryWord = POI_CATEGORIES.some((c) =>
        qLower.includes(c.id) || qLower.includes(c.osmQuery)
      );

      if (moveMatch && !isCategoryWord) {
        const destName = moveMatch[1].trim();
        const geo = await geocodeLocation(destName);
        if (geo) {
          const cityNameClean = geo.label.split(',')[0].trim();
          await onSetMapLocation({ name: cityNameClean, lat: geo.lat, lng: geo.lng });
          executedToolCalls.push({
            name: 'setMapLocation',
            args: { query: destName, resolvedCoords: [geo.lat, geo.lng] },
          });
          setMessages((prev) => [
            ...prev,
            {
              id: `assist_${Date.now()}`,
              role: 'assistant',
              content: `🗺️ **Map moved to ${cityNameClean}** (${geo.lat.toFixed(4)}° N, ${geo.lng.toFixed(4)}° E).\nAll geospatial layers, weather sensors, and nearby civic telemetry have updated.`,
              timestamp: new Date().toISOString(),
              toolCalls: executedToolCalls,
            },
          ]);
          setLoading(false);
          return;
        }
      }

      // 6. Tool: searchPlaces(category, location, radius) / getNearbyPlaces
      // Detect category
      let matchedCategory: POICategory | null = null;
      for (const cat of POI_CATEGORIES) {
        if (
          qLower.includes(cat.id) ||
          qLower.includes(cat.label.toLowerCase()) ||
          qLower.includes(cat.osmQuery) ||
          (cat.id === 'hospitals' && (qLower.includes('hospital') || qLower.includes('clinic') || qLower.includes('doctor'))) ||
          (cat.id === 'police' && (qLower.includes('police') || qLower.includes('station'))) ||
          (cat.id === 'schools' && (qLower.includes('school') || qLower.includes('college') || qLower.includes('university'))) ||
          (cat.id === 'hotels' && (qLower.includes('hotel') || qLower.includes('lodging') || qLower.includes('stay'))) ||
          (cat.id === 'restaurants' && (qLower.includes('restaurant') || qLower.includes('food') || qLower.includes('dining') || qLower.includes('cafe'))) ||
          (cat.id === 'pharmacies' && (qLower.includes('pharmacy') || qLower.includes('chemist') || qLower.includes('medical store'))) ||
          (cat.id === 'parks' && (qLower.includes('park') || qLower.includes('garden'))) ||
          (cat.id === 'bus_stations' && qLower.includes('bus')) ||
          (cat.id === 'railway_stations' && (qLower.includes('train') || qLower.includes('railway'))) ||
          (cat.id === 'atms' && (qLower.includes('atm') || qLower.includes('bank') || qLower.includes('cash'))) ||
          (cat.id === 'government' && (qLower.includes('government') || qLower.includes('municipal') || qLower.includes('court') || qLower.includes('collectorate')))
        ) {
          matchedCategory = cat.id;
          break;
        }
      }

      // Extract requested radius
      const radiusMatch = qLower.match(/(\d+)\s*(?:km|kilos|kilometers|miles)?/);
      const requestedRadius = radiusMatch ? Math.min(25, Math.max(1, parseInt(radiusMatch[1], 10))) : 5;

      // Check if location is "near me" or specific landmark (e.g., "around Jaipur Railway Station", "near Hawa Mahal")
      const nearMe = qLower.includes('near me') || qLower.includes('around me') || qLower.includes('near my current location');
      const landmarkMatch = text.match(/(?:around|near)\s+([A-Z0-9\s]+?)(?:\s+(?:within|\d|on|in)|$)/i);

      if (matchedCategory) {
        let center: { lat: number; lng: number; name: string } | undefined = undefined;

        if (nearMe) {
          const userGps = await onGetCurrentLocation();
          if (userGps) {
            center = { lat: userGps.lat, lng: userGps.lng, name: 'My Current Location' };
          }
        } else if (landmarkMatch && landmarkMatch[1].trim().length > 3 && !landmarkMatch[1].toLowerCase().includes('me')) {
          const landmarkQuery = landmarkMatch[1].trim();
          const geo = await geocodeLocation(landmarkQuery);
          if (geo) {
            center = { lat: geo.lat, lng: geo.lng, name: geo.label.split(',')[0] };
          }
        }

        const results = await onSearchPlaces(matchedCategory, requestedRadius, center);
        const catMeta = POI_CATEGORIES.find((c) => c.id === matchedCategory);

        executedToolCalls.push({
          name: 'searchPlaces',
          args: {
            category: matchedCategory,
            radiusKm: requestedRadius,
            center: center ? center.name : currentCity.name,
          },
          result: { count: results.length },
        });

        if (results.length === 0) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assist_${Date.now()}`,
              role: 'assistant',
              content: `🔎 Found **0 verified ${catMeta?.label || matchedCategory}** within **${requestedRadius} km** of ${center ? `**${center.name}**` : `**${currentCity.name}**`}. You can try widening the search radius or exploring another zone.`,
              timestamp: new Date().toISOString(),
              toolCalls: executedToolCalls,
            },
          ]);
        } else {
          const topList = results
            .slice(0, 4)
            .map((p, i) => `${i + 1}. **${p.name}** (${p.distanceKm} km away)`)
            .join('\n');

          setMessages((prev) => [
            ...prev,
            {
              id: `assist_${Date.now()}`,
              role: 'assistant',
              content: `📍 Found **${results.length} verified ${catMeta?.label || matchedCategory}** within **${requestedRadius} km** of ${center ? `**${center.name}**` : `**${currentCity.name}**`}:\n\n${topList}\n\n*All ${results.length} markers are updated with category color badges on the interactive map.*`,
              timestamp: new Date().toISOString(),
              toolCalls: executedToolCalls,
            },
          ]);
        }
        setLoading(false);
        return;
      }

      // Default: If text includes a place/landmark name without explicit command, attempt geocoding
      const geoAttempt = await geocodeLocation(text);
      if (geoAttempt) {
        const placeName = geoAttempt.label.split(',')[0];
        await onSetMapLocation({ name: placeName, lat: geoAttempt.lat, lng: geoAttempt.lng });
        executedToolCalls.push({
          name: 'setMapLocation',
          args: { name: placeName, lat: geoAttempt.lat, lng: geoAttempt.lng },
        });
        setMessages((prev) => [
          ...prev,
          {
            id: `assist_${Date.now()}`,
            role: 'assistant',
            content: `🎯 **Map centered on ${placeName}** (${geoAttempt.lat.toFixed(4)}, ${geoAttempt.lng.toFixed(4)}).`,
            timestamp: new Date().toISOString(),
            toolCalls: executedToolCalls,
          },
        ]);
        setLoading(false);
        return;
      }

      // Fallback response with helpful map commands
      setMessages((prev) => [
        ...prev,
        {
          id: `assist_${Date.now()}`,
          role: 'assistant',
          content: `I didn't recognize that map action. Try commands like:\n* *"Find hospitals near me"*\n* *"Change location to Delhi"*\n* *"Find police stations within 3 km"*\n* *"Show hotels near Hawa Mahal"*\n* *"Clear search"*`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `An error occurred while executing map operation: ${err instanceof Error ? err.message : 'Network error'}.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const QUICK_ACTIONS = [
    'Find hospitals near me',
    'Find police stations within 3 km',
    'Find hotels near Hawa Mahal',
    'Show schools and colleges',
    'Clear the current search',
    'Return to my current location',
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button when collapsed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition-all group"
          aria-label="Open CityPulse Map Assistant"
        >
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
          <span>Map Assistant</span>
          {activePlacesCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
              {activePlacesCount}
            </span>
          )}
        </button>
      )}

      {/* Floating or Embedded Chatbox Drawer */}
      {isOpen && (
        <div className="w-full sm:w-[360px] lg:w-[390px] bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-down">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight">CityPulse Map Assistant</h4>
                <p className="text-[10px] text-white/80">Interactive Smart City GIS Agent</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setMessages([
                    {
                      id: `map_assist_welcome_${Date.now()}`,
                      role: 'assistant',
                      content: `👋 Map assistant reset. Ask me to find facilities, change map locations, or plan routes in **${currentCity.name}**!`,
                      timestamp: new Date().toISOString(),
                    },
                  ]);
                }}
                className="p-1 hover:bg-white/20 rounded-md transition-colors text-white"
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized((v) => !v)}
                className="p-1 hover:bg-white/20 rounded-md transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
                aria-label="Toggle minimize"
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-md transition-colors"
                title="Close assistant"
                aria-label="Close assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Message History */}
              <div className="p-3 overflow-y-auto space-y-3 h-[280px] sm:h-[320px] bg-slate-50/50 dark:bg-citynavy-bg/50 text-xs">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[88%] p-3 rounded-2xl leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                          : 'bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border text-slate-800 dark:text-citynavy-text rounded-bl-none shadow-sm'
                      }`}
                    >
                      <div className="whitespace-pre-line">{m.content}</div>

                      {/* Tool Call Badges */}
                      {m.toolCalls && m.toolCalls.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-citynavy-border flex flex-wrap gap-1">
                          {m.toolCalls.map((tc, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900"
                            >
                              ⚙️ {tc.name}()
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 text-slate-400 italic text-xs py-1">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span>Executing map action...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Pills */}
              <div className="p-2 bg-slate-50 dark:bg-citynavy-bg border-t border-slate-200 dark:border-citynavy-border flex gap-1.5 overflow-x-auto">
                {QUICK_ACTIONS.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => processCommand(action)}
                    disabled={loading}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-medium bg-white dark:bg-citynavy-card hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-citynavy-text border border-slate-200 dark:border-citynavy-border transition-colors disabled:opacity-50"
                  >
                    {action}
                  </button>
                ))}
              </div>

              {/* Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  processCommand(input);
                }}
                className="p-2.5 bg-white dark:bg-citynavy-card border-t border-slate-200 dark:border-citynavy-border flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. Find hospitals near me..."
                  disabled={loading}
                  className="flex-1 bg-slate-100 dark:bg-citynavy-bg border-0 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-citynavy-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors shadow-sm"
                  aria-label="Send map command"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
