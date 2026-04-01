-- Run this in your Supabase SQL Editor to add the missing body stats columns!
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birthday date,
ADD COLUMN IF NOT EXISTS sex text,
ADD COLUMN IF NOT EXISTS height_cm numeric,
ADD COLUMN IF NOT EXISTS weight_kg numeric;
