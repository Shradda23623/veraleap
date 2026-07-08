-- =============================================================================
-- VeraLeap: Review-Consistency NLP Layer (Trust Score Engine enhancement)
-- Adds lexicon-based sentiment analysis and trigram-based templated-review
-- detection to the trust score engine's "reviews" factor. This upgrades the
-- factor from a plain weighted-average rating into a text-analysis-backed
-- consistency check: does what a review SAYS agree with the star rating it
-- gave, and are multiple reviews suspiciously near-duplicate/templated text
-- (a common signature of fake/incentivized review campaigns).
--
-- This is a deliberate technical strengthening of the "reviews" factor beyond
-- a plain weighted average, so the trust score isn't just a business-method
-- calculation dressed in code — it performs actual text analysis (tokenization,
-- lexicon-based sentiment scoring, trigram similarity) to detect signals a
-- naive rating average cannot see.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1. Sentiment lexicon — small AFINN-style domain lexicon for rental reviews.
--    Scores range -3 (strongly negative) to +3 (strongly positive).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sentiment_lexicon (
  word text PRIMARY KEY,
  score smallint NOT NULL CHECK (score BETWEEN -3 AND 3)
);

ALTER TABLE public.sentiment_lexicon ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lexicon is viewable by everyone" ON public.sentiment_lexicon;
CREATE POLICY "Lexicon is viewable by everyone"
  ON public.sentiment_lexicon FOR SELECT
  USING (true);

INSERT INTO public.sentiment_lexicon (word, score) VALUES
  ('excellent', 3), ('amazing', 3), ('wonderful', 3), ('perfect', 3), ('fantastic', 3),
  ('best', 3), ('love', 3), ('loved', 3), ('outstanding', 3), ('trustworthy', 3),
  ('great', 2), ('good', 2), ('nice', 2), ('clean', 2), ('responsive', 2),
  ('helpful', 2), ('professional', 2), ('spacious', 2), ('quiet', 2), ('safe', 2),
  ('honest', 2), ('genuine', 2), ('verified', 2), ('friendly', 2), ('quick', 2),
  ('comfortable', 2), ('beautiful', 2), ('happy', 2), ('satisfied', 2), ('reliable', 2),
  ('prompt', 2), ('smooth', 2), ('recommend', 2), ('easy', 2), ('lovely', 2),
  ('fine', 1), ('okay', 1), ('decent', 1), ('fair', 1), ('convenient', 1),
  ('slow', -1), ('noisy', -1), ('small', -1), ('crowded', -1), ('outdated', -1),
  ('delay', -1), ('delayed', -1), ('confusing', -1), ('deposit', -1), ('refund', -1),
  ('bad', -2), ('poor', -2), ('dirty', -2), ('rude', -2), ('unresponsive', -2),
  ('unsafe', -2), ('broken', -2), ('misleading', -2), ('unprofessional', -2), ('ignored', -2),
  ('disappointing', -2), ('cancel', -2), ('cancelled', -2), ('problem', -2), ('issue', -2),
  ('worst', -2), ('avoid', -2), ('never', -2), ('waste', -2), ('suspicious', -2),
  ('scam', -3), ('fraud', -3), ('fraudulent', -3), ('fake', -3), ('terrible', -3),
  ('awful', -3), ('horrible', -3), ('lied', -3), ('lie', -3), ('cheat', -3),
  ('cheated', -3), ('nightmare', -3), ('disgusting', -3), ('stolen', -3), ('threat', -3),
  ('threatened', -3), ('harass', -3), ('harassed', -3), ('dishonest', -3), ('ghosted', -3),
  ('scary', -3), ('creepy', -3)
ON CONFLICT (word) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. compute_review_sentiment: lexicon-lookup average sentiment for a text.
--    Returns NULL if no lexicon words matched (caller falls back to
--    rating-only scoring — this is intentionally conservative).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_review_sentiment(_text text)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH tokens AS (
    SELECT unnest(regexp_split_to_array(
      lower(regexp_replace(COALESCE(_text, ''), '[^a-zA-Z'' ]', ' ', 'g')),
      '\s+'
    )) AS tok
  ),
  matched AS (
    SELECT sl.score
    FROM tokens t
    JOIN public.sentiment_lexicon sl ON sl.word = t.tok
  )
  SELECT CASE WHEN COUNT(*) = 0 THEN NULL ELSE ROUND(AVG(score), 3) END
  FROM matched;
$$;

REVOKE EXECUTE ON FUNCTION public.compute_review_sentiment(text) FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. detect_templated_reviews: trigram-similarity check for near-duplicate
--    review text against the same target (a common fake/incentivized-review
--    signature: several reviews with copy-pasted or lightly reworded text).
--    pg_trgm lives in the `extensions` schema (Supabase convention), so this
--    function's search_path includes it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.detect_templated_reviews(
  _target_type text, _target_id uuid, _similarity_threshold numeric DEFAULT 0.55
)
RETURNS TABLE(review_id_a uuid, review_id_b uuid, similarity numeric)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT r1.id, r2.id, extensions.similarity(r1.comment, r2.comment)
  FROM public.reviews r1
  JOIN public.reviews r2
    ON r2.target_type = r1.target_type AND r2.target_id = r1.target_id AND r2.id > r1.id
  WHERE r1.target_type = _target_type AND r1.target_id = _target_id
    AND r1.comment IS NOT NULL AND length(trim(r1.comment)) > 10
    AND r2.comment IS NOT NULL AND length(trim(r2.comment)) > 10
    AND extensions.similarity(r1.comment, r2.comment) >= _similarity_threshold;
$$;

REVOKE EXECUTE ON FUNCTION public.detect_templated_reviews(text, uuid, numeric) FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Fold both signals into calculate_trust_score's "reviews" factor.
--    Every other factor (verification, reports, behavior, price), the
--    composite formula, storage, and permissions are byte-identical to the
--    original migration — only Factor 3 gains two new sub-penalties and the
--    factor detail gets richer explainability output.
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

  sentiment_mismatch_penalty numeric := 0;
  templated_review_penalty numeric := 0;
  avg_sentiment_mismatch numeric;
  templated_pair_count int := 0;
  max_similarity numeric := 0;
  review_rec RECORD;
  mismatch_count int := 0;
  mismatch_total numeric := 0;
  sentiment numeric;
  rating_norm numeric;
  sentiment_norm numeric;

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

  -- ---- NLP sub-signal A: sentiment-vs-rating mismatch ---------------------
  -- For every review on this property or its broker, compute lexicon
  -- sentiment on the comment text and compare it (normalized to -1..1)
  -- against the normalized star rating. A large average mismatch means
  -- the written text and the star rating disagree systematically —
  -- a signal plain weighted-average scoring can't see at all.
  FOR review_rec IN
    SELECT rating, comment FROM public.reviews
    WHERE (target_type = 'property' AND target_id = _property_id)
       OR (prop.broker_id IS NOT NULL AND target_type = 'broker' AND target_id = prop.broker_id)
  LOOP
    sentiment := public.compute_review_sentiment(review_rec.comment);
    IF sentiment IS NOT NULL THEN
      rating_norm := (review_rec.rating - 3) / 2.0;       -- 1..5  -> -1..1
      sentiment_norm := GREATEST(-1, LEAST(1, sentiment / 3.0)); -- -3..3 -> -1..1
      mismatch_total := mismatch_total + ABS(rating_norm - sentiment_norm);
      mismatch_count := mismatch_count + 1;
    END IF;
  END LOOP;

  IF mismatch_count > 0 THEN
    avg_sentiment_mismatch := ROUND(mismatch_total / mismatch_count, 3);
    -- mismatch ranges 0..2; only penalize once it's clearly disagreeing
    IF avg_sentiment_mismatch > 0.6 THEN
      sentiment_mismatch_penalty := LEAST(20, ROUND((avg_sentiment_mismatch - 0.6) * 25, 1));
    END IF;
  END IF;

  -- ---- NLP sub-signal B: templated / near-duplicate review text -----------
  SELECT COUNT(*), COALESCE(MAX(similarity), 0) INTO templated_pair_count, max_similarity
  FROM public.detect_templated_reviews('property', _property_id);

  IF prop.broker_id IS NOT NULL THEN
    DECLARE
      broker_pairs int;
      broker_max numeric;
    BEGIN
      SELECT COUNT(*), COALESCE(MAX(similarity), 0) INTO broker_pairs, broker_max
      FROM public.detect_templated_reviews('broker', prop.broker_id);
      templated_pair_count := templated_pair_count + broker_pairs;
      max_similarity := GREATEST(max_similarity, broker_max);
    END;
  END IF;

  IF templated_pair_count > 0 THEN
    templated_review_penalty := LEAST(20, 10 + 5 * (templated_pair_count - 1));
  END IF;

  review_score := GREATEST(0, LEAST(100,
    review_score - review_anomaly_penalty - sentiment_mismatch_penalty - templated_review_penalty));

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
                                      'anomaly_penalty_applied', review_anomaly_penalty,
                                      'sentiment_mismatch_penalty', sentiment_mismatch_penalty,
                                      'avg_sentiment_rating_mismatch', avg_sentiment_mismatch,
                                      'templated_review_penalty', templated_review_penalty,
                                      'templated_review_pairs', templated_pair_count,
                                      'max_review_text_similarity', ROUND(max_similarity, 3))),
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

-- ---------------------------------------------------------------------------
-- 5. Recompute every existing property so the new signals take effect.
-- ---------------------------------------------------------------------------
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM public.properties LOOP
    PERFORM public.calculate_trust_score(rec.id);
  END LOOP;
END $$;
