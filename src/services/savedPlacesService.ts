import type { SavedPlace } from '@/types';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'citypulse_saved_places';
const memoryStore = new Map<string, string>();

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Ignore restricted access
  }
  return memoryStore.get(key) || null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch {
    // Ignore storage quota
  }
  memoryStore.set(key, value);
}

export function getSavedPlaces(): SavedPlace[] {
  try {
    const raw = safeGetItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function fetchSavedPlaces(userId?: string): Promise<SavedPlace[]> {
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('saved_places')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const cloudPlaces: SavedPlace[] = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          label: row.label,
          category: row.category,
          latitude: row.latitude,
          longitude: row.longitude,
          savedAt: row.created_at,
          notes: row.notes || undefined,
        }));

        // Cache locally for offline resilience
        safeSetItem(STORAGE_KEY, JSON.stringify(cloudPlaces));
        return cloudPlaces;
      }
    } catch {
      // Fallback to local
    }
  }

  return getSavedPlaces();
}

export function savePlace(
  place: Omit<SavedPlace, 'id' | 'savedAt'>,
  userId?: string
): SavedPlace {
  const existing = getSavedPlaces();
  const localId = `place_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newPlace: SavedPlace = {
    ...place,
    id: localId,
    savedAt: new Date().toISOString(),
  };

  const updated = [newPlace, ...existing.filter((p) => p.name !== place.name)];
  safeSetItem(STORAGE_KEY, JSON.stringify(updated));

  if (userId) {
    Promise.resolve(
      supabase.from('saved_places').insert({
        user_id: userId,
        name: place.name,
        label: place.label,
        category: place.category,
        latitude: place.latitude,
        longitude: place.longitude,
        notes: place.notes,
      })
    ).catch(() => {});
  }

  return newPlace;
}

export function removeSavedPlace(id: string, userId?: string): void {
  if (userId) {
    Promise.resolve(
      supabase.from('saved_places').delete().eq('id', id).eq('user_id', userId)
    ).catch(() => {});
  }

  const existing = getSavedPlaces();
  const filtered = existing.filter((p) => p.id !== id);
  safeSetItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function isPlaceSaved(name: string): boolean {
  const existing = getSavedPlaces();
  return existing.some((p) => p.name.toLowerCase() === name.toLowerCase());
}
