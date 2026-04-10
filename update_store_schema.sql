-- Store & Streaks Schema Update
-- Assuming 'profiles' table exists for user data

-- 1. Add Streak & Currency Columns to User Profile
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS coins INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- 2. Create Items / Store Catalog Table
CREATE TABLE IF NOT EXISTS public.store_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price INT NOT NULL DEFAULT 0,
    item_type TEXT NOT NULL, -- 'potion', 'streak_restore', 'exp_boost'
    effect_value INT DEFAULT 0, -- e.g. amount of damage or reps to reduce, or multiplier for exp
    icon_name TEXT, -- Ionicons name for simplicity
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create User Inventory Table
CREATE TABLE IF NOT EXISTS public.user_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.store_items(id) ON DELETE CASCADE,
    quantity INT DEFAULT 1,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, item_id)
);

-- 4. Insert Specific Requested Items
INSERT INTO public.store_items (name, description, price, item_type, effect_value, icon_name)
VALUES 
    ('Streak Saver', 'Restore a broken streak if you miss a day!', 500, 'streak_restore', 1, 'shield-checkmark'),
    ('Small Potion of Weakness', 'Damage the enemy and reduce required reps by 5.', 150, 'potion', 5, 'flask'),
    ('Large Potion of Weakness', 'Massively damage the enemy and reduce required reps by 15.', 400, 'potion', 15, 'flask-sharp'),
    ('Double EXP Scroll', 'Grants a 2x boost to experience points for completing your next daily workout.', 300, 'exp_boost', 2, 'document-text')
ON CONFLICT DO NOTHING;
