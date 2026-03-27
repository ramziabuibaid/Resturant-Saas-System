-- =============================================================================
-- خصم النقاط على الطلب (مبلغ الطلب بعد الخصم + احتساب كسب النقاط على الصافي)
-- نفّذ في Supabase SQL Editor بعد loyalty-professional-redesign.sql
-- =============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS loyalty_points_used INT NOT NULL DEFAULT 0
    CHECK (loyalty_points_used >= 0);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS loyalty_discount_cents INT NOT NULL DEFAULT 0
    CHECK (loyalty_discount_cents >= 0);

COMMENT ON COLUMN public.orders.loyalty_points_used IS 'عدد النقاط المستبدَلة نقدياً ضمن هذا الطلب';
COMMENT ON COLUMN public.orders.loyalty_discount_cents IS 'قيمة الخصم بالسنت من استبدال النقاط';

-- كسب النقاط على المبلغ الصافي بعد خصم الولاء
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
  v_sum INT;
  v_disc INT;
  v_total INT;
  v_points INT;
  v_customer_id UUID;
  v_balance INT;
BEGIN
  SELECT o.restaurant_id, o.customer_phone, COALESCE(o.loyalty_discount_cents, 0)
    INTO v_restaurant_id, v_phone, v_disc
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
    INTO v_sum
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id;

  v_total := GREATEST(0, v_sum - v_disc);

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
    v_restaurant_id, v_customer_id, p_order_id, 'earn', v_points, 0,
    jsonb_build_object(
      'order_subtotal_cents', v_sum,
      'loyalty_discount_cents', v_disc,
      'earn_base_cents', v_total
    )
  );

  RETURN QUERY SELECT v_points, v_customer_id, COALESCE(v_balance, 0);
END;
$$;
