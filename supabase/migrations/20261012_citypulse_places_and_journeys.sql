/*
# CityPulse — Saved Places, Multi-Route Journeys & User Preferences

## Purpose
Extends user account persistence with:
1. saved_places: Cloud-synced user bookmarks for hospitals, schools, stations, civic points
2. saved_journeys: User-saved multi-route travel itineraries and preferences
3. user_profiles: Extended preferences for temperature, distance unit, and cartography style

## Security
- Row Level Security (RLS) enabled on all user tables.
- All CRUD policies strictly scoped to authenticated user owner: auth.uid() = user_id.
- Service role keys never required on client.
*/

-- 1. Extend user_profiles with user preference units
ALTER TABLE IF EXISTS user_profiles
  ADD COLUMN IF NOT EXISTS temp_unit text DEFAULT 'C',
  ADD COLUMN IF NOT EXISTS distance_unit text DEFAULT 'km',
  ADD COLUMN IF NOT EXISTS map_style text DEFAULT 'dark';

-- 2. Create saved_places table
CREATE TABLE IF NOT EXISTS saved_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  label text,
  category text NOT NULL DEFAULT 'other',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_places" ON saved_places;
CREATE POLICY "select_own_places" ON saved_places FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_places" ON saved_places;
CREATE POLICY "insert_own_places" ON saved_places FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_places" ON saved_places;
CREATE POLICY "update_own_places" ON saved_places FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_places" ON saved_places;
CREATE POLICY "delete_own_places" ON saved_places FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_places_user_id ON saved_places(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_places_created_at ON saved_places(created_at DESC);

-- 3. Create saved_journeys table
CREATE TABLE IF NOT EXISTS saved_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_name text NOT NULL,
  origin_lat double precision NOT NULL,
  origin_lng double precision NOT NULL,
  dest_name text NOT NULL,
  dest_lat double precision NOT NULL,
  dest_lng double precision NOT NULL,
  travel_mode text NOT NULL DEFAULT 'driving',
  route_preference text NOT NULL DEFAULT 'fastest',
  distance_km double precision NOT NULL DEFAULT 0,
  duration_mins integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE saved_journeys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_journeys" ON saved_journeys;
CREATE POLICY "select_own_journeys" ON saved_journeys FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_journeys" ON saved_journeys;
CREATE POLICY "insert_own_journeys" ON saved_journeys FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_journeys" ON saved_journeys;
CREATE POLICY "update_own_journeys" ON saved_journeys FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_journeys" ON saved_journeys;
CREATE POLICY "delete_own_journeys" ON saved_journeys FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_journeys_user_id ON saved_journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_journeys_created_at ON saved_journeys(created_at DESC);
