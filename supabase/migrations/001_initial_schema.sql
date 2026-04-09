-- Campaign Companion Phase 1 Schema
-- Run this in your Supabase SQL Editor

-- Profiles: extends auth.users with app-specific data
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('dm', 'player')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  dm_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaign members (join table)
CREATE TABLE campaign_members (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('dm', 'player')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id)
);

-- Sessions: structured session prep data
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  session_number INTEGER NOT NULL,
  subtitle TEXT,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session state: mutable state (puzzle tracker, room notes, etc.)
CREATE TABLE session_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  state_key TEXT NOT NULL,
  state_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, state_key)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_state ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Campaigns
CREATE POLICY "DM full access to own campaigns"
  ON campaigns FOR ALL USING (dm_user_id = auth.uid());

CREATE POLICY "Members can read their campaigns"
  ON campaigns FOR SELECT USING (
    id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid())
  );

-- Campaign members
CREATE POLICY "DM can manage campaign members"
  ON campaign_members FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE dm_user_id = auth.uid())
  );

CREATE POLICY "Members can read their membership"
  ON campaign_members FOR SELECT USING (user_id = auth.uid());

-- Sessions
CREATE POLICY "DM full access to sessions"
  ON sessions FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE dm_user_id = auth.uid())
  );

CREATE POLICY "Members can read sessions"
  ON sessions FOR SELECT USING (
    campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid())
  );

-- Session state
CREATE POLICY "DM full access to session state"
  ON session_state FOR ALL USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN campaigns c ON s.campaign_id = c.id
      WHERE c.dm_user_id = auth.uid()
    )
  );
