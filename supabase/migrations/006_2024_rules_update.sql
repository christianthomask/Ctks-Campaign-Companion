-- 006_2024_rules_update.sql
-- Switch to 2024 PHB (XPHB) rules
-- Run AFTER 004_reference_tables.sql and 005_profile_count_function.sql

-- ============================================================
-- Rename ref_races → ref_species
-- ============================================================

ALTER TABLE IF EXISTS ref_races RENAME TO ref_species;

-- Add 2024-specific columns to ref_species
ALTER TABLE ref_species ADD COLUMN IF NOT EXISTS creature_type TEXT DEFAULT 'Humanoid';
ALTER TABLE ref_species ADD COLUMN IF NOT EXISTS subtype_label TEXT;

-- ============================================================
-- Update ref_backgrounds for 2024 rules
-- ============================================================

-- In 2024, backgrounds grant ability score bonuses and an origin feat
ALTER TABLE ref_backgrounds ADD COLUMN IF NOT EXISTS ability_score_options TEXT[];
ALTER TABLE ref_backgrounds ADD COLUMN IF NOT EXISTS origin_feat TEXT;

-- ============================================================
-- Create ref_feats table
-- ============================================================

CREATE TABLE IF NOT EXISTS ref_feats (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  category TEXT, -- 'Origin', 'General', 'Fighting Style', 'Epic Boon'
  level_requirement INTEGER,
  prerequisite TEXT,
  description TEXT NOT NULL,
  repeatable BOOLEAN DEFAULT false,
  ability_score_options TEXT[]
);

ALTER TABLE ref_feats ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to avoid error on re-run
DO $$ BEGIN
  CREATE POLICY "Public read access to ref_feats"
    ON ref_feats FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Update characters table: race_id → species_id
-- ============================================================

ALTER TABLE characters RENAME COLUMN race_id TO species_id;

-- Track background ability score distribution
ALTER TABLE characters ADD COLUMN IF NOT EXISTS ability_score_method_detail JSONB;

-- ============================================================
-- Truncate ref tables for clean re-seed with 2024 data
-- ============================================================

TRUNCATE ref_species CASCADE;
TRUNCATE ref_classes CASCADE;
TRUNCATE ref_subclasses CASCADE;
TRUNCATE ref_backgrounds CASCADE;
TRUNCATE ref_spells CASCADE;
TRUNCATE ref_items CASCADE;
TRUNCATE ref_conditions CASCADE;
