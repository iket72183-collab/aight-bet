-- Ensures daily_picks table matches the server's sync logic
CREATE TABLE IF NOT EXISTS public.daily_picks (
    id BIGSERIAL PRIMARY KEY,
    game_id TEXT NOT NULL,
    sport TEXT NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    commence_time TIMESTAMPTZ NOT NULL,
    pick_team TEXT NOT NULL,
    odds INTEGER NOT NULL,
    classification TEXT NOT NULL, -- 'safe' or 'risky'
    consensus BOOLEAN DEFAULT false,
    bookmaker_count INTEGER DEFAULT 0,
    sync_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Align existing daily_picks tables created before cron sync metadata existed
ALTER TABLE public.daily_picks
    ADD COLUMN IF NOT EXISTS sync_date DATE NOT NULL DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS bookmaker_count INTEGER DEFAULT 0;

-- Add unique constraint to prevent duplicate entries for the same game/team/class on a single day
-- This allows the server's sync logic to safely retry or upsert
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_daily_pick') THEN
        ALTER TABLE public.daily_picks
        ADD CONSTRAINT unique_daily_pick UNIQUE (game_id, pick_team, classification, sync_date);
    END IF;
END $$;

-- Optimize for the /api/picks endpoint
CREATE INDEX IF NOT EXISTS idx_picks_query_lookup ON public.daily_picks (sync_date, sport, classification);
