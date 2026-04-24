-- =============================================================================
-- VeraLeap: favorites, notifications, visits, rate-limits
-- Adds tenant favorites, in-app notifications, tour-visit scheduling, and
-- enforces per-user rate limits on reports and reviews.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. favorites (tenant saved listings)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_id)
);

CREATE INDEX IF NOT EXISTS favorites_user_idx ON public.favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS favorites_property_idx ON public.favorites(property_id);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own favorites" ON public.favorites;
CREATE POLICY "Users manage own favorites"
  ON public.favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. notifications (in-app bell)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.notification_kind AS ENUM (
    'message',
    'visit_requested',
    'visit_approved',
    'visit_declined',
    'property_report_resolved',
    'new_review',
    'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.notification_kind NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON public.notifications(user_id, read_at NULLS FIRST, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Inserts happen through triggers/edge functions running as service-role, so
-- no INSERT policy is exposed to end users.

-- Helper used by the triggers below and by edge functions.
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _kind public.notification_kind,
  _title text,
  _body text DEFAULT NULL,
  _link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.notifications(user_id, kind, title, body, link)
  VALUES (_user_id, _kind, _title, _body, _link)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. visits (tour-scheduling)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.visit_status AS ENUM ('pending', 'approved', 'declined', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL,
  message text,
  status public.visit_status NOT NULL DEFAULT 'pending',
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visits_tenant_idx ON public.visits(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS visits_host_idx ON public.visits(host_id, status, requested_at);
CREATE INDEX IF NOT EXISTS visits_property_idx ON public.visits(property_id, requested_at);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants create visits" ON public.visits;
CREATE POLICY "Tenants create visits"
  ON public.visits FOR INSERT
  WITH CHECK (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Participants view visits" ON public.visits;
CREATE POLICY "Participants view visits"
  ON public.visits FOR SELECT
  USING (
    auth.uid() IN (tenant_id, host_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Participants update visits" ON public.visits;
CREATE POLICY "Participants update visits"
  ON public.visits FOR UPDATE
  USING (auth.uid() IN (tenant_id, host_id))
  WITH CHECK (auth.uid() IN (tenant_id, host_id));

-- On new visit request → notify host.
CREATE OR REPLACE FUNCTION public.visit_notify_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop_title text;
BEGIN
  SELECT title INTO prop_title FROM public.properties WHERE id = NEW.property_id;
  PERFORM public.create_notification(
    NEW.host_id,
    'visit_requested'::public.notification_kind,
    'New visit request',
    COALESCE('Tenant wants to visit "' || prop_title || '"', 'New visit request on your listing'),
    '/dashboard'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visit_notify_insert ON public.visits;
CREATE TRIGGER trg_visit_notify_insert
AFTER INSERT ON public.visits
FOR EACH ROW EXECUTE FUNCTION public.visit_notify_insert();

-- On status change → notify tenant.
CREATE OR REPLACE FUNCTION public.visit_notify_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop_title text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  SELECT title INTO prop_title FROM public.properties WHERE id = NEW.property_id;
  IF NEW.status = 'approved' THEN
    PERFORM public.create_notification(
      NEW.tenant_id,
      'visit_approved'::public.notification_kind,
      'Visit approved',
      'Your visit to "' || prop_title || '" is confirmed',
      '/dashboard'
    );
  ELSIF NEW.status = 'declined' THEN
    PERFORM public.create_notification(
      NEW.tenant_id,
      'visit_declined'::public.notification_kind,
      'Visit declined',
      'Your visit request for "' || prop_title || '" was declined',
      '/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visit_notify_status ON public.visits;
CREATE TRIGGER trg_visit_notify_status
AFTER UPDATE OF status ON public.visits
FOR EACH ROW EXECUTE FUNCTION public.visit_notify_status_change();

-- ---------------------------------------------------------------------------
-- 4. Rate-limits: reports (max 1 per target per user per 24h)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reports_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  recent_count int;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.reports
  WHERE reporter_id = NEW.reporter_id
    AND target_type = NEW.target_type
    AND target_id = NEW.target_id
    AND created_at > now() - interval '24 hours';

  IF recent_count > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'You have already reported this within the last 24 hours. Our team is reviewing it.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reports_rate_limit ON public.reports;
CREATE TRIGGER trg_reports_rate_limit
BEFORE INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.reports_rate_limit();

-- ---------------------------------------------------------------------------
-- 5. Rate-limits: reviews (max 1 per property per user, lifetime).
--    reviews.target_type is 'property' | 'broker'; we cap property reviews
--    at 1 per reviewer per target via a partial unique index.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_user_per_target
  ON public.reviews(reviewer_id, target_type, target_id);

-- ---------------------------------------------------------------------------
-- 6. Extra: notify property owner/broker on a new property review.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_notify_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop_title text;
  v_owner_id uuid;
  v_broker_id uuid;
BEGIN
  IF NEW.target_type <> 'property' THEN
    RETURN NEW;
  END IF;

  SELECT title, properties.owner_id, properties.broker_id
    INTO prop_title, v_owner_id, v_broker_id
  FROM public.properties WHERE id = NEW.target_id;

  IF prop_title IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_owner_id IS NOT NULL AND v_owner_id <> NEW.reviewer_id THEN
    PERFORM public.create_notification(
      v_owner_id,
      'new_review'::public.notification_kind,
      'New review on your property',
      'Someone left a review on "' || prop_title || '"',
      '/properties/' || NEW.target_id::text
    );
  END IF;
  IF v_broker_id IS NOT NULL AND v_broker_id <> NEW.reviewer_id AND v_broker_id <> v_owner_id THEN
    PERFORM public.create_notification(
      v_broker_id,
      'new_review'::public.notification_kind,
      'New review on your listing',
      'Someone left a review on "' || prop_title || '"',
      '/properties/' || NEW.target_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_notify_insert ON public.reviews;
CREATE TRIGGER trg_review_notify_insert
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.review_notify_insert();

-- ---------------------------------------------------------------------------
-- 7. Extra: when an admin resolves a report → notify the reporter.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_notify_resolved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status IN ('resolved', 'dismissed') THEN
    PERFORM public.create_notification(
      NEW.reporter_id,
      'property_report_resolved'::public.notification_kind,
      'Report ' || NEW.status::text,
      'Your report has been marked ' || NEW.status::text || ' by moderators',
      '/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_report_notify_resolved ON public.reports;
CREATE TRIGGER trg_report_notify_resolved
AFTER UPDATE OF status ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.report_notify_resolved();
