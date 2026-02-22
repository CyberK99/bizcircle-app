-- ============================================================================
-- BizCircle App - Initial Database Schema Migration
-- A mobile-first community platform for small business owners
-- ============================================================================
-- This migration creates all tables, indexes, triggers, helper functions,
-- and Row Level Security (RLS) policies for the BizCircle application.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. HELPER FUNCTIONS (used by RLS policies and triggers)
-- ============================================================================

-- Returns the business_id owned by a given auth user, or NULL if none exists.
CREATE OR REPLACE FUNCTION get_user_business_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM businesses WHERE owner_id = p_user_id LIMIT 1;
$$;

-- Returns true if the given business_id is a member of the given group_id.
CREATE OR REPLACE FUNCTION is_group_member(p_business_id uuid, p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_memberships
    WHERE business_id = p_business_id AND group_id = p_group_id
  );
$$;

-- Returns true if the given business is verified.
CREATE OR REPLACE FUNCTION is_business_verified(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = p_business_id AND verification_status = 'verified'
  );
$$;

-- Returns true if the given user's business is verified.
CREATE OR REPLACE FUNCTION is_user_verified(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses
    WHERE owner_id = p_user_id AND verification_status = 'verified'
  );
$$;

-- Returns true if the given business_id is a participant in the conversation.
CREATE OR REPLACE FUNCTION is_conversation_participant(p_business_id uuid, p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE business_id = p_business_id AND conversation_id = p_conversation_id
  );
$$;

-- Generic trigger function to set updated_at to now() on UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- --------------------------------------------------------------------------
-- 2.1 profiles - extends Supabase auth.users
-- --------------------------------------------------------------------------
CREATE TABLE profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  full_name   text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users.';


-- --------------------------------------------------------------------------
-- 2.2 industries - curated 2-level hierarchy
-- --------------------------------------------------------------------------
CREATE TABLE industries (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  slug         text        NOT NULL UNIQUE,
  parent_id    uuid        REFERENCES industries(id),
  naics_prefix text,
  icon         text,
  sort_order   int         DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE industries IS 'Two-level industry hierarchy for business classification.';


-- --------------------------------------------------------------------------
-- 2.3 counties - static US county reference (~3,200 rows)
-- --------------------------------------------------------------------------
CREATE TABLE counties (
  fips        char(5)     PRIMARY KEY,
  name        text        NOT NULL,
  state_code  char(2)     NOT NULL,
  state_name  text        NOT NULL,
  latitude    numeric,
  longitude   numeric,
  population  int,
  is_pilot    boolean     DEFAULT false
);

COMMENT ON TABLE counties IS 'US county reference table with FIPS codes.';


-- --------------------------------------------------------------------------
-- 2.4 county_adjacency - pre-computed adjacency graph
-- --------------------------------------------------------------------------
CREATE TABLE county_adjacency (
  county_fips   char(5) NOT NULL REFERENCES counties(fips),
  neighbor_fips char(5) NOT NULL REFERENCES counties(fips),
  PRIMARY KEY (county_fips, neighbor_fips)
);

COMMENT ON TABLE county_adjacency IS 'Pre-computed county adjacency for geographic expansion.';


-- --------------------------------------------------------------------------
-- 2.5 businesses - central business entity
-- --------------------------------------------------------------------------
CREATE TABLE businesses (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id             uuid        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  name                 text        NOT NULL,
  description          text,
  phone                text,
  website              text,
  logo_url             text,
  address_line1        text,
  address_line2        text,
  city                 text,
  state_code           char(2),
  zip                  char(10),
  county_fips          char(5)     REFERENCES counties(fips),
  county_name          text,
  latitude             numeric,
  longitude            numeric,
  industry_id          uuid        REFERENCES industries(id),
  naics_code           text,
  employee_count       int,
  year_founded         int,
  verification_status  text        NOT NULL DEFAULT 'unverified'
                                   CHECK (verification_status IN ('unverified','pending','verified','rejected')),
  verified_at          timestamptz,
  trust_score          numeric(3,2) DEFAULT 0.00
                                   CHECK (trust_score >= 0 AND trust_score <= 5),
  review_count         int         DEFAULT 0,
  is_active            boolean     DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE businesses IS 'Central business entity. One business per user in v1.';

CREATE INDEX idx_businesses_county_fips          ON businesses(county_fips);
CREATE INDEX idx_businesses_industry_id          ON businesses(industry_id);
CREATE INDEX idx_businesses_owner_id             ON businesses(owner_id);
CREATE INDEX idx_businesses_verification_status  ON businesses(verification_status);


-- --------------------------------------------------------------------------
-- 2.6 groups - auto-created at industry x county intersection
-- --------------------------------------------------------------------------
CREATE TABLE groups (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_id   uuid        REFERENCES industries(id),
  county_fips   char(5)     REFERENCES counties(fips),
  name          text        NOT NULL,
  slug          text        NOT NULL UNIQUE,
  description   text,
  member_count  int         DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (industry_id, county_fips)
);

COMMENT ON TABLE groups IS 'Community groups at the industry x county intersection.';


-- --------------------------------------------------------------------------
-- 2.7 group_memberships
-- --------------------------------------------------------------------------
CREATE TABLE group_memberships (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  business_id uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role        text        NOT NULL DEFAULT 'member'
                          CHECK (role IN ('member','moderator','admin')),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  is_muted    boolean     DEFAULT false,
  UNIQUE (group_id, business_id)
);

COMMENT ON TABLE group_memberships IS 'Tracks which businesses belong to which groups.';


-- --------------------------------------------------------------------------
-- 2.8 posts - group discussions with threaded replies
-- --------------------------------------------------------------------------
CREATE TABLE posts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  author_id   uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  parent_id   uuid        REFERENCES posts(id) ON DELETE CASCADE,
  post_type   text        NOT NULL DEFAULT 'discussion'
                          CHECK (post_type IN ('discussion','question','announcement','poll')),
  title       text,
  body        text        NOT NULL,
  media_urls  text[]      DEFAULT '{}',
  is_pinned   boolean     DEFAULT false,
  like_count  int         DEFAULT 0,
  reply_count int         DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE posts IS 'Group discussion posts with threaded replies via parent_id.';


-- --------------------------------------------------------------------------
-- 2.9 post_likes - compound PK
-- --------------------------------------------------------------------------
CREATE TABLE post_likes (
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, business_id)
);

COMMENT ON TABLE post_likes IS 'Tracks likes/upvotes on posts.';


-- --------------------------------------------------------------------------
-- 2.10 conversations
-- --------------------------------------------------------------------------
CREATE TABLE conversations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE conversations IS 'Direct message conversations between businesses.';


-- --------------------------------------------------------------------------
-- 2.11 conversation_participants
-- --------------------------------------------------------------------------
CREATE TABLE conversation_participants (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  business_id     uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  last_read_at    timestamptz DEFAULT now(),
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, business_id)
);

COMMENT ON TABLE conversation_participants IS 'Tracks which businesses participate in a conversation.';


-- --------------------------------------------------------------------------
-- 2.12 messages
-- --------------------------------------------------------------------------
CREATE TABLE messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  body            text        NOT NULL,
  media_urls      text[]      DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE messages IS 'Individual messages within a conversation.';


-- --------------------------------------------------------------------------
-- 2.13 emergency_requests
-- --------------------------------------------------------------------------
CREATE TABLE emergency_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category      text        NOT NULL
                            CHECK (category IN ('urgent_repair','temporary_staff','equipment_needed',
                                                'supply_shortage','emergency_service','other')),
  title         text        NOT NULL,
  description   text        NOT NULL,
  urgency_level int         NOT NULL CHECK (urgency_level >= 1 AND urgency_level <= 3),
  latitude      numeric,
  longitude     numeric,
  current_tier  int         DEFAULT 1 CHECK (current_tier >= 1 AND current_tier <= 4),
  status        text        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','responded','fulfilled','cancelled','expired')),
  expires_at    timestamptz,
  fulfilled_by  uuid        REFERENCES businesses(id),
  fulfilled_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE emergency_requests IS 'Urgent help requests with tiered geographic escalation.';
COMMENT ON COLUMN emergency_requests.urgency_level IS '1=critical, 2=urgent, 3=same-day';
COMMENT ON COLUMN emergency_requests.current_tier IS 'Current escalation tier (1-4), controls notification radius.';


-- --------------------------------------------------------------------------
-- 2.14 emergency_responses
-- --------------------------------------------------------------------------
CREATE TABLE emergency_responses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      uuid        NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
  responder_id    uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  message         text,
  estimated_eta   text,
  estimated_cost  text,
  status          text        NOT NULL DEFAULT 'offered'
                              CHECK (status IN ('offered','accepted','declined','completed')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE emergency_responses IS 'Responses to emergency help requests.';


-- --------------------------------------------------------------------------
-- 2.15 emergency_escalation_log
-- --------------------------------------------------------------------------
CREATE TABLE emergency_escalation_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      uuid        NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
  tier            int         NOT NULL,
  notified_count  int         DEFAULT 0,
  radius_miles    numeric,
  escalated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE emergency_escalation_log IS 'Audit trail of emergency request escalation tiers.';


-- --------------------------------------------------------------------------
-- 2.16 listings - polymorphic marketplace
-- --------------------------------------------------------------------------
CREATE TABLE listings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  group_id        uuid        REFERENCES groups(id) ON DELETE SET NULL,
  listing_type    text        NOT NULL
                              CHECK (listing_type IN ('equipment','supply','space',
                                                      'staff_available','staff_needed','group_deal')),
  title           text        NOT NULL,
  description     text,
  media_urls      text[]      DEFAULT '{}',
  -- Equipment / supply fields
  condition       text,
  price           numeric,
  price_type      text        CHECK (price_type IN ('fixed','negotiable','free','per_hour','per_day')),
  -- Staffing fields
  role_title      text,
  hourly_rate     numeric,
  date_needed     date,
  duration        text,
  skills          text[],
  -- Group deal fields
  target_quantity  int,
  current_signups  int        DEFAULT 0,
  deal_deadline    date,
  supplier_name    text,
  -- Common fields
  status          text        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','pending','fulfilled','expired','cancelled')),
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE listings IS 'Polymorphic marketplace listings (equipment, supplies, staffing, deals).';


-- --------------------------------------------------------------------------
-- 2.17 listing_responses
-- --------------------------------------------------------------------------
CREATE TABLE listing_responses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  business_id uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  message     text,
  status      text        NOT NULL DEFAULT 'interested'
                          CHECK (status IN ('interested','accepted','declined')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE listing_responses IS 'Responses/interest in marketplace listings.';


-- --------------------------------------------------------------------------
-- 2.18 referrals
-- --------------------------------------------------------------------------
CREATE TABLE referrals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  referred_id     uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  referred_to_id  uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  group_id        uuid        REFERENCES groups(id) ON DELETE SET NULL,
  category        text,
  description     text,
  contact_name    text,
  contact_phone   text,
  contact_email   text,
  status          text        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open','contacted','won','lost','expired')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE referrals IS 'Business-to-business referrals within the community.';


-- --------------------------------------------------------------------------
-- 2.19 reviews
-- --------------------------------------------------------------------------
CREATE TABLE reviews (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id   uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  reviewed_id   uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  context_type  text        CHECK (context_type IN ('referral','emergency','listing','general')),
  context_id    uuid,
  rating        int         NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE reviews IS 'Peer reviews between businesses with contextual linking.';


-- --------------------------------------------------------------------------
-- 2.20 verification_submissions
-- --------------------------------------------------------------------------
CREATE TABLE verification_submissions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  document_type   text        NOT NULL
                              CHECK (document_type IN ('business_license','ein_letter',
                                                       'secretary_of_state','utility_bill',
                                                       'insurance_cert','other')),
  document_url    text        NOT NULL,
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','rejected')),
  reviewer_notes  text,
  reviewed_at     timestamptz,
  reviewed_by     uuid        REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE verification_submissions IS 'Business verification document submissions.';


-- --------------------------------------------------------------------------
-- 2.21 connections - business-to-business
-- --------------------------------------------------------------------------
CREATE TABLE connections (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  target_id     uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, target_id)
);

COMMENT ON TABLE connections IS 'Business-to-business connection requests.';


-- --------------------------------------------------------------------------
-- 2.22 notifications
-- --------------------------------------------------------------------------
CREATE TABLE notifications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          text        NOT NULL,
  title         text        NOT NULL,
  body          text,
  data          jsonb       DEFAULT '{}',
  is_read       boolean     DEFAULT false,
  is_push_sent  boolean     DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE notifications IS 'In-app notification store.';

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = false;


-- --------------------------------------------------------------------------
-- 2.23 push_tokens
-- --------------------------------------------------------------------------
CREATE TABLE push_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expo_token  text        NOT NULL,
  device_id   text,
  platform    text        CHECK (platform IN ('ios','android','web')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, expo_token)
);

COMMENT ON TABLE push_tokens IS 'Expo push notification tokens per user device.';


-- ============================================================================
-- 3. TRIGGERS
-- ============================================================================

-- --------------------------------------------------------------------------
-- 3.1 Auto-create profile on auth.users INSERT
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- --------------------------------------------------------------------------
-- 3.2 Auto-create group and membership on business INSERT
-- --------------------------------------------------------------------------
-- When a business is inserted with an industry_id and county_fips, ensure:
--   (a) An industry x county group exists, and the business is a member.
--   (b) A general "Small Business Owners in {county}" group exists (industry_id IS NULL),
--       and the business is a member.
CREATE OR REPLACE FUNCTION handle_new_business()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id     uuid;
  v_general_id   uuid;
  v_county_name  text;
  v_industry_slug text;
BEGIN
  -- Skip if no county assigned
  IF NEW.county_fips IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve county name for general group
  SELECT c.name INTO v_county_name
  FROM counties c
  WHERE c.fips = NEW.county_fips;

  -- (a) Industry-specific group (only if industry_id is set)
  IF NEW.industry_id IS NOT NULL THEN
    SELECT i.slug INTO v_industry_slug
    FROM industries i
    WHERE i.id = NEW.industry_id;

    -- Upsert the industry x county group
    INSERT INTO groups (industry_id, county_fips, name, slug, description)
    VALUES (
      NEW.industry_id,
      NEW.county_fips,
      (SELECT i.name FROM industries i WHERE i.id = NEW.industry_id) || ' in ' || COALESCE(v_county_name, NEW.county_fips),
      COALESCE(v_industry_slug, 'ind') || '-' || NEW.county_fips,
      'Group for ' || (SELECT i.name FROM industries i WHERE i.id = NEW.industry_id) || ' businesses in ' || COALESCE(v_county_name, NEW.county_fips)
    )
    ON CONFLICT (industry_id, county_fips) DO NOTHING
    RETURNING id INTO v_group_id;

    -- If the group already existed, fetch its id
    IF v_group_id IS NULL THEN
      SELECT g.id INTO v_group_id
      FROM groups g
      WHERE g.industry_id = NEW.industry_id AND g.county_fips = NEW.county_fips;
    END IF;

    -- Auto-join the business to the industry group
    INSERT INTO group_memberships (group_id, business_id)
    VALUES (v_group_id, NEW.id)
    ON CONFLICT (group_id, business_id) DO NOTHING;
  END IF;

  -- (b) General county group (industry_id IS NULL)
  INSERT INTO groups (industry_id, county_fips, name, slug, description)
  VALUES (
    NULL,
    NEW.county_fips,
    'Small Business Owners in ' || COALESCE(v_county_name, NEW.county_fips),
    'general-' || NEW.county_fips,
    'A group for all small business owners in ' || COALESCE(v_county_name, NEW.county_fips)
  )
  ON CONFLICT (industry_id, county_fips) DO NOTHING
  RETURNING id INTO v_general_id;

  IF v_general_id IS NULL THEN
    SELECT g.id INTO v_general_id
    FROM groups g
    WHERE g.industry_id IS NULL AND g.county_fips = NEW.county_fips;
  END IF;

  INSERT INTO group_memberships (group_id, business_id)
  VALUES (v_general_id, NEW.id)
  ON CONFLICT (group_id, business_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_business_created
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_business();


-- --------------------------------------------------------------------------
-- 3.3 Update group member_count on membership changes
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE groups SET member_count = member_count - 1 WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_group_membership_change
  AFTER INSERT OR DELETE ON group_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_group_member_count();


-- --------------------------------------------------------------------------
-- 3.4 Update post reply_count on threaded reply INSERT
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_post_reply_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    UPDATE posts SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_post_reply_created
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_reply_count();


-- --------------------------------------------------------------------------
-- 3.5 Update post like_count on post_likes changes
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_post_like_change
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_like_count();


-- --------------------------------------------------------------------------
-- 3.6 Recompute trust_score and review_count on reviews INSERT
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recompute_trust_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg   numeric(3,2);
  v_count int;
BEGIN
  SELECT AVG(rating)::numeric(3,2), COUNT(*)
  INTO v_avg, v_count
  FROM reviews
  WHERE reviewed_id = NEW.reviewed_id;

  UPDATE businesses
  SET trust_score  = COALESCE(v_avg, 0),
      review_count = v_count
  WHERE id = NEW.reviewed_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_created
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION recompute_trust_score();


-- --------------------------------------------------------------------------
-- 3.7 Updated_at timestamp triggers
-- --------------------------------------------------------------------------
CREATE TRIGGER set_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE industries                ENABLE ROW LEVEL SECURITY;
ALTER TABLE counties                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE county_adjacency          ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_responses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_escalation_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_responses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens               ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------------------------
-- 4.1 profiles
-- --------------------------------------------------------------------------
CREATE POLICY profiles_select ON profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY profiles_update ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- --------------------------------------------------------------------------
-- 4.2 industries (read-only reference)
-- --------------------------------------------------------------------------
CREATE POLICY industries_select ON industries
  FOR SELECT TO authenticated
  USING (true);


-- --------------------------------------------------------------------------
-- 4.3 counties (read-only reference)
-- --------------------------------------------------------------------------
CREATE POLICY counties_select ON counties
  FOR SELECT TO authenticated
  USING (true);


-- --------------------------------------------------------------------------
-- 4.4 county_adjacency (read-only reference)
-- --------------------------------------------------------------------------
CREATE POLICY county_adjacency_select ON county_adjacency
  FOR SELECT TO authenticated
  USING (true);


-- --------------------------------------------------------------------------
-- 4.5 businesses
-- --------------------------------------------------------------------------
CREATE POLICY businesses_select ON businesses
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY businesses_insert ON businesses
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY businesses_update ON businesses
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY businesses_delete ON businesses
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());


-- --------------------------------------------------------------------------
-- 4.6 groups (read-only for all authenticated)
-- --------------------------------------------------------------------------
CREATE POLICY groups_select ON groups
  FOR SELECT TO authenticated
  USING (true);


-- --------------------------------------------------------------------------
-- 4.7 group_memberships
-- --------------------------------------------------------------------------
CREATE POLICY group_memberships_select ON group_memberships
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY group_memberships_insert ON group_memberships
  FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id(auth.uid()));

CREATE POLICY group_memberships_delete ON group_memberships
  FOR DELETE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));


-- --------------------------------------------------------------------------
-- 4.8 posts
-- --------------------------------------------------------------------------
-- SELECT: only if user's business is a member of the post's group
CREATE POLICY posts_select ON posts
  FOR SELECT TO authenticated
  USING (
    is_group_member(get_user_business_id(auth.uid()), group_id)
  );

-- INSERT: only if member of the group AND business is verified
CREATE POLICY posts_insert ON posts
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = get_user_business_id(auth.uid())
    AND is_group_member(author_id, group_id)
    AND is_business_verified(author_id)
  );

-- UPDATE: only the author
CREATE POLICY posts_update ON posts
  FOR UPDATE TO authenticated
  USING (author_id = get_user_business_id(auth.uid()))
  WITH CHECK (author_id = get_user_business_id(auth.uid()));

-- DELETE: only the author
CREATE POLICY posts_delete ON posts
  FOR DELETE TO authenticated
  USING (author_id = get_user_business_id(auth.uid()));


-- --------------------------------------------------------------------------
-- 4.9 post_likes
-- --------------------------------------------------------------------------
CREATE POLICY post_likes_select ON post_likes
  FOR SELECT TO authenticated
  USING (
    is_group_member(
      get_user_business_id(auth.uid()),
      (SELECT p.group_id FROM posts p WHERE p.id = post_id)
    )
  );

CREATE POLICY post_likes_insert ON post_likes
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = get_user_business_id(auth.uid())
    AND is_group_member(
      business_id,
      (SELECT p.group_id FROM posts p WHERE p.id = post_id)
    )
  );

CREATE POLICY post_likes_delete ON post_likes
  FOR DELETE TO authenticated
  USING (
    business_id = get_user_business_id(auth.uid())
    AND is_group_member(
      business_id,
      (SELECT p.group_id FROM posts p WHERE p.id = post_id)
    )
  );


-- --------------------------------------------------------------------------
-- 4.10 conversations
-- --------------------------------------------------------------------------
CREATE POLICY conversations_select ON conversations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = id
        AND cp.business_id = get_user_business_id(auth.uid())
    )
  );


-- --------------------------------------------------------------------------
-- 4.11 conversation_participants
-- --------------------------------------------------------------------------
CREATE POLICY conversation_participants_select ON conversation_participants
  FOR SELECT TO authenticated
  USING (
    is_conversation_participant(get_user_business_id(auth.uid()), conversation_id)
  );


-- --------------------------------------------------------------------------
-- 4.12 messages
-- --------------------------------------------------------------------------
CREATE POLICY messages_select ON messages
  FOR SELECT TO authenticated
  USING (
    is_conversation_participant(get_user_business_id(auth.uid()), conversation_id)
  );

CREATE POLICY messages_insert ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = get_user_business_id(auth.uid())
    AND is_conversation_participant(sender_id, conversation_id)
  );


-- --------------------------------------------------------------------------
-- 4.13 emergency_requests
-- --------------------------------------------------------------------------
-- SELECT: all verified businesses
CREATE POLICY emergency_requests_select ON emergency_requests
  FOR SELECT TO authenticated
  USING (is_user_verified(auth.uid()));

-- INSERT: only verified businesses, max 3 active requests
CREATE POLICY emergency_requests_insert ON emergency_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = get_user_business_id(auth.uid())
    AND is_business_verified(requester_id)
    AND (
      SELECT COUNT(*) FROM emergency_requests er
      WHERE er.requester_id = requester_id AND er.status = 'active'
    ) < 3
  );

-- UPDATE: only the requester
CREATE POLICY emergency_requests_update ON emergency_requests
  FOR UPDATE TO authenticated
  USING (requester_id = get_user_business_id(auth.uid()))
  WITH CHECK (requester_id = get_user_business_id(auth.uid()));


-- --------------------------------------------------------------------------
-- 4.14 emergency_responses
-- --------------------------------------------------------------------------
CREATE POLICY emergency_responses_select ON emergency_responses
  FOR SELECT TO authenticated
  USING (
    responder_id = get_user_business_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM emergency_requests er
      WHERE er.id = request_id AND er.requester_id = get_user_business_id(auth.uid())
    )
  );

CREATE POLICY emergency_responses_insert ON emergency_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    responder_id = get_user_business_id(auth.uid())
    AND is_business_verified(responder_id)
  );


-- --------------------------------------------------------------------------
-- 4.15 emergency_escalation_log
-- --------------------------------------------------------------------------
CREATE POLICY emergency_escalation_log_select ON emergency_escalation_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM emergency_requests er
      WHERE er.id = request_id AND er.requester_id = get_user_business_id(auth.uid())
    )
  );


-- --------------------------------------------------------------------------
-- 4.16 listings
-- --------------------------------------------------------------------------
CREATE POLICY listings_select ON listings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY listings_insert ON listings
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = get_user_business_id(auth.uid())
    AND is_business_verified(business_id)
  );

CREATE POLICY listings_update ON listings
  FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()))
  WITH CHECK (business_id = get_user_business_id(auth.uid()));

CREATE POLICY listings_delete ON listings
  FOR DELETE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));


-- --------------------------------------------------------------------------
-- 4.17 listing_responses
-- --------------------------------------------------------------------------
CREATE POLICY listing_responses_select ON listing_responses
  FOR SELECT TO authenticated
  USING (
    business_id = get_user_business_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = listing_id AND l.business_id = get_user_business_id(auth.uid())
    )
  );

CREATE POLICY listing_responses_insert ON listing_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = get_user_business_id(auth.uid())
    AND is_business_verified(business_id)
  );


-- --------------------------------------------------------------------------
-- 4.18 referrals
-- --------------------------------------------------------------------------
CREATE POLICY referrals_select ON referrals
  FOR SELECT TO authenticated
  USING (
    referrer_id = get_user_business_id(auth.uid())
    OR referred_id = get_user_business_id(auth.uid())
    OR referred_to_id = get_user_business_id(auth.uid())
  );

CREATE POLICY referrals_insert ON referrals
  FOR INSERT TO authenticated
  WITH CHECK (
    referrer_id = get_user_business_id(auth.uid())
    AND is_business_verified(referrer_id)
  );


-- --------------------------------------------------------------------------
-- 4.19 reviews
-- --------------------------------------------------------------------------
CREATE POLICY reviews_select ON reviews
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: only verified businesses, cannot review self
CREATE POLICY reviews_insert ON reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = get_user_business_id(auth.uid())
    AND is_business_verified(reviewer_id)
    AND reviewer_id != reviewed_id
  );


-- --------------------------------------------------------------------------
-- 4.20 verification_submissions
-- --------------------------------------------------------------------------
CREATE POLICY verification_submissions_select ON verification_submissions
  FOR SELECT TO authenticated
  USING (
    business_id = get_user_business_id(auth.uid())
  );

CREATE POLICY verification_submissions_insert ON verification_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = get_user_business_id(auth.uid())
  );


-- --------------------------------------------------------------------------
-- 4.21 connections
-- --------------------------------------------------------------------------
CREATE POLICY connections_select ON connections
  FOR SELECT TO authenticated
  USING (
    requester_id = get_user_business_id(auth.uid())
    OR target_id = get_user_business_id(auth.uid())
  );

CREATE POLICY connections_insert ON connections
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = get_user_business_id(auth.uid())
  );

-- UPDATE: only the target (for accept/decline)
CREATE POLICY connections_update ON connections
  FOR UPDATE TO authenticated
  USING (target_id = get_user_business_id(auth.uid()))
  WITH CHECK (target_id = get_user_business_id(auth.uid()));


-- --------------------------------------------------------------------------
-- 4.22 notifications
-- --------------------------------------------------------------------------
CREATE POLICY notifications_select ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notifications_update ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- --------------------------------------------------------------------------
-- 4.23 push_tokens
-- --------------------------------------------------------------------------
CREATE POLICY push_tokens_select ON push_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY push_tokens_insert ON push_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY push_tokens_delete ON push_tokens
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- ============================================================================
-- Done. All tables, indexes, triggers, helper functions, and RLS policies
-- have been created for the BizCircle application.
-- ============================================================================

COMMIT;
