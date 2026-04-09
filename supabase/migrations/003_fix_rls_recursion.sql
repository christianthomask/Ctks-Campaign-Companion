-- Fix infinite recursion in campaigns/campaign_members RLS policies
-- The circular reference between campaigns and campaign_members causes
-- "infinite recursion detected in policy" errors on INSERT.

-- Drop the problematic policies
DROP POLICY IF EXISTS "DM full access to own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Members can read their campaigns" ON campaigns;
DROP POLICY IF EXISTS "DM can manage campaign members" ON campaign_members;
DROP POLICY IF EXISTS "Members can read their membership" ON campaign_members;

-- Recreate campaigns policies — split ALL into separate operations
-- INSERT: any authenticated user can create a campaign where they are the DM
CREATE POLICY "DM can insert own campaigns"
  ON campaigns FOR INSERT WITH CHECK (dm_user_id = auth.uid());

-- SELECT: DM can see own campaigns, members can see theirs
CREATE POLICY "DM can read own campaigns"
  ON campaigns FOR SELECT USING (dm_user_id = auth.uid());

CREATE POLICY "Members can read their campaigns"
  ON campaigns FOR SELECT USING (
    id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid())
  );

-- UPDATE/DELETE: only the DM
CREATE POLICY "DM can update own campaigns"
  ON campaigns FOR UPDATE USING (dm_user_id = auth.uid());

CREATE POLICY "DM can delete own campaigns"
  ON campaigns FOR DELETE USING (dm_user_id = auth.uid());

-- Recreate campaign_members policies — avoid referencing campaigns table
CREATE POLICY "Users can read own memberships"
  ON campaign_members FOR SELECT USING (user_id = auth.uid());

-- For INSERT/UPDATE/DELETE on campaign_members, check campaign ownership
-- Use a direct dm_user_id check to avoid circular reference
CREATE POLICY "DM can manage members of own campaigns"
  ON campaign_members FOR INSERT WITH CHECK (
    campaign_id IN (SELECT id FROM campaigns WHERE dm_user_id = auth.uid())
  );

CREATE POLICY "DM can update members of own campaigns"
  ON campaign_members FOR UPDATE USING (
    campaign_id IN (SELECT id FROM campaigns WHERE dm_user_id = auth.uid())
  );

CREATE POLICY "DM can delete members of own campaigns"
  ON campaign_members FOR DELETE USING (
    campaign_id IN (SELECT id FROM campaigns WHERE dm_user_id = auth.uid())
  );
