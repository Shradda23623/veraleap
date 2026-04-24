-- ============================================================================
-- VeraLeap: reports, property_images, amenities
-- Adds listing-report flow, multi-image listings, and structured amenities.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. amenities column on properties
-- ---------------------------------------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS amenities text[] NOT NULL DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- 2. property_images table (multi-image listings)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_images_property_id_idx
  ON public.property_images(property_id, sort_order);

ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Property images are viewable by everyone" ON public.property_images;
CREATE POLICY "Property images are viewable by everyone"
  ON public.property_images FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Owners manage their property images" ON public.property_images;
CREATE POLICY "Owners manage their property images"
  ON public.property_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND (p.owner_id = auth.uid() OR p.broker_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND (p.owner_id = auth.uid() OR p.broker_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Keep properties.image_url in sync with the first image in property_images.
-- This lets existing pages that still read properties.image_url as a cover
-- image continue to work without changes.
CREATE OR REPLACE FUNCTION public.sync_property_cover_image()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_cover text;
BEGIN
  SELECT url INTO new_cover
  FROM public.property_images
  WHERE property_id = COALESCE(NEW.property_id, OLD.property_id)
  ORDER BY sort_order ASC, created_at ASC
  LIMIT 1;

  UPDATE public.properties
  SET image_url = new_cover
  WHERE id = COALESCE(NEW.property_id, OLD.property_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_property_cover_ins ON public.property_images;
CREATE TRIGGER trg_sync_property_cover_ins
AFTER INSERT ON public.property_images
FOR EACH ROW EXECUTE FUNCTION public.sync_property_cover_image();

DROP TRIGGER IF EXISTS trg_sync_property_cover_upd ON public.property_images;
CREATE TRIGGER trg_sync_property_cover_upd
AFTER UPDATE ON public.property_images
FOR EACH ROW EXECUTE FUNCTION public.sync_property_cover_image();

DROP TRIGGER IF EXISTS trg_sync_property_cover_del ON public.property_images;
CREATE TRIGGER trg_sync_property_cover_del
AFTER DELETE ON public.property_images
FOR EACH ROW EXECUTE FUNCTION public.sync_property_cover_image();

-- ---------------------------------------------------------------------------
-- 3. reports table (flagging listings, brokers, reviews)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.report_status AS ENUM ('pending','resolved','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.report_target AS ENUM ('property','broker','review');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.report_target NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status public.report_status NOT NULL DEFAULT 'pending',
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_target_idx ON public.reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status, created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;
CREATE POLICY "Admins can delete reports"
  ON public.reports FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));
