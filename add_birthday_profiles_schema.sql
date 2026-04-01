-- Run this in your Supabase SQL Editor to replace age with birthday!

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS age,
ADD COLUMN IF NOT EXISTS birthday date;
