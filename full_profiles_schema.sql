-- Create or replace the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    str INTEGER DEFAULT 10,
    agi INTEGER DEFAULT 10,
    sta INTEGER DEFAULT 10,
    battles INTEGER DEFAULT 0,
    victories INTEGER DEFAULT 0,
    total_reps INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_active_date TEXT,
    last_daily_bounty_date TEXT,
    claimed_level_rewards INTEGER[] DEFAULT '{}',
    birthday TEXT,
    sex TEXT,
    height_cm INTEGER,
    weight_kg INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- In case the table already exists but is missing the new columns, run this:
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS total_reps INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_active_date TEXT,
    ADD COLUMN IF NOT EXISTS last_daily_bounty_date TEXT,
    ADD COLUMN IF NOT EXISTS claimed_level_rewards INTEGER[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS birthday TEXT,
    ADD COLUMN IF NOT EXISTS sex TEXT,
    ADD COLUMN IF NOT EXISTS height_cm INTEGER,
    ADD COLUMN IF NOT EXISTS weight_kg INTEGER;
