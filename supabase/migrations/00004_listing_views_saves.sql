-- ============================================================================
-- Migration: Listing Views & Saves
-- Adds view_count and save_count to listings, creates listing_saves table,
-- trigger for save_count, RPC for view increment, and RLS policies.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Add columns to listings
-- --------------------------------------------------------------------------
ALTER TABLE listings ADD COLUMN view_count  integer NOT NULL DEFAULT 0;
ALTER TABLE listings ADD COLUMN save_count  integer NOT NULL DEFAULT 0;


-- --------------------------------------------------------------------------
-- 2. listing_saves table (mirrors post_likes)
-- --------------------------------------------------------------------------
CREATE TABLE listing_saves (
  listing_id  uuid        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  business_id uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, business_id)
);

COMMENT ON TABLE listing_saves IS 'Tracks saves/bookmarks on marketplace listings.';


-- --------------------------------------------------------------------------
-- 3. Trigger: auto-update save_count (mirrors update_post_like_count)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_listing_save_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE listings SET save_count = save_count + 1 WHERE id = NEW.listing_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE listings SET save_count = save_count - 1 WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_listing_save_change
  AFTER INSERT OR DELETE ON listing_saves
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_save_count();


-- --------------------------------------------------------------------------
-- 4. RPC: increment_listing_views (avoids needing write RLS on listings)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_listing_views(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE listings SET view_count = view_count + 1 WHERE id = p_listing_id;
END;
$$;


-- --------------------------------------------------------------------------
-- 5. Enable RLS on listing_saves
-- --------------------------------------------------------------------------
ALTER TABLE listing_saves ENABLE ROW LEVEL SECURITY;


-- --------------------------------------------------------------------------
-- 6. RLS policies for listing_saves
-- --------------------------------------------------------------------------
-- SELECT: any authenticated user can read saves
CREATE POLICY listing_saves_select ON listing_saves
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: authenticated users can save (business_id must be their own)
CREATE POLICY listing_saves_insert ON listing_saves
  FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id(auth.uid()));

-- DELETE: authenticated users can unsave their own saves
CREATE POLICY listing_saves_delete ON listing_saves
  FOR DELETE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));
