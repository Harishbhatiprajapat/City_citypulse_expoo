import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Sliders,
  Loader2,
  ChevronRight,
  Compass,
  Bookmark,
  Check,
  X,
  Navigation,
} from 'lucide-react';
import { LiveMap } from './LiveMap';
import { ExploreNearby } from './ExploreNearby';
import { LocationDetailPanel } from './LocationDetailPanel';
import { MapAssistantChatbox } from './MapAssistantChatbox';
import {
  searchNearbyPOIs,
  searchPlacesFree,
  geocodeLocation,
  POI_CATEGORIES,
  getCategoryMeta,
  getLiveUserLocation,
} from '@/services/geoService';
import { calculateRoadRoute } from '@/services/routingService';
import { savePlace, isPlaceSaved } from '@/services/savedPlacesService';
import type { Zone, CityInfo, POICategory, POIPlace, RouteResult } from '@/types';

interface ExploreMapProps {
  zones: Zone[];
  selectedZoneId: number | null;
  onSelectZone: (id: number) => void;
  currentCity: CityInfo;
  onPlanRouteTo?: (destName: string, lat: number, lng: number) => void;
  onSelectCity?: (city: CityInfo) => void;
  tomtomKey?: string;
}

export function ExploreMap({
  zones,
  selectedZoneId,
  onSelectZone,
  currentCity,
  onPlanRouteTo,
  onSelectCity,
  tomtomKey,
}: ExploreMapProps) {
  // Category selection (defaults to null so Reference Image 1 prompt card is visible, or user selects category)
  const [selectedCategory, setSelectedCategory] = useState<POICategory | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(2.0); // 2 km default matching Reference Image 1
  const [showMapRing, setShowMapRing] = useState<boolean>(true); // Map ring enabled by default
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCenter, setActiveCenter] = useState<{ lat: number; lng: number; label: string }>({
    lat: currentCity.latitude,
    lng: currentCity.longitude,
    label: currentCity.label,
  });

  const [pois, setPois] = useState<POIPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<POIPlace | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  // Active road route displayed on map
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);

  // User GPS coordinates
  const [userGpsCoords, setUserGpsCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Sync center when currentCity changes externally
  useEffect(() => {
    setActiveCenter({
      lat: currentCity.latitude,
      lng: currentCity.longitude,
      label: currentCity.label,
    });
  }, [currentCity.latitude, currentCity.longitude, currentCity.label]);

  // Load POIs when category, center, or radius changes
  const fetchCategoryPOIs = useCallback(
    async (cat: POICategory | null, centerLat: number, centerLng: number, radius: number) => {
      if (!cat) {
        setPois([]);
        setLoading(false);
        setError(null);
        return [];
      }

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const data = await searchNearbyPOIs(cat, centerLat, centerLng, radius, controller.signal);
        setPois(data);
        setLoading(false);
        return data;
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError('Could not retrieve nearby facilities from OpenStreetMap.');
          setLoading(false);
        }
        return [];
      }
    },
    []
  );

  useEffect(() => {
    if (selectedCategory) {
      fetchCategoryPOIs(selectedCategory, activeCenter.lat, activeCenter.lng, radiusKm);
    } else {
      setPois([]);
    }
  }, [selectedCategory, activeCenter.lat, activeCenter.lng, radiusKm, fetchCategoryPOIs]);

  const handleSave = (place: POIPlace) => {
    savePlace({
      name: place.name,
      label: place.address || `${place.name}, ${currentCity.name}`,
      category: place.categoryLabel,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setSavedSuccessId(place.id);
    setTimeout(() => setSavedSuccessId(null), 2500);
  };

  // Direct Route Calculation
  const handleCalculateRoute = async (
    destName: string,
    destLat: number,
    destLng: number,
    originName?: string,
    originLat?: number,
    originLng?: number
  ): Promise<boolean> => {
    const startLat = originLat ?? userGpsCoords?.lat ?? activeCenter.lat;
    const startLng = originLng ?? userGpsCoords?.lng ?? activeCenter.lng;
    const startName = originName ?? (userGpsCoords ? 'My GPS Position' : `${currentCity.name} Center`);

    try {
      const route = await calculateRoadRoute(startLat, startLng, destLat, destLng, startName, destName);
      setActiveRoute(route);
      onPlanRouteTo?.(destName, destLat, destLng);
      return true;
    } catch {
      return false;
    }
  };

  // Map Assistant Tool Adapters
  const handleAssistantSetMapLocation = async (place: { name: string; lat: number; lng: number }): Promise<boolean> => {
    setActiveCenter({ lat: place.lat, lng: place.lng, label: place.name });
    if (onSelectCity) {
      onSelectCity({
        name: place.name,
        country: currentCity.country,
        latitude: place.lat,
        longitude: place.lng,
        label: place.name,
      });
    }
    if (selectedCategory) {
      await fetchCategoryPOIs(selectedCategory, place.lat, place.lng, radiusKm);
    }
    return true;
  };

  const handleAssistantSearchPlaces = async (
    category: POICategory,
    radius: number,
    customCenter?: { lat: number; lng: number; name: string }
  ): Promise<POIPlace[]> => {
    setSelectedCategory(category);
    setRadiusKm(radius);

    const targetLat = customCenter ? customCenter.lat : activeCenter.lat;
    const targetLng = customCenter ? customCenter.lng : activeCenter.lng;

    if (customCenter) {
      setActiveCenter({ lat: targetLat, lng: targetLng, label: customCenter.name });
    }

    return await fetchCategoryPOIs(category, targetLat, targetLng, radius);
  };

  const handleAssistantGetCurrentLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const loc = await getLiveUserLocation();
      const coords = {
        lat: loc.latitude,
        lng: loc.longitude,
        accuracy: loc.accuracy,
      };
      setUserGpsCoords(coords);
      setActiveCenter({
        lat: loc.latitude,
        lng: loc.longitude,
        label: loc.label || 'My Live Location',
      });
      return { lat: loc.latitude, lng: loc.longitude };
    } catch {
      return null;
    }
  };

  const handleAssistantSelectMarker = (placeId: string) => {
    const found = pois.find((p) => p.id === placeId);
    if (found) setSelectedPOI(found);
  };

  const handleAssistantClearSearch = () => {
    setSelectedCategory(null);
    setPois([]);
    setActiveRoute(null);
    setSelectedPOI(null);
    setActiveCenter({
      lat: currentCity.latitude,
      lng: currentCity.longitude,
      label: currentCity.label,
    });
  };

  return (
    <div className="space-y-4">
      {/* FEATURE A: Explore Nearby Top Deck (Reference Image 1) */}
      <ExploreNearby
        center={activeCenter}
        onCenterChange={setActiveCenter}
        radiusKm={radiusKm}
        onRadiusChange={setRadiusKm}
        showMapRing={showMapRing}
        onToggleMapRing={setShowMapRing}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        places={pois}
        loading={loading}
        error={error}
        selectedPlace={selectedPOI}
        onSelectPlace={setSelectedPOI}
        onPlanRouteTo={onPlanRouteTo}
        cityName={currentCity.name}
      />

      {/* Main Geographic Grid: Map & Location Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Interactive GIS Map with Map Ring & Layer Controls */}
        <div className={`transition-all duration-300 ${selectedPOI ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          <LiveMap
            zones={zones}
            selectedZoneId={selectedZoneId}
            onSelectZone={onSelectZone}
            cityLabel={activeCenter.label}
            cityCoords={{ lat: activeCenter.lat, lng: activeCenter.lng }}
            poiPlaces={pois}
            selectedPOI={selectedPOI}
            onSelectPOI={(poi) => setSelectedPOI(poi)}
            route={activeRoute}
            onClearRoute={() => setActiveRoute(null)}
            tomtomKey={tomtomKey}
            heightClass="h-[520px] sm:h-[620px]"
            showMapRing={showMapRing}
            ringRadiusMeters={Math.round(radiusKm * 1000)}
            onPlanRouteTo={onPlanRouteTo}
            userLocation={userGpsCoords ? { lat: userGpsCoords.lat, lng: userGpsCoords.lng, accuracy: userGpsCoords.accuracy } : null}
            onUserLocationDetected={(coords) => {
              setUserGpsCoords(coords);
              setActiveCenter({
                lat: coords.lat,
                lng: coords.lng,
                label: 'My GPS Location',
              });
            }}
          />
        </div>

        {/* Selected Location Details Panel */}
        {selectedPOI && (
          <div className="lg:col-span-4 h-full">
            <LocationDetailPanel
              place={selectedPOI}
              cityName={currentCity.name}
              onClose={() => setSelectedPOI(null)}
              onPlanRouteTo={(name, lat, lng) => handleCalculateRoute(name, lat, lng)}
              onFindNearby={(place) => {
                setActiveCenter({ lat: place.latitude, lng: place.longitude, label: place.name });
                if (selectedCategory) {
                  fetchCategoryPOIs(selectedCategory, place.latitude, place.longitude, radiusKm);
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Floating Embedded AI Map Assistant */}
      <div className="fixed bottom-6 left-6 z-40">
        <MapAssistantChatbox
          currentCity={currentCity}
          onSetMapLocation={handleAssistantSetMapLocation}
          onSearchPlaces={handleAssistantSearchPlaces}
          onGetCurrentLocation={handleAssistantGetCurrentLocation}
          onSelectMarker={handleAssistantSelectMarker}
          onClearSearch={handleAssistantClearSearch}
          onCalculateRoute={handleCalculateRoute}
          activePlacesCount={pois.length}
          selectedPOI={selectedPOI}
        />
      </div>
    </div>
  );
}
