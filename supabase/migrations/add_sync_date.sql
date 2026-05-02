-- Migration: Add sync_date to daily_picks for cron-based syncing
-- Run this in Supabase SQL Editor

ALTER TABLE daily_picks
  ADD COLUMN IF NOT EXISTS sync_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS bookmaker_count INTEGER DEFAULT 1;

-- Index for fast date+sport queries from the /picks endpoint
CREATE INDEX IF NOT EXISTS idx_daily_picks_sync_date ON daily_picks(sync_date);
CREATE INDEX IF NOT EXISTS idx_daily_picks_sport_date ON daily_picks(sport, sync_date);
CREATE INDEX IF NOT EXISTS idx_daily_picks_classification ON daily_picks(classification, sync_date);

-- Allow server-side deletes (cron uses service role key, bypasses RLS)
-- Make sure your service role key is used in the server env, NOT the anon key
