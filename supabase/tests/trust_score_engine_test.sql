-- =============================================================================
-- VeraLeap Trust Score Engine — labeled evaluation suite (pgTAP)
--
-- Purpose: this is the empirical evidence that the trust score engine
-- reliably separates fraud-signature listings from legitimate ones, and
-- that each fraud signal is individually detected and surfaced in the
-- explainable factor breakdown (not just baked into an opaque composite
-- number). This is the kind of reproducible technical-effect evidence the
-- 2025 CRI Guidelines look for in a computer-related invention: a concrete,
-- measurable improvement over a naive weighted-average rating.
--
-- How to run:
--   - Via Supabase SQL editor / `execute_sql`: paste this whole file. All
--     fixture data uses reserved test UUIDs and a `pgtap_owner_*@veraleap.test`
--     email pattern; the DELETE block at the end removes every row it created.
--   - Via Supabase CLI locally: `supabase test db` (pgTAP + pg_prove), once
--     a local dev stack exists for this project.
--
-- Labeled scenarios seeded below (all share one price cohort so the price
-- factor is comparable across every scenario):
--   legit                      — verified, no reports, honest varied reviews, fair price
--   fraud_price_lowball        — otherwise clean, but priced 60% below cohort median
--   fraud_review_mismatch      — 5-star ratings whose TEXT reads as a fraud complaint
--   fraud_review_templated     — three near-identical copy-pasted 5-star reviews
--   fraud_reports               — two independent pending fraud reports
--   fraud_bulk_listing          — owner suddenly has 11 new listings in 7 days
--   borderline_unverified       — otherwise clean, just not verified
--
-- Empirical results from the last run (2026-07-08), composite / 100:
--   legit 98.1 | fraud_price_lowball 83.5 | fraud_reports 81.3 |
--   fraud_bulk_listing 92.5 | fraud_review_mismatch 97.0 |
--   fraud_review_templated 97.0 | borderline_unverified 75.3
--
-- NOTE on the two review-fraud cases: the composite score only drops ~1.1
-- points versus legit, because `weight_reviews` (15) is small relative to
-- `weight_verification`/`weight_reports` (30 each). The *factor-level*
-- detection is still exact and immediate (sentiment_mismatch_penalty=20,
-- templated_review_pairs=3) — the explainability layer catches what the
-- single composite number dilutes. That is itself worth acting on: either
-- raise weight_reviews via a new `trust_score_weights` version, or treat a
-- large `sentiment_mismatch_penalty` / `templated_review_penalty` as an
-- independent moderation trigger rather than relying on the composite alone.
-- =============================================================================

SET search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- 1. Fixtures — 7 isolated synthetic users/properties. Inserting into
--    auth.users auto-creates a matching profiles + user_roles row via the
--    handle_new_user trigger, so we only UPDATE profiles afterwards.
-- ---------------------------------------------------------------------------
DO $$
DECLARE i int;
BEGIN
  FOR i IN 1..7 LOOP
    INSERT INTO auth.users (id, email)
    VALUES (('00000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid,
            'pgtap_owner_' || i || '@veraleap.test')
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  UPDATE public.profiles
  SET verified = true, created_at = now() - interval '60 days'
  WHERE user_id IN (
    '00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006'
  );
  UPDATE public.profiles
  SET verified = false, created_at = now() - interval '60 days'
  WHERE user_id = '00000000-0000-0000-0000-000000000007';
END $$;

-- Scenario properties: same cohort (city/type/bedrooms) so price comparisons
-- are meaningful against each other.
INSERT INTO public.properties (id, title, description, location, city, price, type, bedrooms, bathrooms, area, owner_id, verified) VALUES
  ('10000000-0000-0000-0000-000000000001', 'PGTAP-TEST legit', 'x', 'Loc', 'PgtapCohortCity', 20000, 'apartment', 2, 1, 800, '00000000-0000-0000-0000-000000000001', true),
  ('10000000-0000-0000-0000-000000000002', 'PGTAP-TEST fraud_price_lowball', 'x', 'Loc', 'PgtapCohortCity', 8000, 'apartment', 2, 1, 800, '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000003', 'PGTAP-TEST fraud_review_mismatch', 'x', 'Loc', 'PgtapCohortCity', 20000, 'apartment', 2, 1, 800, '00000000-0000-0000-0000-000000000003', true),
  ('10000000-0000-0000-0000-000000000004', 'PGTAP-TEST fraud_review_templated', 'x', 'Loc', 'PgtapCohortCity', 20000, 'apartment', 2, 1, 800, '00000000-0000-0000-0000-000000000004', true),
  ('10000000-0000-0000-0000-000000000005', 'PGTAP-TEST fraud_reports', 'x', 'Loc', 'PgtapCohortCity', 20000, 'apartment', 2, 1, 800, '00000000-0000-0000-0000-000000000005', true),
  ('10000000-0000-0000-0000-000000000007', 'PGTAP-TEST borderline_unverified', 'x', 'Loc', 'PgtapCohortCity', 20000, 'apartment', 2, 1, 800, '00000000-0000-0000-0000-000000000007', false)
ON CONFLICT (id) DO NOTHING;

-- Bulk-listing owner: 11 properties in the same cohort, all "created" now.
INSERT INTO public.properties (id, title, description, location, city, price, type, bedrooms, bathrooms, area, owner_id, verified)
SELECT ('20000000-0000-0000-0000-0000000000' || lpad(gs::text, 2, '0'))::uuid,
       'PGTAP-TEST fraud_bulk_listing #' || gs, 'x', 'Loc', 'PgtapCohortCity', 20000, 'apartment', 2, 1, 800,
       '00000000-0000-0000-0000-000000000006', true
FROM generate_series(1, 11) AS gs
ON CONFLICT (id) DO NOTHING;

-- Reviews
INSERT INTO public.reviews (target_type, target_id, reviewer_id, rating, comment) VALUES
  ('property', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 4, 'Nice apartment, quiet and clean, responsive owner'),
  ('property', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 5, 'Loved this place, comfortable and safe, would recommend'),
  ('property', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 5, 'This was a total scam, terrible, dirty and unsafe, they lied constantly'),
  ('property', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 5, 'Awful experience, fraud landlord, avoid this horrible place'),
  ('property', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 5, 'Amazing place great location very clean and quiet highly recommend to everyone'),
  ('property', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 5, 'Amazing place great location very clean and quiet highly recommend to anyone'),
  ('property', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 5, 'Amazing place great location very clean and quiet highly recommend for sure'),
  ('property', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 4, 'Seemed fine when I visited, decent place'),
  ('property', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 4, 'Decent place, good value for the area'),
  ('property', '10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 4, 'Good apartment, friendly owner, easy move-in'),
  ('property', '10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', 4, 'Comfortable stay, quiet neighborhood');

-- Reports: two independent reporters (the reports_rate_limit trigger blocks
-- a single reporter from filing twice on the same target within 24h).
INSERT INTO public.reports (target_type, target_id, reporter_id, reason, status) VALUES
  ('property', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Suspected fraud', 'pending'),
  ('property', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'Owner unresponsive after payment', 'pending');

-- Every insert above already triggered a recompute; force one more explicit
-- pass so the assertions below are guaranteed to see final state.
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM public.properties WHERE title LIKE 'PGTAP-TEST%' LOOP
    PERFORM public.calculate_trust_score(rec.id);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Assertions
-- ---------------------------------------------------------------------------
SELECT plan(14);

SELECT * FROM (
  SELECT 1 AS n, ok(
    (SELECT score FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000001') >
    (SELECT score FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000002'),
    'legit > price-lowball fraud'
  ) AS result
  UNION ALL
  SELECT 2, ok(
    (SELECT score FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000001') >
    (SELECT score FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000005'),
    'legit > report-heavy fraud'
  )
  UNION ALL
  SELECT 3, ok(
    (SELECT score FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000001') >
    (SELECT score FROM trust_scores WHERE property_id='20000000-0000-0000-0000-000000000001'),
    'legit > bulk-listing fraud'
  )
  UNION ALL
  SELECT 4, ok(
    (SELECT score FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000001') >
    (SELECT score FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000003'),
    'legit > review-sentiment-mismatch fraud'
  )
  UNION ALL
  SELECT 5, ok(
    (SELECT score FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000001') >
    (SELECT score FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000004'),
    'legit > templated-review fraud'
  )
  UNION ALL
  SELECT 6, ok(
    (SELECT score FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000001') >
    (SELECT score FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000007'),
    'legit > unverified borderline'
  )
  UNION ALL
  SELECT 7, cmp_ok(
    (SELECT score FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000001')::numeric,
    '>=', 95::numeric, 'legit clears high trust bar'
  )
  UNION ALL
  SELECT 8, cmp_ok(
    (SELECT score FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000002')::numeric,
    '<', 90::numeric, 'price-lowball flagged materially below legit'
  )
  UNION ALL
  SELECT 9, cmp_ok(
    (SELECT score FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000005')::numeric,
    '<', 85::numeric, 'report-heavy flagged materially below legit'
  )
  UNION ALL
  SELECT 10, cmp_ok(
    (SELECT score FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000007')::numeric,
    '<', 80::numeric, 'unverified borderline flagged below legit'
  )
  UNION ALL
  SELECT 11, is(
    ((SELECT factors FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000003')->'reviews'->'detail'->>'sentiment_mismatch_penalty')::numeric,
    20::numeric,
    'sentiment-vs-rating mismatch penalized at expected magnitude'
  )
  UNION ALL
  SELECT 12, is(
    ((SELECT factors FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000004')->'reviews'->'detail'->>'templated_review_pairs')::int::text,
    '3',
    'all 3 templated review pairs detected'
  )
  UNION ALL
  SELECT 13, is(
    ((SELECT factors FROM trust_scores WHERE property_id='10000000-0000-0000-0000-000000000005')->'reports'->'detail'->>'pending_property_reports')::int::text,
    '2',
    'both pending reports counted'
  )
  UNION ALL
  SELECT 14, is(
    ((SELECT factors FROM trust_scores WHERE property_id='20000000-0000-0000-0000-000000000001')->'behavior'->'detail'->>'bulk_penalty')::numeric,
    25::numeric,
    'bulk-listing behavior penalty fires at expected magnitude'
  )
) t
ORDER BY n;

SELECT * FROM finish();

-- ---------------------------------------------------------------------------
-- 3. Teardown — every row this file created gets removed.
-- ---------------------------------------------------------------------------
DELETE FROM public.reviews WHERE target_id IN (SELECT id FROM public.properties WHERE title LIKE 'PGTAP-TEST%');
DELETE FROM public.reports WHERE target_id IN (SELECT id FROM public.properties WHERE title LIKE 'PGTAP-TEST%');
DELETE FROM public.trust_scores WHERE property_id IN (SELECT id FROM public.properties WHERE title LIKE 'PGTAP-TEST%');
DELETE FROM public.properties WHERE title LIKE 'PGTAP-TEST%';
DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE 'pgtap_owner_%@veraleap.test');
DELETE FROM public.profiles WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE 'pgtap_owner_%@veraleap.test');
DELETE FROM auth.users WHERE email LIKE 'pgtap_owner_%@veraleap.test';
