-- 007_handout_improvements.sql
-- Handout system improvements: staged reveals, image storage, read tracking, categories

-- Add stage column (draft → staged → published)
ALTER TABLE handouts ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'draft'
  CHECK (stage IN ('draft', 'staged', 'published'));

-- Migrate existing data
UPDATE handouts SET stage = 'published' WHERE published_at IS NOT NULL AND stage = 'draft';

-- Image storage fields
ALTER TABLE handouts ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE handouts ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Category for organization
ALTER TABLE handouts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Read tracking table
CREATE TABLE IF NOT EXISTS handout_reads (
  handout_id UUID NOT NULL REFERENCES handouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (handout_id, user_id)
);

ALTER TABLE handout_reads ENABLE ROW LEVEL SECURITY;

-- Users can track their own reads
DO $$ BEGIN
  CREATE POLICY "Users can manage own reads"
    ON handout_reads FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DM can view read status for their campaign handouts
DO $$ BEGIN
  CREATE POLICY "DM can view read status"
    ON handout_reads FOR SELECT USING (
      handout_id IN (
        SELECT h.id FROM handouts h
        JOIN campaigns c ON h.campaign_id = c.id
        WHERE c.dm_user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enable realtime for handouts
ALTER PUBLICATION supabase_realtime ADD TABLE handouts;
