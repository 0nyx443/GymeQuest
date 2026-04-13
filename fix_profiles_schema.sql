ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS coins integer default 0,
ADD COLUMN IF NOT EXISTS current_streak integer default 0,
ADD COLUMN IF NOT EXISTS last_active_date text,
ADD COLUMN IF NOT EXISTS last_daily_bounty_date text,
ADD COLUMN IF NOT EXISTS total_reps integer default 0;
