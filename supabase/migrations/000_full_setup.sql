-- =============================================================================
-- FlowPay — Complete Database Setup (idempotent, safe to run multiple times)
-- Run this entire script in the Supabase SQL Editor.
-- =============================================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums (skip if already exist) ────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('transfer', 'deposit', 'withdrawal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- notification_type: use TEXT column — no enum needed, avoids ALTER TYPE issues
-- (existing installs with the enum still work; new installs use TEXT)

-- =============================================================================
-- TABLES
-- =============================================================================

-- ── profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      TEXT        NOT NULL,
  email          TEXT        UNIQUE NOT NULL,
  phone          TEXT        UNIQUE,
  account_number TEXT        UNIQUE NOT NULL DEFAULT lpad(floor(random() * 9000000000 + 1000000000)::TEXT, 10, '0'),
  avatar_url     TEXT,
  pin_hash       TEXT        NOT NULL DEFAULT '',
  pin_attempts   INTEGER     NOT NULL DEFAULT 0,
  pin_locked_until TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add any missing columns to existing profiles table (safe for all installs)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name        TEXT        NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email            TEXT        UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone            TEXT        UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_number   TEXT        UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_hash         TEXT        NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_attempts     INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill email from auth.users for any existing rows missing it
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Fill in account_number for any existing rows that don't have one
DO $$
DECLARE r RECORD; acct TEXT;
BEGIN
  FOR r IN SELECT id FROM profiles WHERE account_number IS NULL LOOP
    LOOP
      acct := lpad(floor(random() * 9000000000 + 1000000000)::BIGINT::TEXT, 10, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE account_number = acct);
    END LOOP;
    UPDATE profiles SET account_number = acct WHERE id = r.id;
  END LOOP;
END;
$$;

-- Now make account_number NOT NULL (safe after backfill)
ALTER TABLE profiles ALTER COLUMN account_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_account_number_idx ON profiles(account_number);
CREATE INDEX        IF NOT EXISTS profiles_email_idx           ON profiles(email);

-- ── wallets ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id         UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID           UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance    NUMERIC(15,2)  NOT NULL DEFAULT 10000.00 CHECK (balance >= 0),
  currency   TEXT           NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallets_user_id_idx ON wallets(user_id);

-- ── transactions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id           UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference    TEXT              UNIQUE NOT NULL,
  sender_id    UUID              NOT NULL REFERENCES profiles(id),
  receiver_id  UUID              NOT NULL REFERENCES profiles(id),
  amount       NUMERIC(15,2)     NOT NULL CHECK (amount > 0),
  currency     TEXT              NOT NULL DEFAULT 'USD',
  status       transaction_status NOT NULL DEFAULT 'pending',
  narration    TEXT,
  type         transaction_type  NOT NULL DEFAULT 'transfer',
  metadata     JSONB,
  created_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS transactions_sender_id_idx   ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS transactions_receiver_id_idx ON transactions(receiver_id);
CREATE INDEX IF NOT EXISTS transactions_reference_idx   ON transactions(reference);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx  ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_status_idx      ON transactions(status);

-- ── notifications ─────────────────────────────────────────────────────────────
-- type is TEXT (not enum) so 'payment_request' and future values work without migrations
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'system',
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx    ON notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

-- ── contacts ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_user_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nickname        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, contact_user_id),
  CHECK (user_id != contact_user_id)
);

CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON contacts(user_id);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- ── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS wallets_updated_at ON wallets;
CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── TXN reference generator ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_txn_reference()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE ref TEXT;
BEGIN
  ref := 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(md5(random()::TEXT) FROM 1 FOR 8));
  RETURN ref;
END;
$$;

-- ── Auto-create profile + wallet on signup ────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE account_num TEXT;
BEGIN
  LOOP
    account_num := lpad(floor(random() * 9000000000 + 1000000000)::BIGINT::TEXT, 10, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE account_number = account_num);
  END LOOP;

  INSERT INTO profiles (id, full_name, email, account_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'FlowPay User'),
    NEW.email,
    account_num
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── execute_transfer (ACID) ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION execute_transfer(
  p_sender_id   UUID,
  p_receiver_id UUID,
  p_amount      NUMERIC(15,2),
  p_pin         TEXT,
  p_narration   TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sender   profiles%ROWTYPE;
  v_receiver profiles%ROWTYPE;
  v_sw       wallets%ROWTYPE;
  v_rw       wallets%ROWTYPE;
  v_ref      TEXT;
  v_txn      transactions%ROWTYPE;
BEGIN
  IF p_amount <= 0       THEN RAISE EXCEPTION 'INVALID_AMOUNT: Amount must be > 0'; END IF;
  IF p_amount > 1000000  THEN RAISE EXCEPTION 'LIMIT_EXCEEDED: Exceeds $1,000,000 limit'; END IF;
  IF p_sender_id = p_receiver_id THEN RAISE EXCEPTION 'SELF_TRANSFER: Cannot send to yourself'; END IF;

  SELECT * INTO v_sender FROM profiles WHERE id = p_sender_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SENDER_NOT_FOUND: Sender not found'; END IF;
  IF v_sender.pin_hash = '' OR v_sender.pin_hash IS NULL THEN
    RAISE EXCEPTION 'PIN_NOT_SET: Set up your PIN first';
  END IF;
  IF v_sender.pin_hash != crypt(p_pin, v_sender.pin_hash) THEN
    RAISE EXCEPTION 'INVALID_PIN: Incorrect PIN';
  END IF;

  SELECT * INTO v_receiver FROM profiles WHERE id = p_receiver_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'RECEIVER_NOT_FOUND: Recipient not found'; END IF;

  -- Lock wallets in consistent order to prevent deadlocks
  IF p_sender_id < p_receiver_id THEN
    SELECT * INTO v_sw FROM wallets WHERE user_id = p_sender_id   FOR UPDATE;
    SELECT * INTO v_rw FROM wallets WHERE user_id = p_receiver_id FOR UPDATE;
  ELSE
    SELECT * INTO v_rw FROM wallets WHERE user_id = p_receiver_id FOR UPDATE;
    SELECT * INTO v_sw FROM wallets WHERE user_id = p_sender_id   FOR UPDATE;
  END IF;

  IF v_sw.id IS NULL THEN RAISE EXCEPTION 'WALLET_NOT_FOUND: Sender wallet missing'; END IF;
  IF v_rw.id IS NULL THEN RAISE EXCEPTION 'WALLET_NOT_FOUND: Receiver wallet missing'; END IF;
  IF v_sw.balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: Balance $% < requested $%', v_sw.balance, p_amount;
  END IF;

  v_ref := generate_txn_reference();

  UPDATE wallets SET balance = balance - p_amount, updated_at = NOW() WHERE user_id = p_sender_id;
  UPDATE wallets SET balance = balance + p_amount, updated_at = NOW() WHERE user_id = p_receiver_id;

  INSERT INTO transactions (reference, sender_id, receiver_id, amount, currency, status, narration, type, completed_at)
  VALUES (v_ref, p_sender_id, p_receiver_id, p_amount, COALESCE(v_sw.currency,'USD'), 'completed', p_narration, 'transfer', NOW())
  RETURNING * INTO v_txn;

  INSERT INTO notifications (user_id, title, body, type, metadata) VALUES (
    p_sender_id, 'Transfer Successful',
    'You sent $' || TO_CHAR(p_amount,'FM999,999,999.00') || ' to ' || v_receiver.full_name ||
      CASE WHEN p_narration IS NOT NULL AND p_narration != '' THEN ' · "' || p_narration || '"' ELSE '' END,
    'debit',
    jsonb_build_object('transaction_id',v_txn.id,'reference',v_ref,'amount',p_amount,
      'counterpart_id',p_receiver_id,'counterpart_name',v_receiver.full_name)
  );

  INSERT INTO notifications (user_id, title, body, type, metadata) VALUES (
    p_receiver_id, 'Money Received',
    'You received $' || TO_CHAR(p_amount,'FM999,999,999.00') || ' from ' || v_sender.full_name ||
      CASE WHEN p_narration IS NOT NULL AND p_narration != '' THEN ' · "' || p_narration || '"' ELSE '' END,
    'credit',
    jsonb_build_object('transaction_id',v_txn.id,'reference',v_ref,'amount',p_amount,
      'counterpart_id',p_sender_id,'counterpart_name',v_sender.full_name)
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction', jsonb_build_object(
      'id', v_txn.id, 'reference', v_ref, 'amount', p_amount,
      'currency', v_txn.currency, 'status', 'completed', 'narration', p_narration,
      'sender',   jsonb_build_object('id',p_sender_id,  'full_name',v_sender.full_name,  'account_number',v_sender.account_number),
      'receiver', jsonb_build_object('id',p_receiver_id,'full_name',v_receiver.full_name,'account_number',v_receiver.account_number),
      'created_at', v_txn.created_at, 'completed_at', v_txn.completed_at
    ),
    'sender_balance', (SELECT balance FROM wallets WHERE user_id = p_sender_id)
  );
END;
$$;

-- ── search_users ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_users(p_query TEXT)
RETURNS TABLE (id UUID, full_name TEXT, email TEXT, account_number TEXT, avatar_url TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.account_number, p.avatar_url
  FROM profiles p
  WHERE p.id != auth.uid()
    AND (
      p.full_name      ILIKE '%' || p_query || '%'
      OR p.email       ILIKE '%' || p_query || '%'
      OR p.account_number ILIKE '%' || p_query || '%'
      OR p.phone       ILIKE '%' || p_query || '%'
    )
  LIMIT 10;
END;
$$;

-- ── set_transaction_pin ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_transaction_pin(p_user_id UUID, p_pin TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF length(p_pin) != 4 OR p_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'INVALID_PIN_FORMAT: PIN must be exactly 4 digits';
  END IF;
  UPDATE profiles SET pin_hash = crypt(p_pin, gen_salt('bf', 10)), updated_at = NOW()
  WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;

-- ── mark_notifications_read ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_notifications_read(p_user_id UUID, p_notification_ids UUID[] DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    UPDATE notifications SET is_read = TRUE WHERE user_id = p_user_id AND is_read = FALSE;
  ELSE
    UPDATE notifications SET is_read = TRUE WHERE user_id = p_user_id AND id = ANY(p_notification_ids);
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ── PIN rate-limiting functions ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_pin_lockout(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT pin_locked_until INTO v_locked_until FROM profiles WHERE id = p_user_id;
  IF v_locked_until IS NOT NULL AND v_locked_until <= NOW() THEN
    UPDATE profiles SET pin_attempts = 0, pin_locked_until = NULL WHERE id = p_user_id;
    RETURN 0;
  END IF;
  IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    RETURN GREATEST(0, EXTRACT(EPOCH FROM (v_locked_until - NOW()))::INTEGER);
  END IF;
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION record_failed_pin(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_attempts INTEGER;
  v_max CONSTANT INTEGER := 5;
BEGIN
  UPDATE profiles SET pin_attempts = pin_attempts + 1
  WHERE id = p_user_id RETURNING pin_attempts INTO v_new_attempts;
  IF v_new_attempts IS NULL THEN RETURN v_max; END IF;
  IF v_new_attempts >= v_max THEN
    UPDATE profiles SET pin_locked_until = NOW() + INTERVAL '15 minutes' WHERE id = p_user_id;
    RETURN 0;
  END IF;
  RETURN v_max - v_new_attempts;
END;
$$;

CREATE OR REPLACE FUNCTION reset_pin_attempts(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE profiles SET pin_attempts = 0, pin_locked_until = NULL WHERE id = p_user_id;
END;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts     ENABLE ROW LEVEL SECURITY;

-- Drop and recreate all policies cleanly
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
           WHERE tablename IN ('profiles','wallets','transactions','notifications','contacts')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- profiles
CREATE POLICY "profiles_select"  ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update"  ON profiles FOR UPDATE USING (auth.uid() = id);

-- wallets
CREATE POLICY "wallets_select"   ON wallets  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallets_update"   ON wallets  FOR UPDATE USING (auth.uid() = user_id);

-- transactions
CREATE POLICY "transactions_select" ON transactions FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);

-- contacts
CREATE POLICY "contacts_select" ON contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "contacts_insert" ON contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "contacts_delete" ON contacts FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- BACKFILL: create profile + wallet rows for any existing auth users
-- =============================================================================

-- Insert missing profiles (uses a loop to guarantee unique account numbers)
-- Handles both schema variants: tables where auth UID is stored in `id` only,
-- and tables that also have a separate `user_id NOT NULL` column.
DO $$
DECLARE
  u           RECORD;
  acct        TEXT;
  has_user_id BOOLEAN;
BEGIN
  -- Detect whether the profiles table has a separate user_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'user_id'
  ) INTO has_user_id;

  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    WHERE (
      -- Skip if a row already references this auth user, in either schema variant
      CASE WHEN has_user_id
        THEN NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = au.id)
        ELSE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id      = au.id)
      END
    )
  LOOP
    LOOP
      acct := lpad(floor(random() * 9000000000 + 1000000000)::BIGINT::TEXT, 10, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE account_number = acct);
    END LOOP;

    IF has_user_id THEN
      -- Table has a separate user_id column: conflict guard on user_id, not id
      EXECUTE $dyn$
        INSERT INTO profiles (user_id, full_name, email, account_number)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO NOTHING
      $dyn$ USING
        u.id,
        COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'FlowPay User'),
        u.email,
        acct;
    ELSE
      INSERT INTO profiles (id, full_name, email, account_number)
      VALUES (
        u.id,
        COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'FlowPay User'),
        u.email,
        acct
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- =============================================================================
-- FIX: ensure profiles.id = auth user UUID
-- When the table has a separate `user_id` column, the backfill may have
-- inserted rows with auto-generated `id` values. The app code always queries
-- `profiles WHERE id = auth.uid()`, so we must align id = user_id.
-- =============================================================================
DO $$
DECLARE
  r               RECORD;
  has_user_id_col BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) INTO has_user_id_col;

  IF NOT has_user_id_col THEN
    -- Standard schema: id IS the auth UUID. Nothing to fix.
    RETURN;
  END IF;

  -- Find profiles where user_id (auth UUID) != id (auto-generated UUID)
  FOR r IN
    SELECT * FROM profiles WHERE user_id IS NOT NULL AND id != user_id
  LOOP
    -- Delete old profile (wallet cascades via ON DELETE CASCADE)
    DELETE FROM profiles WHERE id = r.id;

    -- Re-insert with id = auth UUID
    INSERT INTO profiles (id, user_id, full_name, email, account_number,
                          avatar_url, pin_hash, pin_attempts, pin_locked_until,
                          created_at, updated_at)
    VALUES (
      r.user_id, r.user_id,
      COALESCE(r.full_name, 'FlowPay User'),
      r.email, r.account_number, r.avatar_url,
      COALESCE(r.pin_hash, ''), COALESCE(r.pin_attempts, 0),
      r.pin_locked_until,
      COALESCE(r.created_at, NOW()), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name      = EXCLUDED.full_name,
      email          = EXCLUDED.email,
      account_number = COALESCE(profiles.account_number, EXCLUDED.account_number),
      updated_at     = NOW();
  END LOOP;
END;
$$;

-- Insert missing wallets for any profiles that don't have one
INSERT INTO wallets (user_id)
SELECT p.id FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM wallets w WHERE w.user_id = p.id);

-- =============================================================================
-- REALTIME
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'wallets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wallets;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
  END IF;
END;
$$;
