-- Add precise geo-coordinates so brokers / owners can pin the exact
-- property location, and tenants / buyers can see it on a real map.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Sanity-check: coordinates must be in a valid range.
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_lat_range;
ALTER TABLE public.properties
  ADD  CONSTRAINT properties_lat_range
  CHECK (latitude  IS NULL OR (latitude  BETWEEN -90  AND 90));

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_lng_range;
ALTER TABLE public.properties
  ADD  CONSTRAINT properties_lng_range
  CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180));

-- Index for map-viewport queries (only rows that actually have coordinates).
CREATE INDEX IF NOT EXISTS properties_lat_lng_idx
  ON public.properties (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
