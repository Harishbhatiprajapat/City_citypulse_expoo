import type { SavedJourney } from '@/types';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'citypulse_saved_journeys';
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

export async function getSavedJourneys(userId?: string): Promise<SavedJourney[]> {
  // If user is authenticated, query Supabase database
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('saved_journeys')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          originName: row.origin_name,
          originLat: row.origin_lat,
          originLng: row.origin_lng,
          destName: row.dest_name,
          destLat: row.dest_lat,
          destLng: row.dest_lng,
          travelMode: row.travel_mode,
          routePreference: row.route_preference,
          distanceKm: row.distance_km,
          durationMins: row.duration_mins,
          savedAt: row.created_at,
        }));
      }
    } catch {
      // Fallback to local storage
    }
  }

  // Fallback to safe storage
  try {
    const raw = safeGetItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveJourney(
  journey: Omit<SavedJourney, 'id' | 'savedAt'>,
  userId?: string
): Promise<SavedJourney> {
  const localId = `journey_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newJourney: SavedJourney = {
    ...journey,
    id: localId,
    userId,
    savedAt: new Date().toISOString(),
  };

  if (userId) {
    try {
      const { data, error } = await supabase
        .from('saved_journeys')
        .insert({
          user_id: userId,
          origin_name: journey.originName,
          origin_lat: journey.originLat,
          origin_lng: journey.originLng,
          dest_name: journey.destName,
          dest_lat: journey.destLat,
          dest_lng: journey.destLng,
          travel_mode: journey.travelMode,
          route_preference: journey.routePreference,
          distance_km: journey.distanceKm,
          duration_mins: journey.durationMins,
        })
        .select()
        .single();

      if (!error && data) {
        newJourney.id = data.id;
        newJourney.savedAt = data.created_at;
      }
    } catch {
      // Saved locally if database table pending
    }
  }

  // Also sync to local storage for offline resilience
  try {
    const existing = await getSavedJourneys();
    const updated = [newJourney, ...existing.filter((j) => j.id !== newJourney.id)];
    safeSetItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }

  return newJourney;
}

export async function removeSavedJourney(id: string, userId?: string): Promise<void> {
  if (userId) {
    try {
      await supabase.from('saved_journeys').delete().eq('id', id).eq('user_id', userId);
    } catch {
      // Ignore
    }
  }

  try {
    const raw = safeGetItem(STORAGE_KEY);
    if (raw) {
      const list: SavedJourney[] = JSON.parse(raw);
      const filtered = list.filter((j) => j.id !== id);
      safeSetItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch {
    // Ignore
  }
}
