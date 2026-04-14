-- =============================================================================
-- Patch: fix handle_new_user search_path + robust account number generation
-- Run this in the Supabase SQL editor if sign-up returns
-- "Database error saving new user"
-- =============================================================================

-- Ensure extensions are present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Fix wallets default to use the built-in gen_random_uuid() (no extension needed)
ALTER TABLE public.wallets ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Replace trigger function with explicit search_path = public
-- Without this, the function can't find public.profiles / public.wallets
-- when fired from the auth schema context.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  account_num TEXT;
  attempts    INT := 0;
BEGIN
  -- Generate a unique 10-digit account number (loop with safety limit)
  LOOP
    account_num := lpad(
      ((floor(random() * 9000000000) + 1000000000)::BIGINT)::TEXT,
      10, '0'
    );
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE account_number = account_num
    );
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'handle_new_user: could not generate unique account number after 50 attempts';
    END IF;
  END LOOP;

  INSERT INTO public.profiles (id, full_name, email, account_number)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    account_num
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id, balance, currency)
  VALUES (NEW.id, 10000.00, 'USD')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;   -- ← this is the critical fix

-- Re-attach trigger (DROP IF EXISTS first to avoid duplicate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
