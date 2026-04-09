# Data Update: Switch to 2024 Rules (XPHB)

## Context

The ingestion script currently pulls from 2014-era source tags (`PHB`, `MPMM`, `XGE`, `VGM`, `TCE`). These are outdated. The 2024 Player's Handbook (`XPHB`) is a ground-up revision that changes how character creation works. We are switching to 2024 rules exclusively.

**Do this before any further character creator work.** The 2024 rules change the character creation flow fundamentally.

---

## Step 1: Update the Ingestion Script

File: `scripts/ingest-5etools.ts`

### Source Tag Changes

Replace all source filtering. The **only** accepted source tags should be:

| Tag | Book |
|---|---|
| `XPHB` | 2024 Player's Handbook (primary — all species, classes, backgrounds, spells, feats) |
| `XDMG` | 2024 Dungeon Master's Guide (items, some rules) |
| `XMM` | 2025 Monster Manual (monsters only — for DM reference, not character creator) |
| `FreeRules2024` | Free Basic Rules 2024 (subset of XPHB, may appear as source on some entries) |

Remove all references to: `PHB`, `MPMM`, `XGE`, `VGM`, `TCE`, `DMG`, and any other 2014-era source tags.

### Terminology Change: Race → Species

Throughout the ingestion script and the `ref_races` table:
- Rename table `ref_races` to `ref_species` (new migration)
- Rename all code references from "race" to "species"
- The 5e.tools data for XPHB stores species under the `race` key in the JSON but the display name and all UI should say "Species"

### 2024 Species List (10 total)

The ingestion should produce exactly these species from XPHB:

1. **Aasimar** (subtypes: Celestial legacy choices)
2. **Dragonborn** (subtypes: by dragon color/type)
3. **Dwarf** (subtypes: Duergar, Hill Dwarf, Mountain Dwarf)
4. **Elf** (subtypes: Drow, High Elf, Wood Elf)
5. **Gnome** (subtypes: Forest Gnome, Rock Gnome)
6. **Goliath** (subtypes: by giant ancestry — Cloud, Fire, Frost, Hill, Stone, Storm)
7. **Halfling** (subtypes: Lightfoot, Stout)
8. **Human** (no subtypes)
9. **Orc** (no subtypes)
10. **Tiefling** (subtypes: Abyssal, Chthonic, Infernal)

### Critical Schema Change: Species No Longer Grant Ability Scores

In 2024 rules, species do NOT provide ability score bonuses. Remove `ability_bonuses` from the species data model or leave it null/empty for all XPHB species. Ability score bonuses now come from Backgrounds (see below).

Update `ref_species` (formerly `ref_races`) table:
```sql
-- Migration: rename ref_races to ref_species
ALTER TABLE ref_races RENAME TO ref_species;

-- Remove ability_bonuses column or leave it, but don't populate it for XPHB species
-- Add new fields relevant to 2024 species
ALTER TABLE ref_species ADD COLUMN creature_type TEXT DEFAULT 'Humanoid';
ALTER TABLE ref_species ADD COLUMN subtype_label TEXT; -- e.g., "Dragon Ancestry" for Dragonborn, "Giant Ancestry" for Goliath
```

### 2024 Background Changes

Backgrounds are now **mechanically significant** — they grant ability score bonuses and an origin feat. The `ref_backgrounds` table needs updating:

```sql
ALTER TABLE ref_backgrounds ADD COLUMN ability_score_options TEXT[]; -- e.g., ['strength', 'constitution', 'wisdom']
ALTER TABLE ref_backgrounds ADD COLUMN origin_feat TEXT; -- e.g., 'Alert', 'Magic Initiate'
```

Each 2024 background has:
- 3 associated ability scores (player picks +2/+1 split or +1/+1/+1)
- 2 skill proficiencies
- 1 tool proficiency
- 1 origin feat
- 50 gp starting equipment budget (replaces fixed equipment lists)

The ingestion script should parse these from the XPHB background data.

### 2024 Class Changes

All 12 classes are present in XPHB (no Artificer). Key structural change: **most subclasses are now chosen at level 3** (exceptions: Cleric and Sorcerer at level 1, Warlock at level 1).

The ingestion should:
- Only pull classes with source `XPHB`
- Update the `subclass_level` field to reflect 2024 values
- Pull the 48 XPHB subclasses (4 per class)
- Update class features to 2024 versions

### 2024 Spell Changes

Many spells were revised, renamed, or removed in XPHB. The ingestion should:
- Only pull spells with source `XPHB` (or `FreeRules2024`)
- Some 2014 spells no longer exist in 2024 — don't include them
- Some spells were renamed (e.g., some spells lost named-wizard prefixes like "Tasha's" or "Mordenkainen's")
- Class spell lists changed — verify each spell's `classes` array against XPHB data

### 2024 Feat Changes

Feats are now categorized and have levels. The ingestion should create a `ref_feats` table if one doesn't exist:

```sql
CREATE TABLE IF NOT EXISTS ref_feats (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  category TEXT, -- 'Origin', 'General', 'Fighting Style', 'Epic Boon'
  prerequisite TEXT, -- level requirement, ability score, etc.
  description TEXT NOT NULL,
  repeatable BOOLEAN DEFAULT false
);
```

Origin Feats are chosen as part of Background selection. General Feats are taken at ASI levels. This distinction matters for the character creator.

### 2024 Items/Equipment

The 2024 PHB changes the starting equipment system — instead of class-specific equipment packages, characters get a gold budget based on their background (50 gp for most). The ingestion should:
- Pull items from `XPHB` and/or `XDMG` source
- Include all weapons, armor, and adventuring gear
- Include cost data so the character creator can implement the gold-budget equipment shopping

---

## Step 2: Update Character Creator Flow

### Revised Step Order (matching 2024 PHB)

The 2024 PHB creation order is: Class → Background → Species → Ability Scores. Our wizard should follow this more closely:

| Step | 2024 Flow | Notes |
|---|---|---|
| 0 | Welcome & Campaign Context | Unchanged |
| 1 | Concept (archetype filter) | Unchanged — still useful for new players |
| 2 | **Class** (moved earlier) | Class first — defines identity. Show complexity ratings. |
| 3 | **Background** (moved earlier) | Now mechanically critical — grants ability scores and origin feat |
| 4 | **Species** (was Race) | Renamed. No ability score bonuses — purely flavor + species traits |
| 5 | **Ability Scores** | Now informed by Background's three options. Recommended array should optimize for class using background's bonuses. |
| 6 | Equipment | Gold budget system (50 gp) instead of fixed packages |
| 7 | Spells (casters only) | Updated spell lists from XPHB |
| 8 | Backstory & Details | Unchanged |
| 9 | Review & Finalize | Unchanged |

### UI Terminology

All references in the app must use 2024 terminology:
- "Race" → **"Species"** everywhere (UI labels, variable names, database columns, component names)
- "Racial bonus" → **"Species trait"**
- "Ability Score Increase" on species → **removed** (not a thing in 2024)
- "Origin Feat" → new concept, shown during Background selection

### Ability Score Step Changes

The ability score step must know which Background was chosen because:
1. The Background defines **which three ability scores** the player can boost
2. The player chooses either +2/+1 across two of the three, or +1/+1/+1 across all three
3. The Recommended Array should pre-assign the +2 to the class's primary ability (if it's one of the background's three options)

### Equipment Step Changes

Instead of "Choose option A or B" from class equipment lists:
1. Show the player's gold budget (typically 50 gp from background)
2. Present a shopping interface with items from `ref_items`
3. Auto-suggest a "recommended loadout" based on class (e.g., Fighter → chain mail + longsword + shield = 48 gp)
4. Let players buy whatever they want within budget
5. Calculate remaining gold

---

## Step 3: Wipe and Re-seed

After updating the ingestion script:
1. **Truncate all ref_ tables** — clean slate
2. Run the updated ingestion script
3. Verify counts match expectations:
   - `ref_species`: ~10 base species + subtypes
   - `ref_classes`: 12 classes
   - `ref_subclasses`: ~48 subclasses
   - `ref_backgrounds`: ~16 backgrounds
   - `ref_spells`: varies but should be all XPHB spells
   - `ref_feats`: ~75 feats
   - `ref_items`: all XPHB weapons, armor, gear

Log the counts after ingestion for verification.

---

## Step 4: Update Computed Stats Utility

File: `src/lib/utils/characterStats.ts`

Update the stat computation to reflect 2024 rules:
- Ability score bonuses come from `character.background_id` → look up `ref_backgrounds.ability_score_options`
- Species traits no longer include ability modifiers
- Origin feat from background should be listed in character features
- Proficiency bonus unchanged (still level-based)
- HP calculation unchanged (hit die + Con mod at level 1)

---

## Migration Summary

New SQL migration file: `supabase/migrations/006_2024_rules_update.sql`

```sql
-- Rename ref_races to ref_species
ALTER TABLE IF EXISTS ref_races RENAME TO ref_species;

-- Add 2024-specific columns to ref_species
ALTER TABLE ref_species ADD COLUMN IF NOT EXISTS creature_type TEXT DEFAULT 'Humanoid';
ALTER TABLE ref_species ADD COLUMN IF NOT EXISTS subtype_label TEXT;

-- Update ref_backgrounds for 2024 rules
ALTER TABLE ref_backgrounds ADD COLUMN IF NOT EXISTS ability_score_options TEXT[];
ALTER TABLE ref_backgrounds ADD COLUMN IF NOT EXISTS origin_feat TEXT;

-- Create ref_feats table
CREATE TABLE IF NOT EXISTS ref_feats (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  category TEXT,
  level_requirement INTEGER,
  prerequisite TEXT,
  description TEXT NOT NULL,
  repeatable BOOLEAN DEFAULT false,
  ability_score_options TEXT[]
);

ALTER TABLE ref_feats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON ref_feats FOR SELECT USING (true);

-- Update characters table: race_id → species_id
ALTER TABLE characters RENAME COLUMN race_id TO species_id;

-- Add background ability score tracking
ALTER TABLE characters ADD COLUMN IF NOT EXISTS ability_score_method_detail JSONB;
-- Stores: which background scores were chosen, how they were distributed (+2/+1 vs +1/+1/+1)

-- Truncate ref tables for clean re-seed
TRUNCATE ref_species CASCADE;
TRUNCATE ref_classes CASCADE;
TRUNCATE ref_subclasses CASCADE;
TRUNCATE ref_backgrounds CASCADE;
TRUNCATE ref_spells CASCADE;
TRUNCATE ref_items CASCADE;
TRUNCATE ref_conditions CASCADE;
```

---

## Important Notes

- **5e.tools XPHB data structure may differ from PHB data.** The ingestion script will likely need adjustments to field names, nesting, and how traits/features are represented. Inspect the raw JSON from `https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/` before assuming field names match.
- **Test with a single data type first** (species is smallest — only 10 entries). Get that working, then move to classes, backgrounds, spells.
- **Some XPHB entries may reference other XPHB entries** (e.g., a background's origin feat references a feat by name). Make sure feats are ingested before backgrounds, or handle references gracefully.
- **The 2024 Monster Manual uses source tag `XMM`.** If you want to ingest monsters for DM reference, include that source. Not needed for the character creator.
