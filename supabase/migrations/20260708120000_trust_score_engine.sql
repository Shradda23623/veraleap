-- =============================================================================
-- VeraLeap: Explainable Trust Score Engine
-- Adds a versioned, weighted, explainable trust/fraud-risk score per property,
-- computed from verification status, report history, review signals,
-- behavioral signals, and price-anomaly detection.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Versioned weight configuration
--    Weights are never edited in place — a new version is inserted and
--    flipped active, so every historical score stays reproducible against
--    the weight version that produced it (auditability requirement).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trust_score_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version int NOT NULL UNIQUE,
  weight_verification numeric NOT NULL DEFAULT 30,
  weight_reports numeric NOT NULL DEFAULT 30,
  weight_reviews numeric NOT NULL DEFAULT 15,
  weight_behavior numeric NOT NULL DEFAULT 15,
  weight_price numeric NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS trust_score_weights_one_active
  ON public.trust_score_weights (is_active) WHERE is_active;

ALTER TABLE public.trust_score_weights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Weight config is viewable by everyone" ON public.trust_score_weights;
CREATE POLICY "Weight config is viewable by everyone"
  ON public.trust_score_weights FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage weight config" ON public.trust_score_weights;
CREATE POLICY "Admins manage weight config"
  ON public.trust_score_weights FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update weight config" ON public.trust_score_weights;
CREATE POLICY "Admins update weight config"
  ON public.trust_score_weights FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.trust_score_weights (version, is_active, notes)
VALUES (1, true, 'Initial default weights')
ON CONFLICT (version) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Score storage — one row per property, overwritten on recompute.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trust_scores (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  score numeric NOT NULL,
  factors jsonb NOT NULL,
  weights_version int NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trust scores are viewable by everyone" ON public.trust_scores;
CREATE POLICY "Trust scores are viewable by everyone"
  ON public.trust_scores FOR SELECT
  USING (true);

-- No client INSERT/UPDATE/DELETE policy is exposed. Writes happen only
-- through the SECURITY DEFINER function below.

-- ---------------------------------------------------------------------------
-- 3. Core computation function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_trust_score(_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop RECORD;
  owner_verified boolean;
  broker_verified boolean;
  w RECORD;

  verification_score numeric := 0;
  report_score numeric := 100;
  review_score numeric := 50;
  behavior_score numeric := 100;
  price_score numeric := 100;

  pending_property_reports int := 0;
  pending_broker_reports int := 0;

  avg_property_rating numeric;
  avg_broker_rating numeric;
  recent_avg numeric;
  historic_avg numeric;
  historic_stddev numeric;
  review_anomaly_penalty numeric := 0;

  total_visits int := 0;
  fulfilled_visits int := 0;
  owner_recent_listings int := 0;
  broker_recent_listings int := 0;
  owner_account_age interval;
  bulk_penalty numeric := 0;
  young_account_penalty numeric := 0;

  cohort_median numeric;
  cohort_count int;
  deviation numeric;

  composite numeric;
  factors jsonb;
BEGIN
  SELECT * INTO prop FROM public.properties WHERE id = _property_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property % not found', _property_id;
  END IF;

  SELECT * INTO w FROM public.trust_score_weights WHERE is_active LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active trust_score_weights row configured';
  END IF;

  -- ---- Factor 1: verification -------------------------------------------
  SELECT verified INTO owner_verified FROM public.profiles WHERE user_id = prop.owner_id;
  IF prop.broker_id IS NOT NULL THEN
    SELECT verified INTO broker_verified FROM public.profiles WHERE user_id = prop.broker_id;
  END IF;

  verification_score :=
      (CASE WHEN prop.verified THEN 40 ELSE 0 END)
    + (CASE WHEN COALESCE(owner_verified, false) THEN 30 ELSE 0 END)
    + (CASE
         WHEN prop.broker_id IS NULL THEN 30
         WHEN COALESCE(broker_verified, false) THEN 30
         ELSE 0
       END);

  -- ---- Factor 2: report history (pending reports, last 180 days) --------
  SELECT COUNT(*) INTO pending_property_reports
  FROM public.reports
  WHERE target_type = 'property' AND target_id = _property_id
    AND status = 'pending' AND created_at > now() - interval '180 days';

  IF prop.broker_id IS NOT NULL THEN
    SELECT COUNT(*) INTO pending_broker_reports
    FROM public.reports
    WHERE target_type = 'broker' AND target_id = prop.broker_id
      AND status = 'pending' AND created_at > now() - interval '180 days';
  END IF;

  report_score := GREATEST(0, 100 - LEAST(100,
      25 * pending_property_reports + 15 * pending_broker_reports));

  -- ---- Factor 3: review sentiment ----------------------------------------
  SELECT AVG(rating) INTO avg_property_rating
  FROM public.reviews WHERE target_type = 'property' AND target_id = _property_id;

  IF prop.broker_id IS NOT NULL THEN
    SELECT AVG(rating) INTO avg_broker_rating
    FROM public.reviews WHERE target_type = 'broker' AND target_id = prop.broker_id;
  END IF;

  IF avg_property_rating IS NULL AND avg_broker_rating IS NULL THEN
    review_score := 50;
  ELSE
    review_score := ((COALESCE(avg_property_rating, avg_broker_rating, 3) * 0.6
                     + COALESCE(avg_broker_rating, avg_property_rating, 3) * 0.4) - 1) / 4 * 100;
  END IF;

  IF prop.broker_id IS NOT NULL THEN
    SELECT AVG(rating) INTO recent_avg FROM public.reviews
    WHERE target_type = 'broker' AND target_id = prop.broker_id
      AND created_at > now() - interval '30 days';
    SELECT AVG(rating), STDDEV(rating) INTO historic_avg, historic_stddev FROM public.reviews
    WHERE target_type = 'broker' AND target_id = prop.broker_id
      AND created_at <= now() - interval '30 days';

    IF recent_avg IS NOT NULL AND historic_avg IS NOT NULL AND COALESCE(historic_stddev, 0) > 0
       AND recent_avg > historic_avg + 1.5 * historic_stddev THEN
      review_anomaly_penalty := 15;
    END IF;
  END IF;

  review_score := GREATEST(0, LEAST(100, review_score - review_anomaly_penalty));

  -- ---- Factor 4: behavioral signals ---------------------------------------
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('approved', 'completed'))
    INTO total_visits, fulfilled_visits
  FROM public.visits WHERE property_id = _property_id;

  SELECT COUNT(*) INTO owner_recent_listings
  FROM public.properties WHERE owner_id = prop.owner_id AND created_at > now() - interval '7 days';

  IF prop.broker_id IS NOT NULL THEN
    SELECT COUNT(*) INTO broker_recent_listings
    FROM public.properties WHERE broker_id = prop.broker_id AND created_at > now() - interval '7 days';
  END IF;

  IF GREATEST(owner_recent_listings, broker_recent_listings) > 10 THEN
    bulk_penalty := 25;
  ELSIF GREATEST(owner_recent_listings, broker_recent_listings) > 5 THEN
    bulk_penalty := 10;
  END IF;

  SELECT now() - created_at INTO owner_account_age FROM public.profiles WHERE user_id = prop.owner_id;
  IF owner_account_age IS NOT NULL AND owner_account_age < interval '7 days' AND owner_recent_listings >= 5 THEN
    young_account_penalty := 15;
  END IF;

  behavior_score := GREATEST(0, 100
    - bulk_penalty
    - young_account_penalty
    - (CASE WHEN total_visits > 0 AND fulfilled_visits::numeric / total_visits < 0.2 THEN 10 ELSE 0 END));

  -- ---- Factor 5: price anomaly ---------------------------------------------
  SELECT COUNT(*), PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)
    INTO cohort_count, cohort_median
  FROM public.properties
  WHERE city = prop.city AND type = prop.type AND bedrooms = prop.bedrooms
    AND id <> _property_id;

  IF cohort_count < 3 OR cohort_median IS NULL OR cohort_median = 0 THEN
    price_score := 70;
  ELSE
    deviation := (cohort_median - prop.price) / cohort_median;
    IF deviation <= 0.15 THEN
      price_score := 100;
    ELSE
      price_score := GREATEST(0, 100 - 200 * (deviation - 0.15));
    END IF;
  END IF;

  -- ---- Composite ------------------------------------------------------------
  composite := ROUND((
      verification_score * w.weight_verification
    + report_score        * w.weight_reports
    + review_score        * w.weight_reviews
    + behavior_score      * w.weight_behavior
    + price_score         * w.weight_price
  ) / NULLIF(w.weight_verification + w.weight_reports + w.weight_reviews
           + w.weight_behavior + w.weight_price, 0), 1);

  factors := jsonb_build_object(
    'verification', jsonb_build_object('score', verification_score, 'weight', w.weight_verification,
        'detail', jsonb_build_object('listing_verified', prop.verified,
                                      'owner_verified', COALESCE(owner_verified, false),
                                      'broker_verified', broker_verified)),
    'reports', jsonb_build_object('score', report_score, 'weight', w.weight_reports,
        'detail', jsonb_build_object('pending_property_reports', pending_property_reports,
                                      'pending_broker_reports', pending_broker_reports)),
    'reviews', jsonb_build_object('score', ROUND(review_score, 1), 'weight', w.weight_reviews,
        'detail', jsonb_build_object('avg_property_rating', avg_property_rating,
                                      'avg_broker_rating', avg_broker_rating,
                                      'anomaly_penalty_applied', review_anomaly_penalty)),
    'behavior', jsonb_build_object('score', behavior_score, 'weight', w.weight_behavior,
        'detail', jsonb_build_object('total_visits', total_visits, 'fulfilled_visits', fulfilled_visits,
                                      'bulk_penalty', bulk_penalty, 'young_account_penalty', young_account_penalty)),
    'price', jsonb_build_object('score', ROUND(price_score, 1), 'weight', w.weight_price,
        'detail', jsonb_build_object('cohort_median', cohort_median, 'cohort_count', cohort_count,
                                      'listed_price', prop.price))
  );

  INSERT INTO public.trust_scores (property_id, score, factors, weights_version, computed_at)
  VALUES (_property_id, composite, factors, w.version, now())
  ON CONFLICT (property_id) DO UPDATE
    SET score = EXCLUDED.score, factors = EXCLUDED.factors,
        weights_version = EXCLUDED.weights_version, computed_at = EXCLUDED.computed_at;

  RETURN jsonb_build_object('property_id', _property_id, 'score', composite,
                             'weights_version', w.version, 'factors', factors);
END;
$$;

-- Public wrapper so the frontend can force a recompute without granting
-- direct table-write access.
CREATE OR REPLACE FUNCTION public.refresh_trust_score(_property_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.calculate_trust_score(_property_id);
$$;

-- ---------------------------------------------------------------------------
-- 4. Recompute triggers — score goes stale on the events that matter.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalc_trust_for_broker(_broker_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM public.properties WHERE broker_id = _broker_id LOOP
    PERFORM public.calculate_trust_score(rec.id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trust_score_trigger_property()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.calculate_trust_score(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trust_score_on_property_change ON public.properties;
CREATE TRIGGER trg_trust_score_on_property_change
AFTER INSERT OR UPDATE OF verified, price, broker_id ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.trust_score_trigger_property();

CREATE OR REPLACE FUNCTION public.trust_score_trigger_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.target_type = 'property' THEN
    PERFORM public.calculate_trust_score(NEW.target_id);
  ELSIF NEW.target_type = 'broker' THEN
    PERFORM public.recalc_trust_for_broker(NEW.target_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trust_score_on_report ON public.reports;
CREATE TRIGGER trg_trust_score_on_report
AFTER INSERT OR UPDATE OF status ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.trust_score_trigger_report();

CREATE OR REPLACE FUNCTION public.trust_score_trigger_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.target_type = 'property' THEN
    PERFORM public.calculate_trust_score(NEW.target_id);
  ELSIF NEW.target_type = 'broker' THEN
    PERFORM public.recalc_trust_for_broker(NEW.target_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trust_score_on_review ON public.reviews;
CREATE TRIGGER trg_trust_score_on_review
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.trust_score_trigger_review();

CREATE OR REPLACE FUNCTION public.trust_score_trigger_visit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.calculate_trust_score(NEW.property_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trust_score_on_visit ON public.visits;
CREATE TRIGGER trg_trust_score_on_visit
AFTER INSERT OR UPDATE OF status ON public.visits
FOR EACH ROW EXECUTE FUNCTION public.trust_score_trigger_visit();

CREATE OR REPLACE FUNCTION public.trust_score_trigger_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec RECORD;
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified THEN
    FOR rec IN SELECT id FROM public.properties
               WHERE owner_id = NEW.user_id OR broker_id = NEW.user_id LOOP
      PERFORM public.calculate_trust_score(rec.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trust_score_on_profile_verify ON public.profiles;
CREATE TRIGGER trg_trust_score_on_profile_verify
AFTER UPDATE OF verified ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trust_score_trigger_profile();

-- ---------------------------------------------------------------------------
-- 5. Lock down internal functions — only `refresh_trust_score` is meant to
--    be a public RPC entrypoint. The rest are implementation details /
--    trigger handlers and should not be directly callable via PostgREST.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.calculate_trust_score(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_trust_for_broker(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trust_score_trigger_property() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trust_score_trigger_report() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trust_score_trigger_review() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trust_score_trigger_visit() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trust_score_trigger_profile() FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Backfill: compute an initial score for every existing property.
-- ---------------------------------------------------------------------------
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM public.properties LOOP
    PERFORM public.calculate_trust_score(rec.id);
  END LOOP;
END $$;
