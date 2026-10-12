import { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Phone,
  Globe,
  Clock,
  Compass,
  ExternalLink,
  Navigation,
  Image as ImageIcon,
  Share2,
  Bookmark,
  Check,
  Maximize2,
  Loader2,
} from 'lucide-react';
import type { POIPlace, PlacePhoto } from '@/types';
import { getCategoryMeta } from '@/services/geoService';
import { populatePlacePhotos } from '@/services/geoService';
import { savePlace, isPlaceSaved } from '@/services/savedPlacesService';

interface LocationDetailPanelProps {
  place: POIPlace | null;
  cityName: string;
  onClose: () => void;
  onPlanRouteTo?: (destName: string, lat: number, lng: number) => void;
  onFindNearby?: (place: POIPlace) => void;
}

export function LocationDetailPanel({
  place,
  cityName,
  onClose,
  onPlanRouteTo,
  onFindNearby,
}: LocationDetailPanelProps) {
  const [enrichedPlace, setEnrichedPlace] = useState<POIPlace | null>(place);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!place) {
      setEnrichedPlace(null);
      return;
    }

    setEnrichedPlace(place);
    setActivePhotoIndex(0);
    setImageError(false);
    setSaved(isPlaceSaved(place.name));

    // If photos are not yet populated, fetch genuine Wikimedia Commons / Wikipedia images
    if (!place.photos || place.photos.length === 0) {
      setLoadingPhotos(true);
      populatePlacePhotos(place, cityName)
        .then((updated) => {
          setEnrichedPlace(updated);
          setLoadingPhotos(false);
        })
        .catch(() => {
          setLoadingPhotos(false);
        });
    }
  }, [place, cityName]);

  if (!enrichedPlace) return null;

  const meta = getCategoryMeta(enrichedPlace.category);
  const photos = enrichedPlace.photos || [];
  const currentPhoto: PlacePhoto | undefined = photos[activePhotoIndex];

  const handleSave = () => {
    savePlace({
      name: enrichedPlace.name,
      label: enrichedPlace.address || `${enrichedPlace.name}, ${cityName}`,
      category: enrichedPlace.categoryLabel,
      latitude: enrichedPlace.latitude,
      longitude: enrichedPlace.longitude,
    });
    setSaved(true);
  };

  const handleShare = () => {
    const text = `${enrichedPlace.name} - ${enrichedPlace.address || cityName}\nhttps://www.openstreetmap.org/?mlat=${enrichedPlace.latitude}&mlon=${enrichedPlace.longitude}#map=16/${enrichedPlace.latitude}/${enrichedPlace.longitude}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${enrichedPlace.latitude},${enrichedPlace.longitude}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${enrichedPlace.latitude}&mlon=${enrichedPlace.longitude}#map=17/${enrichedPlace.latitude}/${enrichedPlace.longitude}`;

  return (
    <>
      <div className="w-full sm:w-[380px] lg:w-[420px] bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-down max-h-[85vh] sm:max-h-[640px]">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-citynavy-bg border-b border-slate-200 dark:border-citynavy-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: meta.color }}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-citynavy-text">
              Location Details
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleShare}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Share or copy coordinates"
              aria-label="Share location"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleSave}
              className={`p-1.5 rounded-lg transition-colors ${
                saved
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              title={saved ? 'Saved in Saved Places' : 'Save location'}
              aria-label="Save location"
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Close panel"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-4 space-y-4">
          {/* Photograph / Gallery Section */}
          <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800/60 aspect-[16/9] border border-slate-200 dark:border-citynavy-border flex items-center justify-center group">
            {loadingPhotos ? (
              <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span>Checking verified photo archive...</span>
              </div>
            ) : currentPhoto && !imageError ? (
              <>
                <img
                  src={currentPhoto.url}
                  alt={currentPhoto.title || enrichedPlace.name}
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  title="Enlarge photograph"
                  aria-label="Enlarge photo"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                {currentPhoto.attribution && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-[10px] text-white/90 truncate">
                    {currentPhoto.attribution}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-slate-400 dark:text-slate-500 p-4 text-center">
                <ImageIcon className="w-7 h-7 stroke-[1.5]" />
                <span className="text-xs font-medium">Photograph not available</span>
                <span className="text-[10px] text-slate-400">Public domain photo archive checked</span>
              </div>
            )}
          </div>

          {/* Thumbnail Gallery (if multiple photos available) */}
          {photos.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {photos.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActivePhotoIndex(idx);
                    setImageError(false);
                  }}
                  className={`w-14 h-10 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                    activePhotoIndex === idx
                      ? 'border-blue-500 scale-105 shadow-md'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={p.thumbnailUrl || p.url}
                    alt={p.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Place Title & Category Badge */}
          <div>
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white shadow-sm flex items-center gap-1"
                style={{ backgroundColor: meta.color }}
              >
                <span>{meta.emoji}</span>
                <span>{enrichedPlace.categoryLabel}</span>
              </span>
              {enrichedPlace.verified && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  Verified OSM Node
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-citynavy-text mt-2 leading-tight">
              {enrichedPlace.name}
            </h3>

            {enrichedPlace.operator && (
              <p className="text-xs font-medium text-slate-500 dark:text-citynavy-muted mt-0.5">
                Operator: {enrichedPlace.operator}
              </p>
            )}
          </div>

          {/* Location & Coordinates Info */}
          <div className="space-y-2 text-xs bg-slate-50 dark:bg-citynavy-bg p-3 rounded-xl border border-slate-200/80 dark:border-citynavy-border">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Address: </span>
                <span className="text-slate-600 dark:text-citynavy-muted leading-relaxed">
                  {enrichedPlace.address || 'Address not listed in OpenStreetMap'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1 text-slate-600 dark:text-citynavy-muted">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Coordinates: </span>
                {enrichedPlace.latitude.toFixed(5)}° N, {enrichedPlace.longitude.toFixed(5)}° E
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Navigation className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                {enrichedPlace.distanceKm} km from center
              </div>
            </div>
          </div>

          {/* Contact, Hours & Website Details (Never invented) */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2.5 py-1 border-b border-slate-100 dark:border-citynavy-border/50">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="font-medium text-slate-500 dark:text-slate-400 w-24">Phone:</span>
              <span className="text-slate-800 dark:text-citynavy-text font-medium truncate">
                {enrichedPlace.phone ? (
                  <a
                    href={`tel:${enrichedPlace.phone}`}
                    className="text-blue-500 hover:underline"
                  >
                    {enrichedPlace.phone}
                  </a>
                ) : (
                  <span className="text-slate-400 italic">Not available</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2.5 py-1 border-b border-slate-100 dark:border-citynavy-border/50">
              <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="font-medium text-slate-500 dark:text-slate-400 w-24">Website:</span>
              <span className="text-slate-800 dark:text-citynavy-text font-medium truncate">
                {enrichedPlace.website ? (
                  <a
                    href={enrichedPlace.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <span>Visit Official Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-slate-400 italic">Not available</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2.5 py-1 border-b border-slate-100 dark:border-citynavy-border/50">
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="font-medium text-slate-500 dark:text-slate-400 w-24">Opening Hours:</span>
              <span className="text-slate-800 dark:text-citynavy-text font-medium truncate">
                {enrichedPlace.openingHours || <span className="text-slate-400 italic">Not available</span>}
              </span>
            </div>

            {enrichedPlace.wheelchair && (
              <div className="flex items-center gap-2.5 py-1 border-b border-slate-100 dark:border-citynavy-border/50">
                <span className="w-4 text-center text-slate-400 font-bold">♿</span>
                <span className="font-medium text-slate-500 dark:text-slate-400 w-24">Wheelchair:</span>
                <span className="text-slate-800 dark:text-citynavy-text font-medium capitalize">
                  {enrichedPlace.wheelchair}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            {onPlanRouteTo && (
              <button
                onClick={() =>
                  onPlanRouteTo(enrichedPlace.name, enrichedPlace.latitude, enrichedPlace.longitude)
                }
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                <span>Get Driving Directions</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-citynavy-text font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href={osmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-citynavy-text font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>OpenStreetMap</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {onFindNearby && (
              <button
                onClick={() => onFindNearby(enrichedPlace)}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-citynavy-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-citynavy-text font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5 text-blue-500" />
                <span>Explore Nearby Facilities Around Here</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Full Photograph Enlarge */}
      {lightboxOpen && currentPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            aria-label="Close photo preview"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-4xl max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center">
            <img
              src={currentPhoto.url}
              alt={currentPhoto.title}
              className="max-h-[70vh] object-contain rounded-xl"
            />
            {currentPhoto.attribution && (
              <p className="text-white/80 text-xs mt-3 text-center">
                {currentPhoto.attribution} &middot; {currentPhoto.license || 'Public Domain'}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
