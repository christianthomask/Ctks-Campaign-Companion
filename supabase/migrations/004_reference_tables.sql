-- 004_reference_tables.sql
-- 5e.tools reference data tables, characters table, and handouts table.
-- Reference tables use TEXT primary keys (slugified identifiers like "half-elf", "fireball").
-- All ref_* tables are public-read for authenticated users.
-- Characters are user-owned with DM read access.
-- Handouts are DM-managed with published visibility to players.

-- ============================================================
-- Reference Tables
-- ============================================================

-- Races (includes subraces via parent_race_id self-reference)
CREATE TABLE ref_races (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT,
  parent_race_id TEXT REFERENCES ref_races(id),
  ability_bonuses JSONB DEFAULT '{}',
  size TEXT,
  speed INTEGER DEFAULT 30,
  darkvision INTEGER DEFAULT 0,
  traits JSONB DEFAULT '[]',
  languages TEXT[] DEFAULT '{}',
  flavor_text TEXT,
  image_url TEXT
);

-- Classes
CREATE TABLE ref_classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT,
  hit_die INTEGER NOT NULL,
  primary_abilities TEXT[] DEFAULT '{}',
  saving_throw_proficiencies TEXT[] DEFAULT '{}',
  armor_proficiencies TEXT[] DEFAULT '{}',
  weapon_proficiencies TEXT[] DEFAULT '{}',
  tool_proficiencies TEXT[] DEFAULT '{}',
  skill_choices JSONB DEFAULT '{}',
  starting_equipment JSONB DEFAULT '[]',
  features_by_level JSONB DEFAULT '{}',
  spellcasting JSONB,
  subclass_level INTEGER,
  flavor_text TEXT,
  archetype TEXT CHECK (archetype IN ('martial', 'caster', 'hybrid', 'skill'))
);

-- Subclasses
CREATE TABLE ref_subclasses (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES ref_classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source TEXT,
  features_by_level JSONB DEFAULT '{}',
  flavor_text TEXT
);

-- Backgrounds
CREATE TABLE ref_backgrounds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT,
  skill_proficiencies TEXT[] DEFAULT '{}',
  tool_proficiencies TEXT[] DEFAULT '{}',
  languages_choice INTEGER DEFAULT 0,
  equipment JSONB DEFAULT '[]',
  feature_name TEXT,
  feature_description TEXT,
  personality_traits TEXT[] DEFAULT '{}',
  ideals TEXT[] DEFAULT '{}',
  bonds TEXT[] DEFAULT '{}',
  flaws TEXT[] DEFAULT '{}',
  flavor_text TEXT
);

-- Spells
CREATE TABLE ref_spells (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT,
  level INTEGER NOT NULL DEFAULT 0,
  school TEXT,
  casting_time TEXT,
  range TEXT,
  duration TEXT,
  concentration BOOLEAN DEFAULT false,
  ritual BOOLEAN DEFAULT false,
  components TEXT,
  classes TEXT[] DEFAULT '{}',
  description TEXT,
  higher_levels TEXT,
  damage_type TEXT,
  save_type TEXT
);

-- Items (weapons, armor, gear, tools, packs)
CREATE TABLE ref_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT,
  type TEXT CHECK (type IN ('weapon', 'armor', 'gear', 'tool', 'pack')),
  cost TEXT,
  weight NUMERIC,
  properties JSONB DEFAULT '[]',
  damage TEXT,
  damage_type TEXT,
  ac_base INTEGER,
  ac_dex_bonus BOOLEAN DEFAULT false,
  ac_max_dex INTEGER,
  strength_requirement INTEGER,
  stealth_disadvantage BOOLEAN DEFAULT false,
  description TEXT,
  pack_contents TEXT[] DEFAULT '{}'
);

-- Conditions
CREATE TABLE ref_conditions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT
);

-- ============================================================
-- Characters Table
-- ============================================================

CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'complete')),

  -- Reference links
  race_id TEXT REFERENCES ref_races(id),
  class_id TEXT REFERENCES ref_classes(id),
  subclass_id TEXT REFERENCES ref_subclasses(id),
  background_id TEXT REFERENCES ref_backgrounds(id),

  -- Progression
  level INTEGER NOT NULL DEFAULT 1,
  experience_points INTEGER DEFAULT 0,

  -- Ability scores (base values before racial/feat bonuses)
  str_base INTEGER,
  dex_base INTEGER,
  con_base INTEGER,
  int_base INTEGER,
  wis_base INTEGER,
  cha_base INTEGER,
  ability_score_method TEXT,

  -- Proficiencies
  skill_proficiencies TEXT[] DEFAULT '{}',
  tool_proficiencies TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',

  -- Inventory
  equipment JSONB DEFAULT '[]',
  currency JSONB DEFAULT '{"cp":0,"sp":0,"ep":0,"gp":0,"pp":0}',

  -- Spellcasting
  cantrips_known TEXT[] DEFAULT '{}',
  spells_known TEXT[] DEFAULT '{}',
  spells_prepared TEXT[] DEFAULT '{}',
  spell_slots_used JSONB DEFAULT '{}',

  -- Combat / HP
  hp_current INTEGER,
  hp_max INTEGER,
  hp_temp INTEGER DEFAULT 0,
  hit_dice_used INTEGER DEFAULT 0,
  death_save_successes INTEGER DEFAULT 0,
  death_save_failures INTEGER DEFAULT 0,

  -- Roleplay
  personality_traits TEXT,
  ideals TEXT,
  bonds TEXT,
  flaws TEXT,
  backstory TEXT,
  appearance TEXT,
  book_donation TEXT,
  motivation TEXT,
  notes TEXT,
  portrait_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Handouts Table
-- ============================================================

CREATE TABLE handouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('markdown', 'image', 'text')),
  content TEXT NOT NULL,
  image_url TEXT,
  published_at TIMESTAMPTZ,
  session_id UUID REFERENCES sessions(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Alter existing tables
-- ============================================================

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS recommendations JSONB DEFAULT '{}';

-- ============================================================
-- Indexes
-- ============================================================

-- Full-text search on spells (name + description)
CREATE INDEX idx_ref_spells_fts ON ref_spells
  USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Full-text search on items (name + description)
CREATE INDEX idx_ref_items_fts ON ref_items
  USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Lookup indexes for common query patterns
CREATE INDEX idx_ref_subclasses_class_id ON ref_subclasses(class_id);
CREATE INDEX idx_ref_races_parent ON ref_races(parent_race_id);
CREATE INDEX idx_ref_spells_level ON ref_spells(level);
CREATE INDEX idx_ref_spells_school ON ref_spells(school);
CREATE INDEX idx_ref_items_type ON ref_items(type);

CREATE INDEX idx_characters_user_id ON characters(user_id);
CREATE INDEX idx_characters_campaign_id ON characters(campaign_id);
CREATE INDEX idx_characters_user_campaign ON characters(user_id, campaign_id);

CREATE INDEX idx_handouts_campaign_id ON handouts(campaign_id);
CREATE INDEX idx_handouts_session_id ON handouts(session_id);
CREATE INDEX idx_handouts_published ON handouts(campaign_id, published_at)
  WHERE published_at IS NOT NULL;

-- ============================================================
-- Row Level Security — Reference Tables (public read for authenticated)
-- ============================================================

ALTER TABLE ref_races ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_subclasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_spells ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_conditions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all reference data
CREATE POLICY "Authenticated users can read races"
  ON ref_races FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read classes"
  ON ref_classes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read subclasses"
  ON ref_subclasses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read backgrounds"
  ON ref_backgrounds FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read spells"
  ON ref_spells FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read items"
  ON ref_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read conditions"
  ON ref_conditions FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- Row Level Security — Characters
-- ============================================================

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Players can read their own characters
CREATE POLICY "Players can read own characters"
  ON characters FOR SELECT
  USING (auth.uid() = user_id);

-- Players can insert characters they own
CREATE POLICY "Players can insert own characters"
  ON characters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Players can update their own characters
CREATE POLICY "Players can update own characters"
  ON characters FOR UPDATE
  USING (auth.uid() = user_id);

-- Players can delete their own characters
CREATE POLICY "Players can delete own characters"
  ON characters FOR DELETE
  USING (auth.uid() = user_id);

-- DM can view all characters in campaigns they run
CREATE POLICY "DM can view campaign characters"
  ON characters FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE dm_user_id = auth.uid()
    )
  );

-- ============================================================
-- Row Level Security — Handouts
-- ============================================================

ALTER TABLE handouts ENABLE ROW LEVEL SECURITY;

-- DM has full access to handouts in their campaigns
CREATE POLICY "DM can insert campaign handouts"
  ON handouts FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DM can read campaign handouts"
  ON handouts FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DM can update campaign handouts"
  ON handouts FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DM can delete campaign handouts"
  ON handouts FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE dm_user_id = auth.uid()
    )
  );

-- Players can read published handouts for campaigns they belong to
CREATE POLICY "Players can read published handouts"
  ON handouts FOR SELECT
  USING (
    published_at IS NOT NULL
    AND campaign_id IN (
      SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- Updated_at triggers for new tables
-- ============================================================

-- Reusable trigger function (may already exist from earlier migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
