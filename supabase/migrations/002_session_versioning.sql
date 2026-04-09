-- Session versioning support
-- Run this in your Supabase SQL Editor after 001_initial_schema.sql

-- Version history table
CREATE TABLE session_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,
  raw_markdown TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE (session_id, version_number)
);

-- Add versioning columns to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS raw_markdown TEXT;

-- RLS for session_versions
ALTER TABLE session_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DM full access to session versions"
  ON session_versions FOR ALL USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN campaigns c ON s.campaign_id = c.id
      WHERE c.dm_user_id = auth.uid()
    )
  );
