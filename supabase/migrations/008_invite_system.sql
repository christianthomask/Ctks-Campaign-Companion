-- 008_invite_system.sql
-- Player invite flow: invite codes on campaigns, join policies

-- Add invite code column
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Allow authenticated users to find campaigns by invite code (for join page)
DO $$ BEGIN
  CREATE POLICY "Anyone can find campaign by invite code"
    ON campaigns FOR SELECT
    USING (invite_code IS NOT NULL AND auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow authenticated users to self-join campaigns via invite
DO $$ BEGIN
  CREATE POLICY "Players can join via invite"
    ON campaign_members FOR INSERT
    WITH CHECK (
      user_id = auth.uid()
      AND role = 'player'
      AND campaign_id IN (
        SELECT id FROM campaigns WHERE invite_code IS NOT NULL
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
