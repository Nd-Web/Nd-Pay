-- =============================================================================
-- NdPay - Real-Time Fintech App: Initial Schema
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'reversed');
CREATE TYPE transaction_type AS ENUM ('transfer', 'deposit', 'withdrawal');
CREATE TYPE notification_type AS ENUM ('credit', 'debit', 'system', 'security');

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT UNIQUE,
  account_number TEXT UNIQUE NOT NULL DEFAULT lpad(floor(random() * 9000000000 + 1000000000)::TEXT, 10, '0'),
  avatar_url  TEXT,
  pin_hash    TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure account_number is always exactly 10 digits and unique
CREATE UNIQUE INDEX profiles_account_number_idx ON profiles(account_number);
CREATE INDEX profiles_email_idx ON profiles(email);
CREATE INDEX profiles_phone_idx ON profiles(phone);

-- =============================================================================
-- WALLETS TABLE
-- =============================================================================

CREATE TABLE wallets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance     NUMERIC(15,2) NOT NULL DEFAULT 10000.00 CHECK (balance >= 0),
  currency    TEXT NOT NULL DEFAULT 'USD',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX wallets_user_id_idx ON wallets(user_id);

-- =============================================================================
-- TRANSACTIONS TABLE
-- =============================================================================

CREATE TABLE transactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference    TEXT UNIQUE NOT NULL,
  sender_id    UUID NOT NULL REFERENCES profiles(id),
  receiver_id  UUID NOT NULL REFERENCES profiles(id),
  amount       NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency     TEXT NOT NULL DEFAULT 'USD',
  status       transaction_status NOT NULL DEFAULT 'pending',
  narration    TEXT,
  type         transaction_type NOT NULL DEFAULT 'transfer',
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX transactions_sender_id_idx ON transactions(sender_id);
CREATE INDEX transactions_receiver_id_idx ON transactions(receiver_id);
CREATE INDEX transactions_reference_idx ON transactions(reference);
CREATE INDEX transactions_created_at_idx ON transactions(created_at DESC);
CREATE INDEX transactions_status_idx ON transactions(status);

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       notification_type NOT NULL DEFAULT 'system',
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_is_read_idx ON notifications(is_read);
CREATE INDEX notifications_created_at_idx ON notifications(created_at DESC);

-- =============================================================================
-- CONTACTS TABLE
-- =============================================================================

CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nickname        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, contact_user_id),
  CHECK (user_id != contact_user_id)
);

CREATE INDEX contacts_user_id_idx ON contacts(user_id);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate a unique TXN reference
CREATE OR REPLACE FUNCTION generate_txn_reference()
RETURNS TEXT AS $$
DECLARE
  ref TEXT;
  date_part TEXT;
  rand_part TEXT;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  rand_part := UPPER(SUBSTRING(md5(random()::TEXT) FROM 1 FOR 8));
  ref := 'TXN-' || date_part || '-' || rand_part;
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Auto-create wallet and profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  account_num TEXT;
BEGIN
  -- Generate unique 10-digit account number
  LOOP
    account_num := lpad(floor(random() * 9000000000 + 1000000000)::BIGINT::TEXT, 10, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE account_number = account_num);
  END LOOP;

  INSERT INTO profiles (id, full_name, email, account_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'NdPay User'),
    NEW.email,
    account_num
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- CORE: execute_transfer() — ACID Transfer Function
-- =============================================================================

CREATE OR REPLACE FUNCTION execute_transfer(
  p_sender_id    UUID,
  p_receiver_id  UUID,
  p_amount       NUMERIC(15,2),
  p_pin          TEXT,
  p_narration    TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_sender_profile   profiles%ROWTYPE;
  v_receiver_profile profiles%ROWTYPE;
  v_sender_wallet    wallets%ROWTYPE;
  v_receiver_wallet  wallets%ROWTYPE;
  v_txn_reference    TEXT;
  v_transaction      transactions%ROWTYPE;
  v_sender_notif_id  UUID;
  v_receiver_notif_id UUID;
BEGIN
  -- ── 1. Validate amount ──────────────────────────────────────────────────────
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Transfer amount must be greater than zero';
  END IF;

  IF p_amount > 1000000 THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED: Transfer amount exceeds maximum limit of $1,000,000';
  END IF;

  -- ── 2. Validate sender != receiver ─────────────────────────────────────────
  IF p_sender_id = p_receiver_id THEN
    RAISE EXCEPTION 'SELF_TRANSFER: Cannot transfer money to yourself';
  END IF;

  -- ── 3. Load sender profile & verify PIN ─────────────────────────────────────
  SELECT * INTO v_sender_profile FROM profiles WHERE id = p_sender_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SENDER_NOT_FOUND: Sender account not found';
  END IF;

  IF v_sender_profile.pin_hash = '' OR v_sender_profile.pin_hash IS NULL THEN
    RAISE EXCEPTION 'PIN_NOT_SET: Please set up your transaction PIN first';
  END IF;

  IF v_sender_profile.pin_hash != crypt(p_pin, v_sender_profile.pin_hash) THEN
    RAISE EXCEPTION 'INVALID_PIN: Incorrect transaction PIN';
  END IF;

  -- ── 4. Load receiver profile ─────────────────────────────────────────────────
  SELECT * INTO v_receiver_profile FROM profiles WHERE id = p_receiver_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RECEIVER_NOT_FOUND: Recipient account not found';
  END IF;

  -- ── 5. Lock both wallets (ordered by id to prevent deadlocks) ───────────────
  IF p_sender_id < p_receiver_id THEN
    SELECT * INTO v_sender_wallet FROM wallets WHERE user_id = p_sender_id FOR UPDATE;
    SELECT * INTO v_receiver_wallet FROM wallets WHERE user_id = p_receiver_id FOR UPDATE;
  ELSE
    SELECT * INTO v_receiver_wallet FROM wallets WHERE user_id = p_receiver_id FOR UPDATE;
    SELECT * INTO v_sender_wallet FROM wallets WHERE user_id = p_sender_id FOR UPDATE;
  END IF;

  IF v_sender_wallet.id IS NULL THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND: Sender wallet not found';
  END IF;

  IF v_receiver_wallet.id IS NULL THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND: Receiver wallet not found';
  END IF;

  -- ── 6. Check sufficient balance ──────────────────────────────────────────────
  IF v_sender_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: Insufficient balance. Available: $%, Requested: $%',
      v_sender_wallet.balance, p_amount;
  END IF;

  -- ── 7. Generate transaction reference ────────────────────────────────────────
  v_txn_reference := generate_txn_reference();

  -- ── 8. Debit sender ──────────────────────────────────────────────────────────
  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_sender_id;

  -- ── 9. Credit receiver ───────────────────────────────────────────────────────
  UPDATE wallets
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE user_id = p_receiver_id;

  -- ── 10. Create transaction record ────────────────────────────────────────────
  INSERT INTO transactions (
    reference, sender_id, receiver_id, amount, currency,
    status, narration, type, completed_at
  ) VALUES (
    v_txn_reference,
    p_sender_id,
    p_receiver_id,
    p_amount,
    COALESCE(v_sender_wallet.currency, 'USD'),
    'completed',
    p_narration,
    'transfer',
    NOW()
  ) RETURNING * INTO v_transaction;

  -- ── 11. Create SENDER notification ───────────────────────────────────────────
  INSERT INTO notifications (user_id, title, body, type, metadata)
  VALUES (
    p_sender_id,
    'Transfer Successful',
    'You sent $' || TO_CHAR(p_amount, 'FM999,999,999.00') ||
      ' to ' || v_receiver_profile.full_name ||
      CASE WHEN p_narration IS NOT NULL AND p_narration != ''
        THEN ' · "' || p_narration || '"'
        ELSE ''
      END,
    'debit',
    jsonb_build_object(
      'transaction_id', v_transaction.id,
      'reference', v_txn_reference,
      'amount', p_amount,
      'counterpart_id', p_receiver_id,
      'counterpart_name', v_receiver_profile.full_name
    )
  ) RETURNING id INTO v_sender_notif_id;

  -- ── 12. Create RECEIVER notification ─────────────────────────────────────────
  INSERT INTO notifications (user_id, title, body, type, metadata)
  VALUES (
    p_receiver_id,
    'Money Received',
    'You received $' || TO_CHAR(p_amount, 'FM999,999,999.00') ||
      ' from ' || v_sender_profile.full_name ||
      CASE WHEN p_narration IS NOT NULL AND p_narration != ''
        THEN ' · "' || p_narration || '"'
        ELSE ''
      END,
    'credit',
    jsonb_build_object(
      'transaction_id', v_transaction.id,
      'reference', v_txn_reference,
      'amount', p_amount,
      'counterpart_id', p_sender_id,
      'counterpart_name', v_sender_profile.full_name
    )
  ) RETURNING id INTO v_receiver_notif_id;

  -- ── 13. Return result ─────────────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'success', true,
    'transaction', jsonb_build_object(
      'id', v_transaction.id,
      'reference', v_txn_reference,
      'amount', p_amount,
      'currency', v_transaction.currency,
      'status', 'completed',
      'narration', p_narration,
      'sender', jsonb_build_object(
        'id', p_sender_id,
        'full_name', v_sender_profile.full_name,
        'account_number', v_sender_profile.account_number
      ),
      'receiver', jsonb_build_object(
        'id', p_receiver_id,
        'full_name', v_receiver_profile.full_name,
        'account_number', v_receiver_profile.account_number
      ),
      'created_at', v_transaction.created_at,
      'completed_at', v_transaction.completed_at
    ),
    'sender_balance', (SELECT balance FROM wallets WHERE user_id = p_sender_id)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- ── PROFILES policies ─────────────────────────────────────────────────────────
-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can read other profiles (for user search / transfers) — limited fields
-- handled via a separate view/function
CREATE POLICY "profiles_select_search" ON profiles
  FOR SELECT USING (true); -- We restrict fields in the API layer

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ── WALLETS policies ──────────────────────────────────────────────────────────
CREATE POLICY "wallets_select_own" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wallets_update_own" ON wallets
  FOR UPDATE USING (auth.uid() = user_id);

-- ── TRANSACTIONS policies ─────────────────────────────────────────────────────
CREATE POLICY "transactions_select_participant" ON transactions
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ── NOTIFICATIONS policies ────────────────────────────────────────────────────
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ── CONTACTS policies ─────────────────────────────────────────────────────────
CREATE POLICY "contacts_select_own" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "contacts_insert_own" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contacts_delete_own" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- REALTIME PUBLICATIONS
-- =============================================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- =============================================================================
-- SEED: Add a system user for demo purposes (optional)
-- =============================================================================

-- Create a public search function (avoids exposing pin_hash)
CREATE OR REPLACE FUNCTION search_users(p_query TEXT)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  account_number TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.account_number,
    p.avatar_url
  FROM profiles p
  WHERE
    p.id != auth.uid()
    AND (
      p.full_name ILIKE '%' || p_query || '%'
      OR p.email ILIKE '%' || p_query || '%'
      OR p.account_number ILIKE '%' || p_query || '%'
      OR p.phone ILIKE '%' || p_query || '%'
    )
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set / update transaction PIN
CREATE OR REPLACE FUNCTION set_transaction_pin(p_user_id UUID, p_pin TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF length(p_pin) != 4 OR p_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'INVALID_PIN_FORMAT: PIN must be exactly 4 digits';
  END IF;

  UPDATE profiles
  SET pin_hash = crypt(p_pin, gen_salt('bf', 10)),
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(p_user_id UUID, p_notification_ids UUID[] DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    UPDATE notifications
    SET is_read = TRUE
    WHERE user_id = p_user_id AND is_read = FALSE;
  ELSE
    UPDATE notifications
    SET is_read = TRUE
    WHERE user_id = p_user_id AND id = ANY(p_notification_ids);
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
