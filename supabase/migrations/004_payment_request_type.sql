-- =============================================================================
-- Migration 004: Support payment_request notification type
--                + fix default profile name to FlowPay
--                + add notifications INSERT policy
-- =============================================================================

-- If your database uses the notification_type ENUM (from migration 001),
-- add the new value. If your notifications.type column is plain TEXT,
-- this block is a no-op and 'payment_request' already works.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'notification_type'
  ) THEN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'payment_request';
  END IF;
END;
$$;

-- ── Fix default name in handle_new_user trigger ──────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  account_num TEXT;
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
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Add INSERT policy for notifications ──────────────────────────────────────
-- Required so the /api/request-money route can insert notifications
-- for other users (the target of the payment request).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
      AND policyname = 'notifications_insert_system'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "notifications_insert_system" ON notifications
        FOR INSERT WITH CHECK (true);
    $policy$;
  END IF;
END;
$$;
