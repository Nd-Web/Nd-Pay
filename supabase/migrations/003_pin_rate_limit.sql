-- =============================================================================
-- Migration 003: PIN rate-limiting
-- Adds attempt tracking + 15-minute lockout to profiles.
-- Uses SECURITY DEFINER functions so the logic runs as the DB owner
-- regardless of which auth role calls it.
-- =============================================================================

-- ── 1. Add columns to profiles ───────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_attempts     INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;

-- ── 2. check_pin_lockout(p_user_id) ─────────────────────────────────────────
-- Returns the number of seconds remaining in the lockout (0 = not locked).
-- If an expired lockout is found, it auto-resets the counter.
CREATE OR REPLACE FUNCTION public.check_pin_lockout(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT pin_locked_until
    INTO v_locked_until
    FROM public.profiles
   WHERE id = p_user_id;

  -- Lockout has expired → reset and allow
  IF v_locked_until IS NOT NULL AND v_locked_until <= NOW() THEN
    UPDATE public.profiles
       SET pin_attempts = 0, pin_locked_until = NULL
     WHERE id = p_user_id;
    RETURN 0;
  END IF;

  -- Still within lockout window
  IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    RETURN GREATEST(0, EXTRACT(EPOCH FROM (v_locked_until - NOW()))::INTEGER);
  END IF;

  -- Not locked
  RETURN 0;
END;
$$;

-- ── 3. record_failed_pin(p_user_id) ─────────────────────────────────────────
-- Increments the attempt counter. If it reaches 5, locks for 15 minutes.
-- Returns the number of attempts remaining (0 = just locked out).
CREATE OR REPLACE FUNCTION public.record_failed_pin(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_attempts INTEGER;
  v_max          CONSTANT INTEGER := 5;
  v_lockout_mins CONSTANT INTEGER := 15;
BEGIN
  UPDATE public.profiles
     SET pin_attempts = pin_attempts + 1
   WHERE id = p_user_id
   RETURNING pin_attempts INTO v_new_attempts;

  IF v_new_attempts IS NULL THEN
    RETURN v_max; -- user not found, don't lock
  END IF;

  IF v_new_attempts >= v_max THEN
    UPDATE public.profiles
       SET pin_locked_until = NOW() + (v_lockout_mins || ' minutes')::INTERVAL
     WHERE id = p_user_id;
    RETURN 0;
  END IF;

  RETURN v_max - v_new_attempts;
END;
$$;

-- ── 4. reset_pin_attempts(p_user_id) ────────────────────────────────────────
-- Call on successful PIN verification to clear the counter and lockout.
CREATE OR REPLACE FUNCTION public.reset_pin_attempts(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET pin_attempts = 0, pin_locked_until = NULL
   WHERE id = p_user_id;
END;
$$;
