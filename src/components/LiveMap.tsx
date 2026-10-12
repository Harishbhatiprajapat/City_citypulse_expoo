import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  Maximize2,
  Minimize2,
  Navigation,
  Compass,
  AlertTriangle,
  Info,
  X,
  RefreshCw,
  Search,
  Scan,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Car,
  Loader2,
  MapPin,
  Sparkles,
  Zap,
  Filter,
  Check,
  ShieldAlert,
} from 'lucide-react';
import type {
  Zone,
  POIPlace,
  RouteResult,
  MultiRouteResult,
  TrafficIncident,
  POICategory,
  ZoneStatus,
  MapLayerId,
  ComprehensiveWeather,
  AirQualityData,
  CivicAlert,
} from '@/types';
import { POI_CATEGORIES, getCategoryMeta, geocodeLocation, searchNearbyPOIs, getLiveUserLocation } from '@/services/geoService';
import { getTrafficProviderConfig } from '@/services/trafficService';
import { fetchPlacePhotos } from '@/services/photoService';
import { MAP_LAYERS, ESSENTIAL_LAYER_IDS, MapLayerMeta } from '@/services/mapLayerService';

interface LiveMapProps {
  zones: Zone[];
  selectedZoneId: number | null;
  onSelectZone: (id: number) => void;
  cityLabel: string;
  cityCoords: { lat: number; lng: number };
  poiPlaces?: POIPlace[];
  selectedPOI?: POIPlace | null;
  onSelectPOI?: (poi: POIPlace | null) => void;
  route?: RouteResult | null;
  multiRoute?: MultiRouteResult | null;
  selectedRouteId?: string;
  onSelectRouteAlternative?: (routeId: string) => void;
  trafficIncidents?: TrafficIncident[];
  tomtomKey?: string;
  onClearRoute?: () => void;
  heightClass?: string;
  onUserLocationDetected?: (coords: { lat: number; lng: number; accuracy?: number }) => void;
  userLocation?: { lat: number; lng: number; accuracy?: number; label?: string } | null;
  disabledCategories?: Set<POICategory>;
  onToggleCategory?: (cat: POICategory) => void;
  activeInfrastructureCategory?: POICategory | null;
  onClearCategory?: () => void;
  onPlanRouteTo?: (destName: string, lat: number, lng: number) => void;
  // Extended Features for Reference Image 2
  showMapRing?: boolean;
  ringRadiusMeters?: number;
  liveWeather?: ComprehensiveWeather | null;
  liveAqi?: AirQualityData | null;
  activeAlerts?: CivicAlert[];
  onSimulateAlert?: () => void;
  onOpenAssistant?: () => void;
}

type BaseTileType = 'streets' | 'esri_streets' | 'topo' | 'satellite' | 'dark';

const statusColor: Record<ZoneStatus, string> = {
  normal: '#10B981', // Clean Green (<38)
  watch: '#F59E0B',  // Vibrant Orange (38-65)
  alert: '#EF4444',  // Alert Red (>65)
};

function createZoneIcon(status: ZoneStatus, isSelected: boolean): L.DivIcon {
  const color = statusColor[status] || '#10B981';
  const size = isSelected ? 38 : 30;
  const isAlert = status === 'alert';
  const pulse = isAlert
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2.5px solid ${color};animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>`
    : '';

  return L.divIcon({
    className: 'cp-map-marker',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        ${pulse}
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #FFFFFF;box-shadow:0 4px 14px rgba(0,0,0,0.32);display:flex;align-items:center;justify-content:center;transition:transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
          <div style="width:${Math.round(size * 0.38)}px;height:${Math.round(size * 0.38)}px;border-radius:50%;background:#FFFFFF;opacity:0.95;"></div>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createLayerIcon(emoji: string, color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 36 : 28;
  return L.divIcon({
    className: 'cp-map-marker',
    html: `
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.52)}px;cursor:pointer;transition:transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
        <span>${emoji}</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createGPSUserIcon(): L.DivIcon {
  return L.divIcon({
    className: 'cp-gps-user-marker',
    html: `
      <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.4);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:absolute;inset:4px;border-radius:50%;border:2.5px solid #2563EB;background:rgba(59,130,246,0.25);"></div>
        <div style="width:18px;height:18px;border-radius:50%;background:#2563EB;border:3px solid #FFFFFF;box-shadow:0 0 16px rgba(37,99,235,0.9);display:flex;align-items:center;justify-content:center;">
          <div style="width:6px;height:6px;border-radius:50%;background:#FFFFFF;"></div>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export function LiveMap({
  zones,
  selectedZoneId,
  onSelectZone,
  cityLabel,
  cityCoords,
  poiPlaces = [],
  selectedPOI = null,
  onSelectPOI,
  route = null,
  multiRoute = null,
  selectedRouteId,
  onSelectRouteAlternative,
  trafficIncidents = [],
  tomtomKey,
  onClearRoute,
  heightClass = 'h-[500px] sm:h-[580px]',
  onUserLocationDetected,
  userLocation = null,
  disabledCategories,
  onToggleCategory,
  activeInfrastructureCategory,
  onClearCategory,
  onPlanRouteTo,
  showMapRing = false,
  ringRadiusMeters = 2000,
  liveWeather,
  liveAqi,
  activeAlerts = [],
  onSimulateAlert,
  onOpenAssistant,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Layer groups
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const trafficTileLayerRef = useRef<L.TileLayer | null>(null);
  const zoneLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const poiLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const incidentsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const gpsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const ringLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const activeLayersGroupRef = useRef<L.LayerGroup | null>(null);

  // Reference Image 2: Active map layers (default: 6 essential layers matching Reference Image 2!)
  const [activeLayers, setActiveLayers] = useState<Set<MapLayerId>>(new Set(ESSENTIAL_LAYER_IDS));

  // Severity filter: 'all' | 'normal' | 'watch' | 'alert'
  const [severityFilter, setSeverityFilter] = useState<'all' | 'normal' | 'watch' | 'alert'>('all');
  const [severityDropdownOpen, setSeverityDropdownOpen] = useState(false);
  const [layersDropdownOpen, setLayersDropdownOpen] = useState(false);

  // Basemap & Overlays
  const [activeBaseTile, setActiveBaseTile] = useState<BaseTileType>('streets');
  const [showBasemapMenu, setShowBasemapMenu] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Selected Zone card (Reference Image 2 popup)
  const [cardZone, setCardZone] = useState<Zone | null>(null);

  // GPS state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Sync userLocation prop if passed from parent
  useEffect(() => {
    if (userLocation) {
      const coords = { lat: userLocation.lat, lng: userLocation.lng, accuracy: userLocation.accuracy };
      setUserCoords(coords);
      mapRef.current?.flyTo([userLocation.lat, userLocation.lng], 15, { animate: true, duration: 1.2 });
    }
  }, [userLocation]);

  // Dynamic layer POIs cache
  const [layerPOIs, setLayerPOIs] = useState<Record<string, POIPlace[]>>({});

  const trafficConfig = getTrafficProviderConfig(tomtomKey);

  // Sync cardZone when selectedZoneId changes or zones reload
  useEffect(() => {
    if (selectedZoneId) {
      const z = zones.find((item) => item.id === selectedZoneId) || zones[0] || null;
      setCardZone(z);
    } else if (zones.length > 0 && !cardZone) {
      setCardZone(zones[0]);
    }
  }, [selectedZoneId, zones]);

  // Toggle single layer
  const handleToggleLayer = (layerId: MapLayerId) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
        // If enabling traffic without API key, explain honestly
        if (layerId === 'traffic' && !trafficConfig.hasApiKey) {
          setNoticeMessage('Live TomTom traffic requires an API key in Settings. Simulated probe indicators shown.');
        }
      }
      return next;
    });
  };

  // Preset handlers (Reference Image 2: "All · Essential")
  const handleSetPreset = (preset: 'all' | 'essential') => {
    if (preset === 'all') {
      setActiveLayers(new Set(MAP_LAYERS.map((l) => l.id)));
    } else {
      setActiveLayers(new Set(ESSENTIAL_LAYER_IDS));
    }
  };

  // Fetch real OSM facilities for enabled layers (like Hospitals, Fire, Police, Schools, Parks, Parking)
  useEffect(() => {
    const fetchPromises: Promise<void>[] = [];

    MAP_LAYERS.forEach((layer) => {
      if (layer.categoryLink && activeLayers.has(layer.id) && !layerPOIs[layer.id]) {
        fetchPromises.push(
          searchNearbyPOIs(layer.categoryLink, cityCoords.lat, cityCoords.lng, 8)
            .then((places) => {
              setLayerPOIs((prev) => ({ ...prev, [layer.id]: places }));
            })
            .catch(() => {
              // Graceful failure
            })
        );
      }
    });
  }, [activeLayers, cityCoords.lat, cityCoords.lng, layerPOIs]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [cityCoords.lat, cityCoords.lng],
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    });

    const streetTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const baseLayer = L.tileLayer(streetTileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
      maxNativeZoom: 19,
    }).addTo(map);

    baseTileLayerRef.current = baseLayer;

    // Create layer groups
    zoneLayerGroupRef.current = L.layerGroup().addTo(map);
    poiLayerGroupRef.current = L.layerGroup().addTo(map);
    routeLayerGroupRef.current = L.layerGroup().addTo(map);
    incidentsLayerGroupRef.current = L.layerGroup().addTo(map);
    gpsLayerGroupRef.current = L.layerGroup().addTo(map);
    ringLayerGroupRef.current = L.layerGroup().addTo(map);
    activeLayersGroupRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center when city changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([cityCoords.lat, cityCoords.lng], 12, { animate: true });
  }, [cityCoords.lat, cityCoords.lng]);

  // Update base tile style
  const handleSelectBaseTile = (type: BaseTileType) => {
    setActiveBaseTile(type);
    setShowBasemapMenu(false);
    const map = mapRef.current;
    if (!map || !baseTileLayerRef.current) return;

    map.removeLayer(baseTileLayerRef.current);

    let url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attr = '&copy; OpenStreetMap contributors';

    switch (type) {
      case 'esri_streets':
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
        attr = 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ';
        break;
      case 'topo':
        url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
        attr = 'Map data: &copy; OpenStreetMap, SRTM | Map style: &copy; OpenTopoMap';
        break;
      case 'satellite':
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        attr = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS';
        break;
      case 'dark':
        url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        attr = '&copy; OpenStreetMap contributors &copy; CARTO';
        break;
      default:
        url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        attr = '&copy; OpenStreetMap contributors';
    }

    const newLayer = L.tileLayer(url, { attribution: attr, maxZoom: 19 }).addTo(map);
    baseTileLayerRef.current = newLayer;
  };

  // Render Map Ring (Reference Image 1 & Section 7)
  useEffect(() => {
    const group = ringLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (showMapRing) {
      L.circle([cityCoords.lat, cityCoords.lng], {
        radius: ringRadiusMeters,
        color: '#10B981',
        weight: 2,
        fillColor: '#10B981',
        fillOpacity: 0.08,
        dashArray: '6, 6',
      })
        .addTo(group)
        .bindTooltip(
          `<div style="font-weight:700;font-size:11px;color:#065F46;">Search Ring: ${
            ringRadiusMeters < 1000 ? ringRadiusMeters + ' m' : ringRadiusMeters / 1000 + ' km'
          }</div>`,
          { direction: 'top', className: 'cp-tooltip' }
        );
    }
  }, [showMapRing, ringRadiusMeters, cityCoords.lat, cityCoords.lng]);

  // Render Zones & Geographic Boundary Polygons (Reference Image 2)
  useEffect(() => {
    const group = zoneLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    // Filter zones based on severityFilter
    const filteredZones = zones.filter((z) => {
      if (severityFilter === 'all') return true;
      if (severityFilter === 'normal') return z.status === 'normal' || z.severityScore < 38;
      if (severityFilter === 'watch') return z.status === 'watch' || (z.severityScore >= 38 && z.severityScore <= 65);
      if (severityFilter === 'alert') return z.status === 'alert' || z.severityScore > 65;
      return true;
    });

    filteredZones.forEach((zone, idx) => {
      const isSelected = zone.id === selectedZoneId;
      const icon = createZoneIcon(zone.status, isSelected);

      const marker = L.marker([zone.coords.lat, zone.coords.lng], { icon })
        .addTo(group)
        .bindTooltip(
          `<div style="font-weight:700;font-size:12px;color:#0F172A;">${zone.name}</div>
           <div style="font-size:11px;color:#475569;display:flex;align-items:center;gap:4px;margin-top:2px;">
             <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusColor[zone.status]};"></span>
             <span>${zone.status.toUpperCase()} · Score: ${zone.severityScore}/100</span>
           </div>`,
          { direction: 'top', offset: [0, -14], className: 'cp-tooltip' }
        );

      marker.on('click', () => {
        onSelectZone(zone.id);
        setCardZone(zone);
        if (onSelectPOI) onSelectPOI(null);
      });

      // Render Geographic boundary polygon matching Reference Image 2:
      // Zone 1 has green dashed line, Zone 2 has solid blue, etc.
      if (zone.polygon && zone.polygon.length > 2) {
        const polyCoords: [number, number][] = zone.polygon.map((p) => [p.lat, p.lng]);
        const color = isSelected ? '#2563EB' : statusColor[zone.status];
        const isDashed = idx % 2 === 0;

        L.polygon(polyCoords, {
          color,
          weight: isSelected ? 2.5 : 1.8,
          dashArray: isDashed ? '6, 6' : undefined,
          opacity: 0.9,
          fillColor: color,
          fillOpacity: isSelected ? 0.2 : 0.08,
        })
          .addTo(group)
          .on('click', () => {
            onSelectZone(zone.id);
            setCardZone(zone);
          });
      }
    });
  }, [zones, selectedZoneId, severityFilter, onSelectZone, onSelectPOI]);

  // Render Active Intelligence Layers (Weather, Air Quality, Alerts, and Facilities)
  useEffect(() => {
    const group = activeLayersGroupRef.current;
    if (!group) return;

    group.clearLayers();

    // 1. Weather layer: render weather badge per zone
    if (activeLayers.has('weather')) {
      zones.forEach((z) => {
        const icon = createLayerIcon('🌤️', '#38BDF8', false);
        L.marker([z.coords.lat + 0.003, z.coords.lng - 0.003], { icon })
          .addTo(group)
          .bindTooltip(`<b>Weather:</b> ${z.weather.value}`, { direction: 'top' });
      });
    }

    // 2. Air Quality layer: render AQI reading
    if (activeLayers.has('air_quality')) {
      zones.forEach((z) => {
        const icon = createLayerIcon('🍃', '#10B981', false);
        L.marker([z.coords.lat - 0.003, z.coords.lng + 0.003], { icon })
          .addTo(group)
          .bindTooltip(`<b>Air Quality:</b> ${liveAqi ? `${liveAqi.aqi} AQI · ${liveAqi.category}` : 'Good (42 AQI)'}`, { direction: 'top' });
      });
    }

    // 3. Civic Incidents layer
    if (activeLayers.has('civic_incidents')) {
      zones.forEach((z) => {
        const icon = createLayerIcon('🌋', '#F97316', false);
        L.marker([z.coords.lat + 0.002, z.coords.lng + 0.004], { icon })
          .addTo(group)
          .bindTooltip(`<b>Civic Grievances:</b> ${z.complaints.value} active reports in ${z.name}`, { direction: 'top' });
      });
    }

    // 4. Civic Alerts layer
    if (activeLayers.has('alerts') && activeAlerts.length > 0) {
      activeAlerts.forEach((alert) => {
        const icon = createLayerIcon('🚨', '#E11D48', true);
        const lat = alert.coordinates?.lat ?? cityCoords.lat;
        const lng = alert.coordinates?.lng ?? cityCoords.lng;
        L.marker([lat + 0.001, lng - 0.001], { icon })
          .addTo(group)
          .bindTooltip(`<b>${alert.event}</b><br/>${alert.headline}`, { direction: 'top' });
      });
    }

    // 5. Mapped Infrastructure layers (Hospitals, Fire, Police, Schools, Parks, Parking)
    MAP_LAYERS.forEach((layer) => {
      if (layer.categoryLink && activeLayers.has(layer.id)) {
        const places = layerPOIs[layer.id] || [];
        places.forEach((p) => {
          const icon = createLayerIcon(layer.emoji, layer.color, false);
          L.marker([p.latitude, p.longitude], { icon })
            .addTo(group)
            .bindTooltip(`<b>${p.name}</b><br/>${p.categoryLabel} · ${p.distanceKm} km`, { direction: 'top' })
            .on('click', () => {
              onSelectPOI?.(p);
            });
        });
      }
    });
  }, [activeLayers, zones, liveAqi, activeAlerts, cityCoords, layerPOIs, onSelectPOI]);

  // Traffic Flow Raster Tile Layer (TomTom Flow Tile API relative0)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activeLayers.has('traffic') && tomtomKey && tomtomKey.trim() !== '') {
      if (!trafficTileLayerRef.current) {
        const trafficLayer = L.tileLayer(
          `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${tomtomKey}`,
          {
            attribution: '&copy; <a href="https://www.tomtom.com" target="_blank" rel="noopener noreferrer">TomTom</a> Live Traffic Flow',
            opacity: 0.85,
            maxZoom: 18,
          }
        );
        trafficLayer.addTo(map);
        trafficTileLayerRef.current = trafficLayer;
      }
    } else {
      if (trafficTileLayerRef.current) {
        map.removeLayer(trafficTileLayerRef.current);
        trafficTileLayerRef.current = null;
      }
    }
  }, [activeLayers, tomtomKey]);

  // Render Traffic Incidents & Road Disruptions on Map
  useEffect(() => {
    const group = incidentsLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    // Show when traffic layer is active OR whenever journey route incidents are present
    const shouldDisplay = activeLayers.has('traffic') || (multiRoute && trafficIncidents.length > 0);
    if (!shouldDisplay || !trafficIncidents || trafficIncidents.length === 0) return;

    trafficIncidents.forEach((inc) => {
      const isClosed = inc.roadClosed;
      const isAccident = inc.type.toLowerCase().includes('accident') || inc.type.toLowerCase().includes('crash');
      const isRoadwork = inc.type.toLowerCase().includes('roadwork') || inc.type.toLowerCase().includes('construction') || inc.type.toLowerCase().includes('pothole');
      
      const glyph = isClosed ? '⛔' : isAccident ? '💥' : isRoadwork ? '🚧' : '⚠️';
      const bgColor = isClosed ? '#DC2626' : isAccident ? '#EA580C' : isRoadwork ? '#D97706' : '#EAB308';
      const severityColor = inc.severity === 'severe' ? '#DC2626' : inc.severity === 'major' ? '#EA580C' : inc.severity === 'moderate' ? '#D97706' : '#10B981';

      const customIcon = L.divIcon({
        className: 'cp-traffic-incident-marker',
        html: `
          <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
            ${isClosed ? '<div style="position:absolute;inset:-4px;border-radius:50%;border:2.5px solid #DC2626;animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>' : ''}
            <div style="width:30px;height:30px;border-radius:50%;background:${bgColor};border:2px solid #FFFFFF;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;">
              ${glyph}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const delayText = inc.delaySeconds > 0 ? `+${Math.round(inc.delaySeconds / 60)} min delay` : 'Delay variable';

      const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon })
        .addTo(group)
        .bindPopup(
          `<div style="font-family:Inter,system-ui,sans-serif;padding:8px;min-width:220px;max-width:280px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <span style="font-size:10px;font-weight:800;letter-spacing:0.5px;padding:2px 7px;border-radius:999px;background:${isClosed ? '#FEE2E2' : '#FEF3C7'};color:${isClosed ? '#991B1B' : '#92400E'};">
                ${isClosed ? '⛔ ROAD CLOSED' : glyph + ' ' + inc.type.toUpperCase()}
              </span>
              <span style="font-size:10px;font-weight:700;color:${severityColor};">
                ${inc.severity.toUpperCase()}
              </span>
            </div>
            <div style="font-weight:700;font-size:13px;color:#0F172A;line-height:1.3;margin-bottom:4px;">
              ${inc.description}
            </div>
            ${inc.roadName ? `<div style="font-size:11px;color:#475569;margin-bottom:4px;"><b>Corridor:</b> ${inc.roadName}</div>` : ''}
            <div style="font-size:11px;color:#B45309;font-weight:600;margin-bottom:4px;">
              ⏱️ ${delayText}
            </div>
            <div style="font-size:10px;color:#64748B;border-top:1px solid #E2E8F0;padding-top:4px;margin-top:6px;display:flex;justify-content:space-between;">
              <span>Updated: ${new Date(inc.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span>${tomtomKey ? 'TomTom' : 'Municipal'}</span>
            </div>
          </div>`,
          { className: 'cp-incident-popup' }
        );

      marker.bindTooltip(
        `<b>${glyph} ${inc.roadClosed ? 'ROAD CLOSED' : inc.type}</b><br/>${inc.description.slice(0, 45)}...`,
        { direction: 'top', className: 'cp-tooltip' }
      );
    });
  }, [activeLayers, trafficIncidents, multiRoute, tomtomKey]);

  // Render GPS Position Marker
  useEffect(() => {
    const group = gpsLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (userCoords) {
      const icon = createGPSUserIcon();
      const marker = L.marker([userCoords.lat, userCoords.lng], { icon, zIndexOffset: 1000 }).addTo(group);

      const radiusM = Math.max(userCoords.accuracy || 50, 30);
      L.circle([userCoords.lat, userCoords.lng], {
        radius: Math.min(radiusM, 2500),
        color: '#2563EB',
        fillColor: '#3B82F6',
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '4, 4',
      }).addTo(group);

      marker.bindPopup(
        `<div style="font-family:Inter,system-ui,sans-serif;padding:6px;min-width:180px;">
          <div style="font-weight:800;font-size:13px;color:#1E3A8A;display:flex;align-items:center;gap:6px;">
            <span>📍 Your Live Location</span>
          </div>
          <div style="font-size:11px;color:#475569;margin-top:4px;">
            Lat: ${userCoords.lat.toFixed(4)}, Lng: ${userCoords.lng.toFixed(4)}
          </div>
          <div style="font-size:11px;color:#2563EB;font-weight:600;margin-top:2px;">
            Estimated Accuracy: ±${Math.round(userCoords.accuracy || 25)}m
          </div>
          <div style="font-size:10px;color:#10B981;font-weight:700;margin-top:4px;padding:2px 6px;background:#ECFDF5;border-radius:6px;display:inline-block;">
            Active Position Locked
          </div>
        </div>`
      ).openPopup();
    }
  }, [userCoords]);

  // Render Route and Multi-Route Alternatives
  useEffect(() => {
    const group = routeLayerGroupRef.current;
    const map = mapRef.current;
    if (!group || !map) return;

    group.clearLayers();

    // Collect all latlngs to compute bounds
    const boundsPoints: [number, number][] = [];

    if (multiRoute && multiRoute.routes.length > 0) {
      const activeRouteId = selectedRouteId || multiRoute.selectedRouteId || multiRoute.routes[0].id;

      // 1. Draw alternative (non-selected) routes first with subtle dashed styling
      multiRoute.routes.forEach((alt) => {
        if (alt.id === activeRouteId) return;

        const poly = L.polyline(alt.coordinates, {
          color: '#64748B',
          weight: 4,
          opacity: 0.75,
          dashArray: '8, 8',
          lineCap: 'round',
        }).addTo(group);

        poly.bindTooltip(
          `<b>${alt.label}</b><br/>${(alt.distanceMeters / 1000).toFixed(1)} km · ${Math.round(alt.durationSeconds / 60)} mins<br/><span style="color:#2563EB;">Click to select this route</span>`,
          { sticky: true, className: 'cp-tooltip' }
        );

        poly.on('click', () => {
          if (onSelectRouteAlternative) {
            onSelectRouteAlternative(alt.id);
          }
        });

        alt.coordinates.forEach((c) => boundsPoints.push(c));
      });

      // 2. Draw selected route with vibrant highlighted styling
      const selectedAlt = multiRoute.routes.find((a) => a.id === activeRouteId) || multiRoute.routes[0];
      if (selectedAlt) {
        // Glowing casing
        L.polyline(selectedAlt.coordinates, {
          color: '#1D4ED8',
          weight: 8,
          opacity: 0.35,
          lineCap: 'round',
        }).addTo(group);

        // Core line
        const mainPoly = L.polyline(selectedAlt.coordinates, {
          color: '#2563EB',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
        }).addTo(group);

        mainPoly.bindTooltip(
          `<b>Selected Route: ${selectedAlt.label}</b><br/>${(selectedAlt.distanceMeters / 1000).toFixed(1)} km · ${Math.round(selectedAlt.durationSeconds / 60)} mins · Arrives ${selectedAlt.estimatedArrivalTime}`,
          { sticky: true, className: 'cp-tooltip' }
        );

        selectedAlt.coordinates.forEach((c) => boundsPoints.push(c));

        // 3. Render Weather Checkpoints along route
        if (selectedAlt.weatherCheckpoints && selectedAlt.weatherCheckpoints.length > 0) {
          selectedAlt.weatherCheckpoints.forEach((chk) => {
            const chkIcon = L.divIcon({
              className: 'cp-weather-checkpoint',
              html: `
                <div style="background:white;padding:2px 6px;border-radius:12px;border:1.5px solid #0284C7;font-size:10px;font-weight:700;color:#0F172A;box-shadow:0 2px 6px rgba(0,0,0,0.2);display:flex;align-items:center;gap:3px;white-space:nowrap;">
                  <span>🌤️</span>
                  <span>${chk.temperature}°C</span>
                </div>
              `,
              iconSize: [60, 22],
              iconAnchor: [30, 11],
            });

            L.marker([chk.lat, chk.lng], { icon: chkIcon })
              .addTo(group)
              .bindTooltip(`<b>${chk.label}</b><br/>${chk.weatherLabel}, ${chk.temperature}°C<br/>Est. Transit: ${chk.estimatedArrivalLocalTime}`, { direction: 'top' });
          });
        }
      }

      // 4. Render Origin, Waypoints & Destination Pins
      const originIcon = L.divIcon({
        className: 'cp-origin-marker',
        html: `
          <div style="width:28px;height:28px;border-radius:50%;background:#10B981;border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:12px;">
            A
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([multiRoute.origin.lat, multiRoute.origin.lng], { icon: originIcon })
        .addTo(group)
        .bindTooltip(`<b>Start: ${multiRoute.origin.name}</b><br/>Departure: ${new Date(multiRoute.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, { direction: 'top' });

      // Intermediate waypoints
      multiRoute.waypoints?.forEach((wp, wIdx) => {
        const wpIcon = L.divIcon({
          className: 'cp-waypoint-marker',
          html: `
            <div style="width:24px;height:24px;border-radius:50%;background:#F59E0B;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:10px;">
              ${wIdx + 1}
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        L.marker([wp.lat, wp.lng], { icon: wpIcon })
          .addTo(group)
          .bindTooltip(`<b>Via Stop: ${wp.name}</b>`, { direction: 'top' });
      });

      // Destination Pin
      const destIcon = L.divIcon({
        className: 'cp-dest-marker',
        html: `
          <div style="width:28px;height:28px;border-radius:50%;background:#EF4444;border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:12px;">
            B
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([multiRoute.destination.lat, multiRoute.destination.lng], { icon: destIcon })
        .addTo(group)
        .bindTooltip(`<b>Destination: ${multiRoute.destination.name}</b>`, { direction: 'top' });

    } else if (route && route.coordinates && route.coordinates.length > 0) {
      // Single route fallback
      L.polyline(route.coordinates, {
        color: '#2563EB',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
      }).addTo(group).bindTooltip(`<b>${route.summary}</b>`, { sticky: true });

      route.coordinates.forEach((c) => boundsPoints.push(c));
    }

    // Fit map bounds to encompass the entire route
    if (boundsPoints.length > 0) {
      try {
        const bounds = L.latLngBounds(boundsPoints.map(([lat, lng]) => [lat, lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
      } catch {
        // Safe fallback
      }
    }
  }, [route, multiRoute, selectedRouteId, onSelectRouteAlternative]);

  // Navigation handlers
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = () => {
    mapRef.current?.setView([cityCoords.lat, cityCoords.lng], 12, { animate: true });
  };

  const handleLocateMe = async () => {
    setGpsError(null);
    setIsLocating(true);
    try {
      const loc = await getLiveUserLocation();
      const coords = { lat: loc.latitude, lng: loc.longitude, accuracy: loc.accuracy };
      setUserCoords(coords);
      onUserLocationDetected?.(coords);
      mapRef.current?.flyTo([loc.latitude, loc.longitude], 15, { animate: true, duration: 1.2 });
    } catch {
      setGpsError('Could not retrieve location. Please check browser permissions.');
    } finally {
      setIsLocating(false);
    }
  };

  const activeLayersCount = activeLayers.size;

  return (
    <div className="w-full bg-white dark:bg-citynavy-card rounded-3xl border border-slate-200 dark:border-citynavy-border shadow-xl overflow-hidden transition-all flex flex-col">
      {/* Top Header Deck (Reference Image 2) */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-citynavy-border flex flex-col gap-3.5 bg-slate-50/70 dark:bg-citynavy/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Title & Subtitle with Location Pin */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-sm">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Live Geographic Intelligence Map
              </h2>
              <p className="text-xs text-slate-500 dark:text-citynavy-muted mt-0.5">
                {cityLabel} · {zones.length} active zones mapped
              </p>
            </div>
          </div>

          {/* Top Right Controls (Reference Image 2) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Layers (X) Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLayersDropdownOpen(!layersDropdownOpen)}
                className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300 font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-blue-100 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Layers ({activeLayersCount})</span>
                {layersDropdownOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {layersDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 max-h-72 overflow-y-auto bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl shadow-2xl z-[500] p-2 space-y-1">
                  <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase">
                    Selectable Overlays
                  </div>
                  {MAP_LAYERS.map((layer) => {
                    const isActive = activeLayers.has(layer.id);
                    return (
                      <button
                        key={layer.id}
                        type="button"
                        onClick={() => handleToggleLayer(layer.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{layer.emoji}</span>
                          <span>{layer.label}</span>
                        </span>
                        {isActive && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Severity Filter Dropdown (Reference Image 2) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSeverityDropdownOpen(!severityDropdownOpen)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {severityFilter === 'all'
                    ? 'All Severities'
                    : severityFilter === 'normal'
                    ? 'Normal (<38)'
                    : severityFilter === 'watch'
                    ? 'Watch (38–65)'
                    : 'Alert (>65)'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {severityDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-xl shadow-2xl z-[500] p-1.5 space-y-0.5">
                  {[
                    { id: 'all', label: 'All Severities', color: '#64748B' },
                    { id: 'normal', label: 'Normal (<38)', color: '#10B981' },
                    { id: 'watch', label: 'Watch (38–65)', color: '#F59E0B' },
                    { id: 'alert', label: 'Alert (>65)', color: '#EF4444' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSeverityFilter(opt.id as any);
                        setSeverityDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                        severityFilter === opt.id
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Locate Me Button & Live Indicator */}
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                userCoords
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-blue-500/25'
                  : 'bg-white dark:bg-citynavy-secondary hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-citynavy-border'
              }`}
              title="Detect and show my live location on map"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-blue-400' : userCoords ? 'text-white' : 'text-blue-600'}`} />
              <span>{isLocating ? 'Locating...' : userCoords ? 'Live Location On' : 'Live Location'}</span>
              {userCoords && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
            </button>

            {/* Recenter */}
            <button
              type="button"
              onClick={handleRecenter}
              className="p-2 rounded-xl border border-slate-200 dark:border-citynavy-border shadow-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Recenter on city center"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Basemap Styles */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBasemapMenu(!showBasemapMenu)}
                className="p-2 rounded-xl border border-slate-200 dark:border-citynavy-border shadow-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Change Basemap Style"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>

              {showBasemapMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-xl shadow-2xl z-[500] p-1.5 space-y-1">
                  {[
                    { id: 'streets', label: 'OpenStreetMap Streets' },
                    { id: 'esri_streets', label: 'Esri World Street' },
                    { id: 'topo', label: 'Topographic Map' },
                    { id: 'satellite', label: 'Satellite Imagery' },
                    { id: 'dark', label: 'Carto Dark Mode' },
                  ].map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => handleSelectBaseTile(tile.id as BaseTileType)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                        activeBaseTile === tile.id
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {tile.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ACTIVE MAP LAYERS Row (Reference Image 2) */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-citynavy-border/60">
          <div className="flex items-center justify-between pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>ACTIVE MAP LAYERS:</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-500">
              <button
                type="button"
                onClick={() => handleSetPreset('all')}
                className="hover:text-blue-600 transition-colors"
              >
                All
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => handleSetPreset('essential')}
                className="hover:text-blue-600 transition-colors text-blue-600 dark:text-blue-400 font-bold"
              >
                Essential
              </button>
            </div>
          </div>

          {/* 16 Interactive Layer Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {MAP_LAYERS.map((layer) => {
              const isActive = activeLayers.has(layer.id);
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => handleToggleLayer(layer.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                    isActive
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm ring-1 ring-blue-400/40 font-bold'
                      : 'bg-white dark:bg-citynavy-secondary border-slate-200 dark:border-citynavy-border text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                  aria-pressed={isActive}
                  title={layer.description}
                >
                  <span className="text-sm">{layer.emoji}</span>
                  <span>{layer.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {noticeMessage && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
          <span>{noticeMessage}</span>
          <button onClick={() => setNoticeMessage(null)} className="text-amber-500 hover:text-amber-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Map Canvas with Leaflet */}
      <div className={`relative w-full ${heightClass} bg-slate-100 dark:bg-slate-900`}>
        <div ref={containerRef} className="w-full h-full" />

        {/* Selected Zone Information Popup Card (Reference Image 2) */}
        {cardZone && (
          <div className="absolute top-4 left-4 sm:left-6 z-[450] bg-white dark:bg-citynavy-card rounded-2xl shadow-2xl border border-slate-200/90 dark:border-citynavy-border p-4 w-72 sm:w-80 animate-in fade-in zoom-in-95 backdrop-blur-md">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100 dark:border-citynavy-border/60">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  {cardZone.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-citynavy-muted mt-0.5">
                  {cardZone.city}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCardZone(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
                aria-label="Close card"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-citynavy-muted">Weather:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {cardZone.weather.value}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-citynavy-muted">Transit:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {cardZone.transit.value}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-citynavy-muted">Grievances:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {cardZone.complaints.value}
                </span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-100 dark:border-citynavy-border/60 flex items-center justify-between">
              <span
                className="text-xs font-bold"
                style={{ color: statusColor[cardZone.status] }}
              >
                Severity: {cardZone.severityScore}/100
              </span>
              <button
                type="button"
                onClick={() => onSelectZone(cardZone.id)}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                View Telemetry →
              </button>
            </div>
          </div>
        )}

        {/* Bottom-Left Legend (Reference Image 2) */}
        <div className="absolute bottom-4 left-4 z-[400] bg-white/95 dark:bg-citynavy-card/95 backdrop-blur-md border border-slate-200 dark:border-citynavy-border rounded-xl px-3 py-2 shadow-md flex items-center gap-3 text-xs font-medium text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
            <span>Normal (&lt;38)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
            <span>Watch (38–65)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm animate-pulse" />
            <span>Alert (&gt;65)</span>
          </span>
        </div>

        {/* Floating Traffic Flow Legend when traffic layer is active */}
        {activeLayers.has('traffic') && (
          <div className="absolute top-4 right-4 z-[400] bg-white/95 dark:bg-citynavy-card/95 backdrop-blur-md border border-slate-200 dark:border-citynavy-border rounded-xl px-3 py-2 shadow-lg flex flex-wrap items-center gap-3 text-xs font-medium text-slate-700 dark:text-slate-300 animate-in fade-in">
            <span className="font-bold text-[11px] text-slate-600 dark:text-slate-300 uppercase flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Traffic Flow:</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
              <span>Free Flow</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
              <span>Moderate</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
              <span>Congested</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-700 shadow-sm animate-pulse" />
              <span>Road Closed</span>
            </span>
            <span className="text-[10px] text-slate-400 border-l pl-2 border-slate-300 dark:border-slate-700">
              {tomtomKey ? 'TomTom Live Flow' : 'Municipal Disruptions'}
            </span>
          </div>
        )}

        {/* Bottom-Left: Simulate Alert Button (Reference Image 2) */}
        <button
          type="button"
          onClick={() => {
            if (onSimulateAlert) {
              onSimulateAlert();
            } else {
              setNoticeMessage('Alert simulation triggered: Elevated watch notice active in Central District.');
            }
          }}
          className="absolute bottom-16 left-4 z-[400] bg-slate-900/90 text-white hover:bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-lg backdrop-blur-sm transition-all hover:scale-105"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Simulate Alert</span>
        </button>

        {/* Bottom-Right: Pulse Assistant Button (Reference Image 2) */}
        <button
          type="button"
          onClick={() => onOpenAssistant?.()}
          className="absolute bottom-4 right-20 z-[400] bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 transition-all hover:scale-105 shadow-blue-500/25"
        >
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span>Pulse Assistant</span>
        </button>

        {/* Bottom-Right: Zoom Controls (Reference Image 2) */}
        <div className="absolute right-4 bottom-4 z-[400] flex flex-col gap-1">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg bg-white/95 dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border shadow-sm flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-base"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg bg-white/95 dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border shadow-sm flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-base"
            aria-label="Zoom out"
          >
            -
          </button>
        </div>
      </div>
    </div>
  );
}
