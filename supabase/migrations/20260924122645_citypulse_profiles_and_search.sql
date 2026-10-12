/*
# CityPulse — User Profiles and Search History

## Purpose
Creates a user_profiles table to store theme preference and full name per user,
and a search_history table to persist city/zone searches for the history page.

## New Tables

### user_profiles
- id (uuid, PK, FK to auth.users, ON DELETE CASCADE)
- full_name (text, nullable) — display name shown in the account page
- theme_preference (text, NOT NULL, DEFAULT 'light') — 'light' or 'dark'
- favorite_city (text, nullable) — user's preferred city for quick lookup
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())

### search_history
- id (uuid, PK, default gen_random_uuid())
- user_id (uuid, NOT NULL, FK to auth.users, default auth.uid(), ON DELETE CASCADE)
- query (text, NOT NULL) — the city or zone the user searched
- results_count (int, NOT NULL, default 0) — number of matching zones/alerts found
- created_at (timestamptz, default now())

## Security
- RLS enabled on both tables.
- user_profiles: owner-scoped CRUD (auth.uid() = id).
- search_history: owner-scoped CRUD (auth.uid() = user_id).
- user_id has DEFAULT auth.uid() so inserts omitting it succeed.
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  theme_preference text NOT NULL DEFAULT 'light',
  favorite_city text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON user_profiles;
CREATE POLICY "select_own_profile" ON user_profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON user_profiles;
CREATE POLICY "insert_own_profile" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON user_profiles;
CREATE POLICY "delete_own_profile" ON user_profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  results_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_searches" ON search_history;
CREATE POLICY "select_own_searches" ON search_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_searches" ON search_history;
CREATE POLICY "insert_own_searches" ON search_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_searches" ON search_history;
CREATE POLICY "delete_own_searches" ON search_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);