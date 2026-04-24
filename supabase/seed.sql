-- =============================================================================
-- VeraLeap Demo Seed Data
-- =============================================================================
-- Populates the database with 10 demo users, 10 listings across 8 Indian
-- cities (with real lat/lng), images, reviews, favorites, visits, and
-- notifications so the app looks populated out of the box.
--
-- HOW TO RUN
--   • Open Supabase Dashboard → SQL Editor → New query → paste this file → Run.
--   • Or locally:  psql "$DATABASE_URL" -f supabase/seed.sql
--
-- SAFE TO RE-RUN — every insert uses ON CONFLICT. Re-running refreshes
-- profile / property content but will not create duplicates.
--
-- DEMO LOGINS
--   These users exist only in public.* tables (not auth.users) so you can't
--   log in as them. They're shown as broker / owner / reviewer names across
--   the app. To try the flows, sign up yourself via /auth and you'll be able
--   to browse their listings, favorite them, leave reviews, schedule visits.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0a. Make sure the schema columns this seed needs actually exist. This is
--     idempotent — it matches the migration file
--     20260424200000_property_coordinates.sql. If your project already ran
--     that migration, these are no-ops.
-- ---------------------------------------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

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

CREATE INDEX IF NOT EXISTS properties_lat_lng_idx
  ON public.properties (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Amenities column (from the 20260419160000 migration).
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS amenities text[] NOT NULL DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- 0b. Drop remaining FK constraints to auth.users on demo-data tables, so
--     seed rows can reference fake UUIDs.  Previous migrations already did
--     this for profiles, user_roles, properties, and messages.
-- ---------------------------------------------------------------------------
ALTER TABLE public.favorites      DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
ALTER TABLE public.notifications  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.visits         DROP CONSTRAINT IF EXISTS visits_tenant_id_fkey;
ALTER TABLE public.visits         DROP CONSTRAINT IF EXISTS visits_host_id_fkey;
ALTER TABLE public.visits         DROP CONSTRAINT IF EXISTS visits_decided_by_fkey;
ALTER TABLE public.reviews        DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;
ALTER TABLE public.reports        DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE public.reports        DROP CONSTRAINT IF EXISTS reports_resolved_by_fkey;

-- ---------------------------------------------------------------------------
-- 1. Profiles (10 demo users)
--    UUID convention:
--      1111…   admin
--      2222…1..3  brokers
--      3333…1..3  owners
--      4444…1..3  tenants
-- ---------------------------------------------------------------------------
INSERT INTO public.profiles (user_id, username, phone, city, location, bio, verified, avatar_url)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'VeraLeap Admin',    '+91 98100 00001', 'Mumbai',     'Bandra West, Mumbai',     'Platform administrator — flags fraud and verifies listings.', true,  'https://i.pravatar.cc/300?u=veraleap-admin'),

  ('22222222-2222-2222-2222-222222222221', 'Rahul Verma',       '+91 98200 11001', 'Mumbai',     'Andheri East, Mumbai',    'RERA-verified broker — 8 years in Mumbai rentals.',          true,  'https://i.pravatar.cc/300?u=broker-rahul'),
  ('22222222-2222-2222-2222-222222222222', 'Priya Sharma',      '+91 98200 11002', 'Bangalore',  'Indiranagar, Bangalore',  'Tech-city specialist — Koramangala, HSR, Indiranagar.',       true,  'https://i.pravatar.cc/300?u=broker-priya'),
  ('22222222-2222-2222-2222-222222222223', 'Amit Singh',        '+91 98200 11003', 'Delhi',      'Saket, New Delhi',        'Delhi-NCR broker — family apartments and villas.',           true,  'https://i.pravatar.cc/300?u=broker-amit'),

  ('33333333-3333-3333-3333-333333333331', 'Anjali Mehta',      '+91 98300 22001', 'Mumbai',     'Powai, Mumbai',           'Owner of two sea-view flats in Bandra and Powai.',           true,  'https://i.pravatar.cc/300?u=owner-anjali'),
  ('33333333-3333-3333-3333-333333333332', 'Vikram Rao',        '+91 98300 22002', 'Hyderabad',  'Gachibowli, Hyderabad',   'Tech-park landlord — properties across Hyderabad and Chennai.', true, 'https://i.pravatar.cc/300?u=owner-vikram'),
  ('33333333-3333-3333-3333-333333333333', 'Neha Gupta',        '+91 98300 22003', 'Pune',       'Koregaon Park, Pune',     'Long-time Pune owner — Koregaon Park and Viman Nagar.',      false, 'https://i.pravatar.cc/300?u=owner-neha'),

  ('44444444-4444-4444-4444-444444444441', 'Arjun Kumar',       '+91 98400 33001', 'Bangalore',  'Koramangala, Bangalore',  'SDE-2 at a startup. Looking for a 2BHK near my office.',     false, 'https://i.pravatar.cc/300?u=tenant-arjun'),
  ('44444444-4444-4444-4444-444444444442', 'Sneha Nair',        '+91 98400 33002', 'Chennai',    'Adyar, Chennai',          'Design consultant, moving from Chennai to Bangalore.',       false, 'https://i.pravatar.cc/300?u=tenant-sneha'),
  ('44444444-4444-4444-4444-444444444443', 'Rohan Patel',       '+91 98400 33003', 'Pune',       'Viman Nagar, Pune',       'Grad student — 1BHK with good WiFi please.',                 false, 'https://i.pravatar.cc/300?u=tenant-rohan')
ON CONFLICT (user_id) DO UPDATE
  SET username   = EXCLUDED.username,
      phone      = EXCLUDED.phone,
      city       = EXCLUDED.city,
      location   = EXCLUDED.location,
      bio        = EXCLUDED.bio,
      verified   = EXCLUDED.verified,
      avatar_url = EXCLUDED.avatar_url;

-- ---------------------------------------------------------------------------
-- 2. User roles
-- ---------------------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin'),
  ('22222222-2222-2222-2222-222222222221', 'broker'),
  ('22222222-2222-2222-2222-222222222222', 'broker'),
  ('22222222-2222-2222-2222-222222222223', 'broker'),
  ('33333333-3333-3333-3333-333333333331', 'owner'),
  ('33333333-3333-3333-3333-333333333332', 'owner'),
  ('33333333-3333-3333-3333-333333333333', 'owner'),
  ('44444444-4444-4444-4444-444444444441', 'tenant'),
  ('44444444-4444-4444-4444-444444444442', 'tenant'),
  ('44444444-4444-4444-4444-444444444443', 'tenant')
ON CONFLICT (user_id, role) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Properties (10 listings across 8 Indian cities, with real coordinates)
-- ---------------------------------------------------------------------------
INSERT INTO public.properties (
  id, title, description, location, city, price, type,
  bedrooms, bathrooms, area, image_url, verified,
  owner_id, broker_id, amenities, latitude, longitude
) VALUES
  -- ------------------------------ Mumbai ------------------------------
  ('aaaaaaa1-0000-0000-0000-000000000001',
   'Sea-facing 3BHK in Bandra West',
   'Bright, newly-renovated 3BHK on the 14th floor with uninterrupted Arabian Sea views. Two balconies, modular kitchen, fully-furnished. Walking distance to Bandra-Worli Sea Link and Pali Hill cafes.',
   'Pali Hill, Bandra West', 'Mumbai', 185000, 'apartment',
   3, 3, 1650, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80', true,
   '33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222221',
   ARRAY['Sea View','Air Conditioning','Parking','Gym','Swimming Pool','Security','Power Backup','Lift','Furnished'],
   19.0596, 72.8295),

  ('aaaaaaa1-0000-0000-0000-000000000003',
   'Lakeside 2BHK in Powai',
   'Second-floor apartment overlooking Powai lake. Hiranandani gardens society — pool, clubhouse, 24x7 security. IIT Bombay and Hiranandani Business Park both 5 minutes away.',
   'Hiranandani Gardens, Powai', 'Mumbai', 78000, 'apartment',
   2, 2, 1050, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80', true,
   '33333333-3333-3333-3333-333333333331', NULL,
   ARRAY['Swimming Pool','Gym','Security','Parking','Power Backup','Lift','Club House','Lake View'],
   19.1176, 72.9060),

  -- ------------------------------ Delhi ------------------------------
  ('aaaaaaa2-0000-0000-0000-000000000001',
   'Spacious 3BHK Villa in Saket',
   'Independent floor with private terrace. Gated colony, covered parking, servant quarters. 10 min to Select Citywalk mall. Ideal for families relocating to South Delhi.',
   'Saket, South Delhi', 'Delhi', 125000, 'villa',
   3, 3, 1800, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80', true,
   '33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222223',
   ARRAY['Parking','Power Backup','Security','Garden','Terrace','Servant Room','Furnished'],
   28.5245, 77.2066),

  -- ------------------------------ Bangalore ------------------------------
  ('aaaaaaa3-0000-0000-0000-000000000001',
   'Trendy 2BHK in Koramangala 5th Block',
   'Newly-renovated 2BHK on a quiet tree-lined street. 2 min walk to Forum Mall, cafes on every corner. Semi-furnished with work-from-home setup in the second bedroom.',
   'Koramangala 5th Block', 'Bangalore', 54000, 'apartment',
   2, 2, 1180, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80', true,
   '33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222222',
   ARRAY['Air Conditioning','Parking','Lift','Security','Power Backup','WiFi','Semi-Furnished'],
   12.9352, 77.6245),

  ('aaaaaaa3-0000-0000-0000-000000000002',
   '1BHK Studio in Indiranagar 100 Ft Road',
   'Compact modern studio, perfect for a single working professional. Above a coffee shop on 100 Ft Road. All bills included in rent.',
   '100 Ft Road, Indiranagar', 'Bangalore', 32000, 'studio',
   1, 1, 480, 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80', true,
   '33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222222',
   ARRAY['Air Conditioning','WiFi','Furnished','Lift','Near Metro'],
   12.9784, 77.6408),

  -- ------------------------------ Hyderabad ------------------------------
  ('aaaaaaa4-0000-0000-0000-000000000001',
   'Luxe 3BHK in Gachibowli Finance District',
   'Brand-new 3BHK in a premium tower. Floor-to-ceiling windows, Italian marble, private gym access. Walk to Microsoft, Infosys, Google campuses.',
   'Financial District, Gachibowli', 'Hyderabad', 95000, 'apartment',
   3, 3, 1780, 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80', true,
   '33333333-3333-3333-3333-333333333332', NULL,
   ARRAY['Swimming Pool','Gym','Spa','Club House','Parking','Security','Power Backup','Lift','Furnished'],
   17.4401, 78.3489),

  -- ------------------------------ Pune ------------------------------
  ('aaaaaaa5-0000-0000-0000-000000000001',
   'Boho 2BHK in Koregaon Park Lane 7',
   'Character-filled apartment on leafy KP Lane 7. High ceilings, original wooden floors, open kitchen. 5 min walk to German Bakery and Osho Gardens.',
   'Koregaon Park, Lane 7', 'Pune', 58000, 'apartment',
   2, 2, 1250, 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80', true,
   '33333333-3333-3333-3333-333333333333', NULL,
   ARRAY['Air Conditioning','Parking','Furnished','Balcony','Pet Friendly'],
   18.5362, 73.8935),

  ('aaaaaaa5-0000-0000-0000-000000000003',
   '1BHK in Viman Nagar — near Phoenix Mall',
   'Bright 1BHK 10 min walk to Phoenix Marketcity and 5 min to Symbiosis. Ideal for students and young professionals. Fully furnished.',
   'Viman Nagar', 'Pune', 26000, 'apartment',
   1, 1, 620, 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1200&q=80', true,
   '33333333-3333-3333-3333-333333333333', NULL,
   ARRAY['Furnished','WiFi','Lift','Parking','Security'],
   18.5679, 73.9143),

  -- ------------------------------ Chennai ------------------------------
  ('aaaaaaa6-0000-0000-0000-000000000001',
   'Adyar 3BHK near Theosophical Society',
   'Ground-floor family apartment with small private garden. Gated society of 12 flats, very peaceful. 10 min to Besant Nagar beach.',
   'Kasturba Nagar, Adyar', 'Chennai', 55000, 'apartment',
   3, 3, 1540, 'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?w=1200&q=80', true,
   '33333333-3333-3333-3333-333333333332', NULL,
   ARRAY['Parking','Security','Garden','Power Backup','Pet Friendly','Semi-Furnished'],
   13.0067, 80.2570),

  -- ------------------------------ Jaipur ------------------------------
  ('aaaaaaa7-0000-0000-0000-000000000001',
   'Heritage 3BHK Villa — Malviya Nagar',
   'Detached villa with Rajasthani architectural touches. Private courtyard, two covered car parks, servant quarters. Family-run society.',
   'Malviya Nagar Sector 4', 'Jaipur', 48000, 'villa',
   3, 3, 2100, 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=80', true,
   '33333333-3333-3333-3333-333333333331', NULL,
   ARRAY['Parking','Security','Garden','Servant Room','Power Backup','Pet Friendly'],
   26.8506, 75.8110)

ON CONFLICT (id) DO UPDATE
  SET title       = EXCLUDED.title,
      description = EXCLUDED.description,
      location    = EXCLUDED.location,
      city        = EXCLUDED.city,
      price       = EXCLUDED.price,
      type        = EXCLUDED.type,
      bedrooms    = EXCLUDED.bedrooms,
      bathrooms   = EXCLUDED.bathrooms,
      area        = EXCLUDED.area,
      image_url   = EXCLUDED.image_url,
      verified    = EXCLUDED.verified,
      owner_id    = EXCLUDED.owner_id,
      broker_id   = EXCLUDED.broker_id,
      amenities   = EXCLUDED.amenities,
      latitude    = EXCLUDED.latitude,
      longitude   = EXCLUDED.longitude;

-- ---------------------------------------------------------------------------
-- 4. Property images (gallery — 2 per property)
-- ---------------------------------------------------------------------------
INSERT INTO public.property_images (id, property_id, url, sort_order) VALUES
  -- Bandra
  ('bbbbbbb1-0001-0000-0000-000000000001', 'aaaaaaa1-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80', 0),
  ('bbbbbbb1-0001-0000-0000-000000000002', 'aaaaaaa1-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80', 1),

  -- Powai
  ('bbbbbbb1-0003-0000-0000-000000000001', 'aaaaaaa1-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80', 0),
  ('bbbbbbb1-0003-0000-0000-000000000002', 'aaaaaaa1-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=1200&q=80', 1),

  -- Saket
  ('bbbbbbb2-0001-0000-0000-000000000001', 'aaaaaaa2-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80', 0),
  ('bbbbbbb2-0001-0000-0000-000000000002', 'aaaaaaa2-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=1200&q=80', 1),

  -- Koramangala
  ('bbbbbbb3-0001-0000-0000-000000000001', 'aaaaaaa3-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80', 0),
  ('bbbbbbb3-0001-0000-0000-000000000002', 'aaaaaaa3-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80', 1),

  -- Indiranagar
  ('bbbbbbb3-0002-0000-0000-000000000001', 'aaaaaaa3-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80', 0),
  ('bbbbbbb3-0002-0000-0000-000000000002', 'aaaaaaa3-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200&q=80', 1),

  -- Gachibowli
  ('bbbbbbb4-0001-0000-0000-000000000001', 'aaaaaaa4-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80', 0),
  ('bbbbbbb4-0001-0000-0000-000000000002', 'aaaaaaa4-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1200&q=80', 1),

  -- Koregaon Park
  ('bbbbbbb5-0001-0000-0000-000000000001', 'aaaaaaa5-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80', 0),
  ('bbbbbbb5-0001-0000-0000-000000000002', 'aaaaaaa5-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200&q=80', 1),

  -- Viman Nagar
  ('bbbbbbb5-0003-0000-0000-000000000001', 'aaaaaaa5-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1200&q=80', 0),
  ('bbbbbbb5-0003-0000-0000-000000000002', 'aaaaaaa5-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80', 1),

  -- Adyar
  ('bbbbbbb6-0001-0000-0000-000000000001', 'aaaaaaa6-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?w=1200&q=80', 0),
  ('bbbbbbb6-0001-0000-0000-000000000002', 'aaaaaaa6-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80', 1),

  -- Jaipur Villa
  ('bbbbbbb7-0001-0000-0000-000000000001', 'aaaaaaa7-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=80', 0),
  ('bbbbbbb7-0001-0000-0000-000000000002', 'aaaaaaa7-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80', 1)

ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Reviews (tenants rating properties and brokers)
-- ---------------------------------------------------------------------------
INSERT INTO public.reviews (id, reviewer_id, target_type, target_id, rating, comment) VALUES
  -- Property reviews
  ('ccccccc1-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444441', 'property', 'aaaaaaa3-0000-0000-0000-000000000001', 5, 'Loved the location and the landlord was super responsive. Everything matched the photos.'),
  ('ccccccc1-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444442', 'property', 'aaaaaaa3-0000-0000-0000-000000000001', 4, 'Great flat, but the morning traffic on 80 Ft Rd can be rough.'),
  ('ccccccc1-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444443', 'property', 'aaaaaaa5-0000-0000-0000-000000000003', 5, 'Perfect for a student. WiFi is legit 200 Mbps. Owner Neha is lovely.'),
  ('ccccccc1-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444441', 'property', 'aaaaaaa1-0000-0000-0000-000000000003', 4, 'Lake view is unreal. Society amenities are well-kept.'),
  ('ccccccc1-0000-0000-0000-000000000005', '44444444-4444-4444-4444-444444444442', 'property', 'aaaaaaa4-0000-0000-0000-000000000001', 5, 'Brand new, spotless, and walking distance to work. Booking converted in a day.'),

  -- Broker reviews
  ('ccccccc2-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444441', 'broker', '22222222-2222-2222-2222-222222222222', 5, 'Priya showed me 4 flats in one day and no hidden brokerage charges. Highly recommend.'),
  ('ccccccc2-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444442', 'broker', '22222222-2222-2222-2222-222222222221', 4, 'Rahul was patient with my Mumbai search. Could have replied on weekends though.'),
  ('ccccccc2-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444443', 'broker', '22222222-2222-2222-2222-222222222223', 5, 'Amit found me a Saket flat within my budget. Legit RERA-verified broker.')
ON CONFLICT (reviewer_id, target_type, target_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Favorites (tenants saving listings)
-- ---------------------------------------------------------------------------
INSERT INTO public.favorites (user_id, property_id) VALUES
  ('44444444-4444-4444-4444-444444444441', 'aaaaaaa3-0000-0000-0000-000000000001'),
  ('44444444-4444-4444-4444-444444444441', 'aaaaaaa3-0000-0000-0000-000000000002'),
  ('44444444-4444-4444-4444-444444444442', 'aaaaaaa3-0000-0000-0000-000000000001'),
  ('44444444-4444-4444-4444-444444444442', 'aaaaaaa1-0000-0000-0000-000000000003'),
  ('44444444-4444-4444-4444-444444444442', 'aaaaaaa6-0000-0000-0000-000000000001'),
  ('44444444-4444-4444-4444-444444444443', 'aaaaaaa5-0000-0000-0000-000000000001'),
  ('44444444-4444-4444-4444-444444444443', 'aaaaaaa5-0000-0000-0000-000000000003'),
  ('44444444-4444-4444-4444-444444444443', 'aaaaaaa7-0000-0000-0000-000000000001')
ON CONFLICT (user_id, property_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Visits (tour-scheduling). Note: this triggers visit_notify_insert which
--    inserts a notification row for the host — that's fine; re-runs use
--    ON CONFLICT (id) DO NOTHING so the trigger only fires once per visit.
-- ---------------------------------------------------------------------------
INSERT INTO public.visits (id, property_id, tenant_id, host_id, requested_at, message, status) VALUES
  ('ddddddd1-0000-0000-0000-000000000001', 'aaaaaaa3-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333331',
   now() + interval '2 days' + interval '10 hours', 'Can I visit on Saturday morning please?', 'pending'),

  ('ddddddd1-0000-0000-0000-000000000002', 'aaaaaaa5-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444443', '33333333-3333-3333-3333-333333333333',
   now() + interval '4 days' + interval '17 hours', 'Keen to see the flat. 5pm on Tuesday works for me.', 'approved'),

  ('ddddddd1-0000-0000-0000-000000000003', 'aaaaaaa4-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333332',
   now() - interval '3 days', 'Visited last Tuesday — thanks for the tour!', 'completed')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. Notifications (a mix of unread system/welcome bells)
-- ---------------------------------------------------------------------------
INSERT INTO public.notifications (id, user_id, kind, title, body, link) VALUES
  ('eeeeeee1-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444441', 'system',   'Welcome to VeraLeap',           'Start by saving a few listings or scheduling a visit.',       '/properties'),
  ('eeeeeee1-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444442', 'system',   'Welcome to VeraLeap',           'Start by saving a few listings or scheduling a visit.',       '/properties'),
  ('eeeeeee1-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444443', 'system',   'Welcome to VeraLeap',           'Start by saving a few listings or scheduling a visit.',       '/properties'),
  ('eeeeeee1-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333331', 'new_review','New review on your property',   'Someone left a 5-star review on "Trendy 2BHK in Koramangala".', '/properties/aaaaaaa3-0000-0000-0000-000000000001'),
  ('eeeeeee1-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'new_review','New review on your listing',   'Arjun left a 5-star review — nice!',                           '/dashboard'),
  ('eeeeeee1-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'system',   'Demo data seeded',              '10 listings across 8 cities are now live on the marketplace.', '/admin')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Done — refresh the home page to see 10 new listings on the map.
-- =============================================================================
