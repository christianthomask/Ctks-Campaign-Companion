# Feature Spec: Character Creator

## Overview

A guided step-by-step character creation wizard that helps new players build a D&D 5E character from scratch while letting veterans move quickly. Uses full 5e.tools data for races, classes, backgrounds, spells, and equipment. Supports DM-curated recommendations per campaign.

Players access the character creator from their dashboard after logging in. They must complete it before session 1.

## Prerequisites

### 5e.tools Data Ingestion

The character creator depends on reference data from 5e.tools. This must be built first.

**Data source:** 5e.tools publishes structured JSON on GitHub at `https://github.com/5etools-mirror-3/5etools-src` in the `data/` directory.

**Required data files:**
| File(s) | Content | Tables |
|---|---|---|
| `data/races.json` + `data/fluff-races.json` | All races and subraces with traits, ability bonuses, flavor text | `ref_races` |
| `data/classes/` (directory of per-class files) + `data/fluff-classes.json` | All classes with features, hit dice, proficiencies, subclasses, flavor text | `ref_classes` |
| `data/backgrounds.json` + `data/fluff-backgrounds.json` | All backgrounds with proficiencies, equipment, features, personality tables | `ref_backgrounds` |
| `data/spells/` (directory of per-source files) | All spells with full details | `ref_spells` |
| `data/items.json` + `data/basicitems.json` | Weapons, armor, adventuring gear, packs | `ref_items` |
| `data/conditionsdiseases.json` | Conditions reference (also used for cheat sheets) | `ref_conditions` |

**Ingestion approach:**
1. Build a seed script (`scripts/ingest-5etools.ts`) that:
   - Fetches the JSON files from the 5e.tools GitHub mirror (raw content URLs)
   - Normalizes the data into our table schemas
   - Upserts into Supabase reference tables
   - Can be re-run to update when 5e.tools data changes
2. The script runs locally or as a one-time server action — NOT on every request
3. Reference tables are read-only in the app (no user writes)

**Reference table schemas:**

```sql
-- Races
CREATE TABLE ref_races (
  id TEXT PRIMARY KEY,              -- slug: 'elf', 'high-elf'
  name TEXT NOT NULL,
  source TEXT NOT NULL,             -- 'PHB', 'XGE', etc.
  parent_race_id TEXT,              -- null for base races, parent slug for subraces
  ability_bonuses JSONB,            -- [{ability: 'dex', bonus: 2}]
  size TEXT,
  speed INTEGER,
  darkvision INTEGER,
  traits JSONB,                     -- [{name, description}]
  languages TEXT[],
  flavor_text TEXT,
  image_url TEXT
);

-- Classes  
CREATE TABLE ref_classes (
  id TEXT PRIMARY KEY,              -- slug: 'fighter', 'wizard'
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  hit_die INTEGER,                  -- 8, 10, 12, etc.
  primary_abilities TEXT[],         -- ['strength', 'constitution']
  saving_throw_proficiencies TEXT[],
  armor_proficiencies TEXT[],
  weapon_proficiencies TEXT[],
  tool_proficiencies TEXT[],
  skill_choices JSONB,              -- {choose: 2, from: ['athletics', 'acrobatics', ...]}
  starting_equipment JSONB,         -- structured equipment options
  features_by_level JSONB,          -- [{level: 1, name, description}]
  spellcasting JSONB,               -- null for non-casters, {ability, cantrips_known, spells_known_or_prepared, spell_slots}
  subclass_level INTEGER,           -- level at which subclass is chosen
  flavor_text TEXT,
  archetype TEXT                    -- 'martial', 'caster', 'hybrid', 'skill' (for Step 1 filtering)
);

-- Subclasses
CREATE TABLE ref_subclasses (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES ref_classes(id),
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  features_by_level JSONB,
  flavor_text TEXT
);

-- Backgrounds
CREATE TABLE ref_backgrounds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  skill_proficiencies TEXT[],
  tool_proficiencies TEXT[],
  languages_choice INTEGER,         -- number of languages to choose
  equipment JSONB,
  feature_name TEXT,
  feature_description TEXT,
  personality_traits TEXT[],        -- d8 table
  ideals TEXT[],                    -- d6 table
  bonds TEXT[],                     -- d6 table
  flaws TEXT[],                     -- d6 table
  flavor_text TEXT
);

-- Spells
CREATE TABLE ref_spells (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  level INTEGER NOT NULL,           -- 0 for cantrips
  school TEXT NOT NULL,
  casting_time TEXT,
  range TEXT,
  duration TEXT,
  concentration BOOLEAN DEFAULT false,
  ritual BOOLEAN DEFAULT false,
  components TEXT,                  -- 'V, S, M (a tiny ball of bat guano)'
  classes TEXT[],
  description TEXT NOT NULL,
  higher_levels TEXT,
  damage_type TEXT,
  save_type TEXT
);

-- Items
CREATE TABLE ref_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  type TEXT,                        -- 'weapon', 'armor', 'gear', 'tool', 'pack'
  cost TEXT,
  weight REAL,
  properties JSONB,                 -- weapon/armor properties
  damage TEXT,                      -- weapon damage
  damage_type TEXT,
  ac_base INTEGER,                  -- armor AC
  ac_dex_bonus BOOLEAN,
  ac_max_dex INTEGER,
  strength_requirement INTEGER,
  stealth_disadvantage BOOLEAN,
  description TEXT,
  pack_contents TEXT[]              -- for equipment packs
);

-- Conditions (for cheat sheets too)
CREATE TABLE ref_conditions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT
);
```

**RLS for reference tables:** Public read access (no auth required for viewing reference data). No write access via client — ingestion runs server-side.

```sql
CREATE POLICY "Public read access" ON ref_races FOR SELECT USING (true);
-- Repeat for all ref_ tables
```

### DM Recommendation System

**Campaign settings table addition:**

```sql
ALTER TABLE campaigns ADD COLUMN recommendations JSONB DEFAULT '{}';
```

The `recommendations` object structure:
```json
{
  "races": [
    { "id": "human", "note": "Common throughout the Sword Coast" },
    { "id": "half-elf", "note": "Great fit for Candlekeep's diverse community" }
  ],
  "classes": [
    { "id": "wizard", "note": "You're going to a library — wizards thrive here" },
    { "id": "rogue", "note": "Investigation and puzzle-solving play to your strengths" }
  ],
  "backgrounds": [
    { "id": "sage", "note": "Natural fit for a Candlekeep campaign" },
    { "id": "acolyte", "note": "Oghma has a temple at Candlekeep" }
  ],
  "ability_score_method": "all",
  "starting_level": 1
}
```

The DM sets recommendations via a simple config page in the DM dashboard. For now, this can be a JSON editor or a checklist UI — nothing fancy. The character creator reads these and surfaces recommended options with a badge and the DM's note.

---

## Character Creator Flow

### Page: `/player/character/create`

The wizard is a single page with step navigation. Each step is a panel that slides in. A progress bar shows completion. Players can navigate back to previous steps freely. Forward navigation requires the current step to be complete.

A persistent preview sidebar (desktop) or collapsible panel (mobile) shows the character sheet building up in real-time as choices are made.

---

### Step 0: Welcome & Campaign Context

**Purpose:** Set the scene. Get the player excited about the world they're entering.

**Content:** A condensed, app-formatted version of the player brief we authored:
- The world of Faerûn (2-3 paragraphs)
- The Sword Coast (key locations, evocative one-liners)
- Candlekeep (what it is, why you're going)
- The book-donation prompt: "Think about what book your character brings. We'll ask about this later."

**UI:** Full-width reading panel. Atmospheric background. "Next: Build Your Character →" button at the bottom.

**No selections required.** This step is informational. Players can skip it with a "Skip intro" link.

---

### Step 1: Concept — "What kind of hero are you?"

**Purpose:** Pre-filter the class list so new players aren't overwhelmed by 13+ options.

**UI:** 4-5 archetype cards, each with:
- An evocative title (not game terms)
- A 1-2 sentence description
- A thematic icon or color
- A list of classes this maps to (shown small, below the description)

**Archetype Cards:**

| Card Title | Description | Maps To |
|---|---|---|
| **Warrior** | "You solve problems with steel and courage. You're tough, direct, and dangerous in a fight." | Fighter, Barbarian, Paladin |
| **Scoundrel** | "You live by your wits. Quick hands, sharp eyes, and a talent for being where you shouldn't." | Rogue, Ranger, Bard |
| **Arcanist** | "You bend reality with knowledge and will. Magic is your tool, your weapon, and your obsession." | Wizard, Sorcerer, Warlock |
| **Devotee** | "Your power comes from something greater — faith, nature, or a bond with the living world." | Cleric, Druid, Monk |
| **Polymath** | "You're a little bit of everything. Versatile, adaptable, hard to pin down." | Bard, Ranger, Artificer (if available) |

**Below the cards:** "I know what I want → Show me all classes" link for veterans. This skips Step 1 and shows the full unfiltered class list in Step 3.

**Selection:** Tapping a card highlights it and enables "Next →". The selected archetype filters the class list in Step 3.

---

### Step 2: Race

**Purpose:** Choose a race (and subrace if applicable).

**UI:** 
- **DM Recommended** section at top (if any) — highlighted cards with DM's note shown as a small badge
- **All Races** section below, organized alphabetically or by source book
- Search/filter bar at top
- Each race is a card showing:
  - Race name and source book tag
  - One-paragraph flavor text
  - Plain-language trait summary: "Darkvision (60 ft.), advantage on saves against being charmed, you don't need to sleep"
  - Ability score bonuses shown clearly: "+2 Dexterity, +1 Intelligence"
- Tapping a race card expands it to show full details and subrace options
- Subraces appear as sub-cards within the expanded race

**On selection:** The race's traits, ability bonuses, and languages are added to the character preview.

---

### Step 3: Class

**Purpose:** Choose a class.

**UI:**
- If Step 1 archetype was selected: only matching classes shown, with a "Show all classes" toggle
- If Step 1 was skipped: all classes shown
- **DM Recommended** section at top
- Each class card shows:
  - Class name and source
  - Flavor text (1-2 sentences)
  - **"What it feels like to play"** — a plain-language paragraph describing the gameplay experience: "As a Fighter, you'll always know what to do on your turn. You hit things, and you're very good at it. You have the most HP in the party and you'll be the one standing between your friends and danger."
  - Hit die (with explanation: "d10 means you're tough — above average HP")
  - Primary abilities: "Strength and Constitution are your most important stats"
  - Key level 1 features summarized
  - Spellcasting indicator: "Full caster", "Half caster", "No spells"
  - **Complexity rating:** ★ (straightforward) to ★★★ (many options to manage). New player guidance: "If this is your first time, ★ classes are a great place to start."
    - ★: Fighter, Barbarian, Rogue
    - ★★: Ranger, Paladin, Monk, Warlock, Bard  
    - ★★★: Wizard, Sorcerer, Cleric, Druid, Artificer

**On selection:** Hit die, saving throws, proficiencies, and features added to character preview. Skill choices happen inline — "Choose 2 skills from this list" with checkboxes.

---

### Step 4: Ability Scores

**Purpose:** Determine the six ability scores.

**UI:** Three tabs at the top for the method:

#### Tab: Recommended Array (default tab)
Pre-assigned standard array (15, 14, 13, 12, 10, 8) with **intelligent defaults**: the two highest scores are pre-assigned to the class's primary abilities. The remaining four are distributed reasonably.

- Shows all six scores in a row with the ability name, score, and resulting modifier
- Drag-and-drop or tap-to-swap interface to rearrange if the player wants to tweak
- "These are good defaults for a [Class]. You can rearrange them or try a different method." 
- Racial bonuses shown as a separate "+2" badge on the relevant ability

#### Tab: Point Buy
- Start with all 8s, 27 points to spend
- Interactive +/- buttons for each ability (range 8-15)
- Point cost shown: 8→9 costs 1, 13→14 costs 2, 14→15 costs 2
- Points remaining counter prominently displayed
- Racial bonuses applied automatically and shown separately
- "Optimize for [Class]" button that auto-sets a point buy spread for their class

#### Tab: Roll
- "Roll 4d6 drop lowest" button for each ability score
- Animated dice roll result
- Drag-and-drop to assign rolled values to abilities
- "Reroll all" button (unlimited — this is for fun, not a casino)
- Racial bonuses applied after assignment

**On completion:** All six abilities, modifiers, racial bonuses, and derived stats (initiative, passive perception) calculated and shown in preview.

---

### Step 5: Background

**Purpose:** Choose a background, which provides skill proficiencies, equipment, a feature, and personality prompts.

**UI:**
- **DM Recommended** at top
- All backgrounds listed as cards
- Search/filter
- Each card shows:
  - Name and source
  - Flavor text
  - Skill proficiencies granted
  - Equipment granted
  - Feature name and one-line summary
- On selection, expanded view includes:
  - Full feature description
  - **Personality traits** table (d8): "Roll or choose" with a dice button and selectable list
  - **Ideals** table (d6): same
  - **Bonds** table (d6): same
  - **Flaws** table (d6): same
  - "Write your own" text fields for each if they don't want table results

**On selection:** Proficiencies, equipment, feature, and personality added to preview.

---

### Step 6: Equipment

**Purpose:** Select starting equipment from class and background options.

**UI:**
- Background equipment shown as a fixed list ("You get these from your background")
- Class equipment shown as choice groups: "Choose one: (a) chain mail or (b) leather armor, longbow, and 20 arrows"
- Each choice is a clear A/B (sometimes A/B/C) card selection
- Item names are tappable — shows a tooltip/popup with full item description, damage, properties
- **Armor auto-calculates AC** and updates the preview immediately
- **Weapon details** shown inline: damage die, properties (finesse, light, etc.)
- Total weight calculated if carrying capacity matters

**On completion:** Full equipment list, AC, and weapon attacks added to preview.

---

### Step 7: Spells (Casters Only)

**Purpose:** Choose cantrips and prepared/known spells for spellcasting classes.

**Shown only if the class has spellcasting.** Non-casters skip this step automatically.

**UI:**
- Header: "As a level 1 [Class], you know [X] cantrips and can prepare/know [Y] level 1 spells."
- **Cantrips section:**
  - Full list of class cantrips, each as a card
  - Card shows: name, casting time, range, one-line description
  - Tap to expand full spell description
  - Select up to the allowed number (counter shown: "2 of 3 chosen")
- **Level 1 Spells section:**
  - Same card format
  - For prepared casters (Cleric, Druid, Paladin): "You can change these after a long rest. Don't stress about picking perfectly."
  - For known casters (Wizard, Sorcerer, Bard, Ranger, Warlock): "These are your spells until you level up. Choose ones that seem fun."
  - Concentration spells flagged with a badge
  - Ritual spells flagged with a badge
  - Damage spells vs utility spells could be subtly categorized to help new players balance their picks

**On completion:** Spell list added to character sheet. Spell slots shown in preview.

---

### Step 8: Backstory & Details

**Purpose:** Name, appearance, personality, and the campaign-specific book-donation prompt.

**UI:**
- **Character name** — text field, required
- **Appearance** — text area, optional. Prompt: "What do you look like? A few words are fine."
- **Personality** — pre-filled from background selections in Step 5, editable
- **Ideals, Bonds, Flaws** — same, pre-filled, editable
- **Book donation** — "To enter Candlekeep, you must donate a book. What book did you bring, and why do you have it?" (Text area, required — this is the campaign hook)
- **Why are you going to Candlekeep?** — text area, optional. A few prompts shown as inspiration (from the player brief): seeking answers, sent by a patron, looking for someone, drawn to knowledge, running from something, hired sword.
- **Character portrait** — optional image upload (stored in Supabase storage)
- **Additional notes** — freeform text area for anything else

---

### Step 9: Review & Finalize

**Purpose:** Final review of the complete character.

**UI:**
- Full character sheet rendered in the same format the player will see during play
- Every section expandable/collapsible
- All computed values shown: HP, AC, initiative, attack bonuses, spell save DC, passive perception
- An "Edit" button on each section that jumps back to the relevant step
- **"Finalize Character"** button — saves to Supabase, marks character as complete
- Confetti or some satisfying feedback animation
- Redirect to the player dashboard showing their new character

---

## Character Sheet View (Post-Creation)

After creation, the character sheet lives at `/player/character`. It's the player's primary reference during sessions.

**Layout (mobile-first):**
- **Header:** Character name, class, level, race. Tap to see full details.
- **Quick Stats Bar:** HP (current/max, tappable to adjust), AC, Initiative, Speed — always visible
- **Tabs or scrollable sections:**
  1. **Combat** — Attacks (with to-hit and damage pre-calculated), spell slots (tappable to track usage), class features
  2. **Abilities & Skills** — Six abilities with modifiers, all skills with proficiency indicators and total bonuses
  3. **Spells** (casters only) — Known/prepared spells, tappable for full descriptions, slot tracking
  4. **Inventory** — Equipment list with weights, tappable items for descriptions
  5. **Character** — Backstory, personality, bonds, flaws, notes, portrait
- **Edit mode** — for leveling up, changing prepared spells, updating inventory, adjusting HP

---

## Data Model

### Characters Table

```sql
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'complete')),
  
  -- Core identity
  race_id TEXT REFERENCES ref_races(id),
  class_id TEXT REFERENCES ref_classes(id),
  subclass_id TEXT REFERENCES ref_subclasses(id),
  background_id TEXT REFERENCES ref_backgrounds(id),
  level INTEGER NOT NULL DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  
  -- Ability scores (base, before racial bonuses)
  str_base INTEGER, dex_base INTEGER, con_base INTEGER,
  int_base INTEGER, wis_base INTEGER, cha_base INTEGER,
  ability_score_method TEXT, -- 'standard_array', 'point_buy', 'rolled'
  
  -- Proficiencies and choices made during creation
  skill_proficiencies TEXT[],
  tool_proficiencies TEXT[],
  languages TEXT[],
  
  -- Equipment
  equipment JSONB DEFAULT '[]', -- [{item_id, quantity, equipped}]
  currency JSONB DEFAULT '{"cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0}',
  
  -- Spells
  cantrips_known TEXT[],        -- spell IDs
  spells_known TEXT[],          -- spell IDs (for known casters)
  spells_prepared TEXT[],       -- spell IDs (for prepared casters)
  spell_slots_used JSONB DEFAULT '{}', -- {"1": 0, "2": 0, ...} tracks usage during session
  
  -- HP tracking
  hp_current INTEGER,
  hp_max INTEGER,               -- computed from class hit die + con mod
  hp_temp INTEGER DEFAULT 0,
  hit_dice_used INTEGER DEFAULT 0,
  death_save_successes INTEGER DEFAULT 0,
  death_save_failures INTEGER DEFAULT 0,
  
  -- Personality & backstory
  personality_traits TEXT,
  ideals TEXT,
  bonds TEXT,
  flaws TEXT,
  backstory TEXT,
  appearance TEXT,
  book_donation TEXT,            -- campaign-specific: what book they brought
  motivation TEXT,               -- why they're going to Candlekeep
  notes TEXT,                    -- freeform player notes
  portrait_url TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can manage own characters"
  ON characters FOR ALL USING (user_id = auth.uid());

CREATE POLICY "DM can view campaign characters"
  ON characters FOR SELECT USING (
    campaign_id IN (SELECT id FROM campaigns WHERE dm_user_id = auth.uid())
  );
```

---

## Computed Values (Client-Side)

These are calculated from stored data, not stored themselves:

| Value | Formula |
|---|---|
| **Ability modifier** | floor((score - 10) / 2) |
| **Ability score (total)** | base + racial bonus |
| **Proficiency bonus** | +2 at level 1-4, +3 at 5-8, etc. |
| **Skill bonus** | ability mod + (proficiency bonus if proficient) |
| **Initiative** | Dex modifier (+ any features) |
| **Passive Perception** | 10 + Perception skill bonus |
| **HP max** | hit die max + Con mod at level 1 |
| **AC** | depends on armor type + Dex mod + shield |
| **Spell save DC** | 8 + proficiency + spellcasting ability mod |
| **Spell attack bonus** | proficiency + spellcasting ability mod |
| **Weapon attack bonus** | proficiency + Str or Dex mod |
| **Weapon damage** | die + Str or Dex mod |

Build a `computeCharacterStats(character, refs)` utility that takes stored character data + reference data and returns all derived stats. Use this everywhere.

---

## Implementation Priority

1. **5e.tools data ingestion** — seed script, reference tables, run it
2. **Character creator wizard UI** — step navigation, progress bar, preview panel
3. **Steps 1-3** — concept, race, class (the core identity choices)
4. **Step 4** — ability scores with all three methods
5. **Steps 5-6** — background, equipment
6. **Step 7** — spells (casters only)
7. **Steps 8-9** — backstory, review, finalize
8. **Character sheet view** — the post-creation reference page
9. **DM recommendation config** — campaign settings page
10. **HP/spell slot tracking** — tappable adjustments during play

Steps 1-7 are needed before session 1. Steps 8-9 and the character sheet view are also needed. HP tracking during play can come slightly later if needed.
