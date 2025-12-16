-- Migration: Add userCode column to profiles table
-- Run this in your Supabase SQL Editor

-- Add the userCode column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS "userCode" TEXT;

-- Backfill userCode for existing profiles (generate codes based on name)
-- This will create codes like "John@1234" for existing users
UPDATE profiles 
SET "userCode" = REPLACE(name, ' ', '') || '@' || LPAD((FLOOR(RANDOM() * 9999))::text, 4, '0')
WHERE "userCode" IS NULL OR "userCode" = '';

-- Create an index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_userCode ON profiles("userCode");

-- Add a comment to document the column
COMMENT ON COLUMN profiles."userCode" IS 'Unique user code in format: Name@1234';

-- Note: If you have a database trigger that creates profiles automatically,
-- you may need to update it to also generate a userCode.
-- Example trigger update:
-- CREATE OR REPLACE FUNCTION handle_new_user()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO public.profiles (uid, email, name, "userCode")
--   VALUES (
--     NEW.id,
--     NEW.email,
--     COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
--     REPLACE(COALESCE(NEW.raw_user_meta_data->>'name', 'User'), ' ', '') || '@' || LPAD((FLOOR(RANDOM() * 9999))::text, 4, '0')
--   );
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
