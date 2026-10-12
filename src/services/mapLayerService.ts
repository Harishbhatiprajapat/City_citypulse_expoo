import type { MapLayerId, POICategory } from '@/types';

export interface MapLayerMeta {
  id: MapLayerId;
  label: string;
  emoji: string;
  color: string;
  isEssential: boolean;
  categoryLink?: POICategory;
  description: string;
}

export const MAP_LAYERS: MapLayerMeta[] = [
  { id: 'weather', label: 'Weather', emoji: '🌤️', color: '#38BDF8', isEssential: true, description: 'Live temperature, conditions & wind' },
  { id: 'traffic', label: 'Traffic', emoji: '🚦', color: '#EF4444', isEssential: true, description: 'TomTom traffic flow & road probes' },
  { id: 'transit', label: 'Transit', emoji: '🚌', color: '#0EA5E9', isEssential: false, description: 'Public transit routes & schedule status' },
  { id: 'civic_incidents', label: 'Civic Incidents', emoji: '🌋', color: '#F97316', isEssential: true, description: 'Citizen grievances & municipal issues' },
  { id: 'hospitals', label: 'Hospitals', emoji: '🏥', color: '#DC2626', isEssential: true, categoryLink: 'hospitals', description: 'Emergency rooms, hospitals & clinics' },
  { id: 'fire', label: 'Fire', emoji: '🚒', color: '#B91C1C', isEssential: false, categoryLink: 'fire_stations', description: 'Fire stations & emergency rescue' },
  { id: 'police', label: 'Police', emoji: '👮', color: '#2563EB', isEssential: false, categoryLink: 'police', description: 'Police stations & civic safety' },
  { id: 'schools', label: 'Schools', emoji: '🎓', color: '#9333EA', isEssential: false, categoryLink: 'schools', description: 'Schools, colleges & learning centers' },
  { id: 'parks', label: 'Parks', emoji: '🌳', color: '#16A34A', isEssential: false, categoryLink: 'parks', description: 'Urban parks, gardens & green space' },
  { id: 'roadwork', label: 'Roadwork', emoji: '🚧', color: '#D97706', isEssential: false, description: 'Lane closures, construction & repairs' },
  { id: 'parking', label: 'Parking', emoji: '🅿️', color: '#64748B', isEssential: false, categoryLink: 'parking', description: 'Public parking lots & garages' },
  { id: 'waste', label: 'Waste', emoji: '♻️', color: '#059669', isEssential: false, description: 'Waste collection districts & recycling' },
  { id: 'water', label: 'Water', emoji: '💧', color: '#0284C7', isEssential: false, description: 'Municipal water supply & pressure zones' },
  { id: 'power', label: 'Power', emoji: '⚡', color: '#EAB308', isEssential: false, description: 'Electrical grid & substation reliability' },
  { id: 'air_quality', label: 'Air Quality', emoji: '🍃', color: '#10B981', isEssential: true, description: 'Real Open-Meteo AQI monitoring' },
  { id: 'alerts', label: 'Alerts', emoji: '🚨', color: '#E11D48', isEssential: true, description: 'Critical civic & weather bulletins' },
];

export const ESSENTIAL_LAYER_IDS: MapLayerId[] = [
  'weather',
  'traffic',
  'civic_incidents',
  'hospitals',
  'air_quality',
  'alerts',
];

export function getMapLayerMeta(layerId: MapLayerId): MapLayerMeta {
  return MAP_LAYERS.find((l) => l.id === layerId) || MAP_LAYERS[0];
}

export function isLayerEssential(layerId: MapLayerId): boolean {
  return ESSENTIAL_LAYER_IDS.includes(layerId);
}
