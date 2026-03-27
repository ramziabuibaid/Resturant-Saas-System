-- =============================================================================
-- Professional loyalty redesign (customers + accounts + transactions + rewards)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  phone_normalized TEXT NOT NULL,
  name TEXT,
  email TEXT,
  preferred_channel TEXT NOT NULL DEFAULT 'sms' CHECK (preferred_channel IN ('sms', 'whatsapp', 'email')),
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, phone_normalized)
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_restaurant_phone
  ON public.customer_profiles(restaurant_id, phone_normalized);

CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  points_balance INT NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  lifetime_earned INT NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
  lifetime_redeemed INT NOT NULL DEFAULT 0 CHECK (lifetime_redeemed >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_customer
  ON public.loyalty_accounts(customer_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loyalty_tx_type') THEN
    CREATE TYPE public.loyalty_tx_type AS ENUM (
      'earn',
      'redeem_cash',
      'redeem_reward',
      'adjustment',
      'expiry',
      'bonus'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  tx_type public.loyalty_tx_type NOT NULL,
  points_delta INT NOT NULL,
  money_value_cents INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_created
  ON public.loyalty_transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_restaurant_created
  ON public.loyalty_transactions(restaurant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.loyalty_rewards_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  points_cost INT NOT NULL CHECK (points_cost > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  optional_stock INT CHECK (optional_stock IS NULL OR optional_stock >= 0),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_restaurant_active
  ON public.loyalty_rewards_catalog(restaurant_id, active);

CREATE TABLE IF NOT EXISTS public.loyalty_reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.loyalty_rewards_catalog(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  loyalty_transaction_id UUID NOT NULL REFERENCES public.loyalty_transactions(id) ON DELETE CASCADE,
  points_spent INT NOT NULL CHECK (points_spent > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_customer
  ON public.loyalty_reward_redemptions(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.customer_public_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_access_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customer_public_links_lookup
  ON public.customer_public_links(restaurant_id, customer_id, is_revoked, expires_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
    CREATE TYPE public.notification_channel AS ENUM ('sms', 'whatsapp', 'email');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
    CREATE TYPE public.notification_status AS ENUM ('queued', 'processing', 'sent', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.outbound_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  channel public.notification_channel NOT NULL,
  template_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.notification_status NOT NULL DEFAULT 'queued',
  provider_message_id TEXT,
  error TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbound_notifications_pending
  ON public.outbound_notifications(status, scheduled_at ASC);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_profiles_updated_at ON public.customer_profiles;
CREATE TRIGGER trg_customer_profiles_updated_at
BEFORE UPDATE ON public.customer_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_loyalty_rewards_updated_at ON public.loyalty_rewards_catalog;
CREATE TRIGGER trg_loyalty_rewards_updated_at
BEFORE UPDATE ON public.loyalty_rewards_catalog
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_customer_loyalty_account(
  p_restaurant_id UUID,
  p_phone_normalized TEXT
)
RETURNS TABLE(customer_id UUID, account_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id UUID;
  v_account_id UUID;
BEGIN
  INSERT INTO public.customer_profiles (restaurant_id, phone_normalized)
  VALUES (p_restaurant_id, p_phone_normalized)
  ON CONFLICT (restaurant_id, phone_normalized)
  DO UPDATE SET updated_at = now()
  RETURNING id INTO v_customer_id;

  INSERT INTO public.loyalty_accounts (restaurant_id, customer_id)
  VALUES (p_restaurant_id, v_customer_id)
  ON CONFLICT (restaurant_id, customer_id)
  DO UPDATE SET updated_at = now()
  RETURNING id INTO v_account_id;

  RETURN QUERY SELECT v_customer_id, v_account_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_loyalty_earn(p_order_id UUID)
RETURNS TABLE(points_earned INT, customer_id UUID, new_balance INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restaurant_id UUID;
  v_phone TEXT;
  v_enabled BOOLEAN;
  v_spend_per INT;
  v_total INT;
  v_points INT;
  v_customer_id UUID;
  v_balance INT;
BEGIN
  SELECT o.restaurant_id, o.customer_phone
    INTO v_restaurant_id, v_phone
  FROM public.orders o
  WHERE o.id = p_order_id;

  IF v_restaurant_id IS NULL OR v_phone IS NULL THEN
    RAISE EXCEPTION 'order not found or customer phone missing';
  END IF;

  SELECT r.loyalty_program_enabled, COALESCE(r.loyalty_spend_cents_per_point, 100)
    INTO v_enabled, v_spend_per
  FROM public.restaurants r
  WHERE r.id = v_restaurant_id;

  IF COALESCE(v_enabled, false) = false THEN
    RETURN QUERY SELECT 0, NULL::UUID, 0;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(oi.line_total_cents), 0)
    INTO v_total
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id;

  v_points := FLOOR(v_total / GREATEST(1, v_spend_per));
  IF v_points <= 0 THEN
    RETURN QUERY SELECT 0, NULL::UUID, 0;
    RETURN;
  END IF;

  SELECT e.customer_id INTO v_customer_id
  FROM public.ensure_customer_loyalty_account(v_restaurant_id, v_phone) e;

  UPDATE public.loyalty_accounts a
  SET points_balance = a.points_balance + v_points,
      lifetime_earned = a.lifetime_earned + v_points,
      updated_at = now()
  WHERE a.customer_id = v_customer_id
    AND a.restaurant_id = v_restaurant_id
  RETURNING a.points_balance INTO v_balance;

  INSERT INTO public.loyalty_transactions (
    restaurant_id, customer_id, order_id, tx_type, points_delta, money_value_cents, metadata
  ) VALUES (
    v_restaurant_id, v_customer_id, p_order_id, 'earn', v_points, 0, jsonb_build_object('order_total_cents', v_total)
  );

  RETURN QUERY SELECT v_points, v_customer_id, COALESCE(v_balance, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_loyalty_cash(
  p_customer_id UUID,
  p_order_id UUID,
  p_points_requested INT
)
RETURNS TABLE(points_redeemed INT, discount_cents INT, new_balance INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restaurant_id UUID;
  v_balance INT;
  v_point_value INT;
  v_redeem INT;
BEGIN
  IF p_points_requested <= 0 THEN
    RAISE EXCEPTION 'points_requested must be > 0';
  END IF;

  SELECT a.restaurant_id, a.points_balance
    INTO v_restaurant_id, v_balance
  FROM public.loyalty_accounts a
  WHERE a.customer_id = p_customer_id
  FOR UPDATE;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'loyalty account not found';
  END IF;

  SELECT COALESCE(r.loyalty_point_value_cents, 10)
    INTO v_point_value
  FROM public.restaurants r
  WHERE r.id = v_restaurant_id;

  v_redeem := LEAST(v_balance, p_points_requested);
  IF v_redeem <= 0 THEN
    RAISE EXCEPTION 'insufficient points';
  END IF;

  UPDATE public.loyalty_accounts a
  SET points_balance = a.points_balance - v_redeem,
      lifetime_redeemed = a.lifetime_redeemed + v_redeem,
      updated_at = now()
  WHERE a.customer_id = p_customer_id
    AND a.restaurant_id = v_restaurant_id
  RETURNING a.points_balance INTO new_balance;

  points_redeemed := v_redeem;
  discount_cents := v_redeem * GREATEST(1, v_point_value);

  INSERT INTO public.loyalty_transactions (
    restaurant_id, customer_id, order_id, tx_type, points_delta, money_value_cents, metadata
  ) VALUES (
    v_restaurant_id, p_customer_id, p_order_id, 'redeem_cash', -v_redeem, discount_cents, '{}'::jsonb
  );

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(
  p_customer_id UUID,
  p_reward_id UUID,
  p_order_id UUID DEFAULT NULL
)
RETURNS TABLE(points_spent INT, new_balance INT, redemption_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restaurant_id UUID;
  v_balance INT;
  v_points_cost INT;
  v_active BOOLEAN;
  v_stock INT;
  v_valid_from TIMESTAMPTZ;
  v_valid_to TIMESTAMPTZ;
  v_tx_id UUID;
BEGIN
  SELECT a.restaurant_id, a.points_balance
    INTO v_restaurant_id, v_balance
  FROM public.loyalty_accounts a
  WHERE a.customer_id = p_customer_id
  FOR UPDATE;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'loyalty account not found';
  END IF;

  SELECT points_cost, active, optional_stock, valid_from, valid_to
    INTO v_points_cost, v_active, v_stock, v_valid_from, v_valid_to
  FROM public.loyalty_rewards_catalog
  WHERE id = p_reward_id
    AND restaurant_id = v_restaurant_id;

  IF v_points_cost IS NULL THEN
    RAISE EXCEPTION 'reward not found';
  END IF;
  IF v_active = false THEN
    RAISE EXCEPTION 'reward inactive';
  END IF;
  IF v_valid_from IS NOT NULL AND now() < v_valid_from THEN
    RAISE EXCEPTION 'reward not active yet';
  END IF;
  IF v_valid_to IS NOT NULL AND now() > v_valid_to THEN
    RAISE EXCEPTION 'reward expired';
  END IF;
  IF v_stock IS NOT NULL AND v_stock <= 0 THEN
    RAISE EXCEPTION 'reward out of stock';
  END IF;
  IF v_balance < v_points_cost THEN
    RAISE EXCEPTION 'insufficient points';
  END IF;

  UPDATE public.loyalty_accounts a
  SET points_balance = a.points_balance - v_points_cost,
      lifetime_redeemed = a.lifetime_redeemed + v_points_cost,
      updated_at = now()
  WHERE a.customer_id = p_customer_id
    AND a.restaurant_id = v_restaurant_id
  RETURNING a.points_balance INTO new_balance;

  IF v_stock IS NOT NULL THEN
    UPDATE public.loyalty_rewards_catalog
    SET optional_stock = optional_stock - 1
    WHERE id = p_reward_id
      AND optional_stock IS NOT NULL;
  END IF;

  INSERT INTO public.loyalty_transactions (
    restaurant_id, customer_id, order_id, tx_type, points_delta, money_value_cents, metadata
  ) VALUES (
    v_restaurant_id, p_customer_id, p_order_id, 'redeem_reward', -v_points_cost, 0, jsonb_build_object('reward_id', p_reward_id)
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO public.loyalty_reward_redemptions (
    restaurant_id, customer_id, reward_id, order_id, loyalty_transaction_id, points_spent
  ) VALUES (
    v_restaurant_id, p_customer_id, p_reward_id, p_order_id, v_tx_id, v_points_cost
  )
  RETURNING id INTO redemption_id;

  points_spent := v_points_cost;
  RETURN NEXT;
END;
$$;

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_public_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can read customer_profiles" ON public.customer_profiles;
CREATE POLICY "Owner can read customer_profiles"
  ON public.customer_profiles FOR SELECT
  USING (restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Owner can read loyalty_accounts" ON public.loyalty_accounts;
CREATE POLICY "Owner can read loyalty_accounts"
  ON public.loyalty_accounts FOR SELECT
  USING (restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Owner can read loyalty_transactions" ON public.loyalty_transactions;
CREATE POLICY "Owner can read loyalty_transactions"
  ON public.loyalty_transactions FOR SELECT
  USING (restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Owner can read rewards catalog" ON public.loyalty_rewards_catalog;
CREATE POLICY "Owner can read rewards catalog"
  ON public.loyalty_rewards_catalog FOR SELECT
  USING (restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Owner can manage rewards catalog" ON public.loyalty_rewards_catalog;
CREATE POLICY "Owner can manage rewards catalog"
  ON public.loyalty_rewards_catalog FOR ALL
  USING (restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()))
  WITH CHECK (restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Owner can read reward redemptions" ON public.loyalty_reward_redemptions;
CREATE POLICY "Owner can read reward redemptions"
  ON public.loyalty_reward_redemptions FOR SELECT
  USING (restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Owner can read customer public links" ON public.customer_public_links;
CREATE POLICY "Owner can read customer public links"
  ON public.customer_public_links FOR SELECT
  USING (restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Owner can manage customer public links" ON public.customer_public_links;
CREATE POLICY "Owner can manage customer public links"
  ON public.customer_public_links FOR ALL
  USING (restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()))
  WITH CHECK (restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Owner can read outbound notifications" ON public.outbound_notifications;
CREATE POLICY "Owner can read outbound notifications"
  ON public.outbound_notifications FOR SELECT
  USING (restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()));
