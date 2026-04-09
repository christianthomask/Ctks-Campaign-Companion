# Campaign Companion — Project Specification

## What This Is

A Progressive Web App (PWA) serving as a campaign companion for a D&D 5th Edition group. It has two audiences:

1. **DM-facing:** Session prep viewer, campaign tracker, encounter management, reference tools
2. **Player-facing:** Character sheets, spell/rules reference, personal notes

The app is built iteratively. This spec covers the full vision but Phase 1 (MVP) is the immediate build target.

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Framework** | Next.js 14+ (App Router) | SSR, API routes, PWA support, Vercel-native |
| **Hosting** | Vercel (free tier) | Zero-config Next.js deployment |
| **Database** | Supabase (free tier) | Postgres + Auth + Realtime + Row Level Security |
| **Auth** | Supabase Auth (email magic link) | No passwords to manage, works on all devices |
| **Styling** | Tailwind CSS | Fast iteration, mobile-first, one developer |
| **PWA** | next-pwa or @serwist/next | Installable, offline caching, mobile app feel |
| **5e Data** | 5e.tools JSON (GitHub mirror) | Comprehensive D&D reference data |

## User Roles

| Role | Description | Access |
|---|---|---|
| **DM** | The app creator/admin. One person. | Everything — session prep, campaign tracker, all player data, encounter tools, admin |
| **Player** | 3-4 people with their own accounts | Their own character sheet, shared session state (initiative, HP), spell/rules reference, personal notes |

## Phased Build Plan

### Phase 1 — MVP: DM Session Prep Viewer ← BUILD THIS FIRST

The DM's session prep documents (structured JSON, provided in `/data/`) rendered as a beautiful, fast, mobile-optimized reference app. This is what the DM uses at the table during the actual game session.

**Features:**
- Supabase auth (magic link login). DM account created on first signup.
- Session prep rendered from structured JSON data with:
  - Collapsible sections (acts, rooms, appendices)
  - Inline stat blocks that expand/collapse on tap
  - Read-aloud text in a visually distinct style (boxed, italic, different background)
  - DM notes/tips in a visually distinct callout style
  - Lethality warnings with ⚠️ styling
  - Puzzle book tracker with checkboxes (state persisted to Supabase)
  - Quick-reference sidebar or bottom sheet (NPC table, puzzle tracker, treasure summary)
  - Full-text search across all session content
- Mobile-first responsive design. Primary use case is a phone at the table.
- PWA manifest + service worker for installability and basic asset caching.
- Dark mode (default) — game tables are dim.

**Data model for Phase 1:**
- `users` table (Supabase Auth handles this)
- `campaigns` table (id, name, dm_user_id, created_at)
- `sessions` table (id, campaign_id, title, session_number, content JSONB, created_at)
- `session_state` table (id, session_id, state JSONB, updated_at) — for puzzle tracker checkboxes etc.

**What "done" looks like:** The DM can open the app on their phone, see the full session prep for "The Joy of Extradimensional Spaces" rendered beautifully, tap to expand stat blocks, check off puzzle books as players find them, search for "mimic" and jump straight to M7, and see read-aloud text in a distinct style they can read directly to players.

### Phase 2 — Player Character Sheets

Players create accounts and build/manage characters.

**Features:**
- Character creation flow (race, class, background, ability scores, equipment)
- Character sheet view with all standard fields:
  - Ability scores + modifiers (auto-calculated)
  - HP (current/max/temp), AC, initiative, speed
  - Skills with proficiency tracking
  - Saving throws
  - Attacks and spellcasting
  - Equipment and inventory with weight tracking
  - Spell slots (current/max) and known/prepared spells
  - Features and traits
  - Backstory, personality, ideals, bonds, flaws
  - Personal notes section (freeform)
- DM can view all player characters (read-only)
- Character data stored in Supabase, synced across devices

**Data model additions:**
- `characters` table (id, user_id, campaign_id, name, race, class, level, data JSONB, created_at, updated_at)
- `character_spells` table (character_id, spell_id, prepared boolean)
- `character_inventory` table (character_id, item_name, quantity, weight, notes)

### Phase 3 — Live Session Tools

Real-time shared state during sessions using Supabase Realtime.

**Features:**
- Initiative tracker: DM enters turn order, all players see it live
- HP tracker: DM adjusts monster HP, players adjust their own, everyone sees current state
- Condition tracker: DM applies conditions (prone, stunned, etc.), visible to all
- Turn indicator: Highlights whose turn it is
- Simple dice roller with result sharing (optional)

**Data model additions:**
- `encounter_state` table with Supabase Realtime subscription
  - Turn order array, current turn index
  - Combatant list (name, HP current/max, AC, conditions, is_player boolean)
  - Status (active, paused, ended)

### Phase 4 — Reference Library

Searchable database of spells, monsters, items, and rules.

**Features:**
- Full-text search across all reference content
- Spell lookup with filtering (class, level, school, concentration, ritual)
- Monster/stat block lookup with filtering (CR, type, environment)
- Item lookup (weapons, armor, adventuring gear, magic items)
- Rules reference (conditions, actions in combat, resting, etc.)
- Deep linking: spell names in character sheets and session prep link to full descriptions
- Data sourced from 5e.tools JSON files (see Architecture doc for details)

**Data model additions:**
- `spells` table (id, name, level, school, classes, casting_time, range, duration, concentration, ritual, description, higher_levels, source)
- `monsters` table (id, name, size, type, alignment, cr, ac, hp, speed, abilities, actions, legendary_actions, source)
- `items` table (id, name, type, rarity, description, properties, source)
- `rules` table (id, category, title, content, source)

### Phase 5+ — Future Features

- Campaign tracker: session logs, plot thread tracker, NPC index with relationship maps
- Encounter builder: drag-and-drop CR calculator, generates initiative template
- Player backstory editor with DM-visible flags ("this is secret" vs "the party knows this")
- Loot generator
- Random tables (integrated with DM prep — the whimsy table, for example)
- Session recap generator
- Map integration

## Design Principles

1. **Mobile-first.** The primary device is a phone held at a game table. Everything must be thumb-reachable and readable in dim light.
2. **Dark mode default.** Game tables are dim. White backgrounds are blinding.
3. **Speed over beauty.** A fast, functional app beats a pretty slow one. But we can have both — Tailwind makes this achievable.
4. **Tap targets over tiny text.** Collapsible sections, big buttons, swipe gestures where appropriate.
5. **Offline-resilient.** Service worker caches the current session's data. If WiFi drops mid-session, the app should still function for reading content. Writes queue and sync when back online.
6. **Clean, documented code.** This app will be maintained by one person (the DM) working with Claude. Code must be readable, well-commented, and modular so Claude can understand and extend it months later.
7. **Structured data, not markdown.** Session prep is stored as structured JSON, not raw markdown. This enables search, filtering, cross-referencing, and rendering flexibility.

## Content Sensitivity Note

All fiendish/demonic content in D&D source material has been reflavored to fey/arcane for this campaign. The app should render content as provided in the data — no additional filtering needed, but the data itself reflects this reflavoring.
