# Consolidated Handoff — Review Fixes + New Features

## Read Order
1. **This file** — prioritized task list and review fixes
2. `docs/AUTHORING_SPEC.md` — Markdown format definition for session prep files
3. `docs/UPLOAD_FEATURE_SPEC.md` — Upload API, parser architecture, versioning schema, UI
4. `docs/CHARACTER_CREATOR_SPEC.md` — Full character creator flow, 5e.tools data ingestion, character sheet
5. `docs/PLAYER_FEATURES_SPEC.md` — Cheat sheets content, handout viewer spec

---

## Priority 1: Code Review Fixes

These are issues from the current codebase that should be addressed before building new features.

### 1A. Consider Next.js Version Stability
The project uses Next.js 16.2.3 + React 19. If you're encountering build errors, hydration issues, or package incompatibilities, consider pinning to Next.js 14.2.x or 15.x. This is a judgment call based on whether things are currently working — if stable, leave it.

### 1B. PWA Service Worker Setup
The `manifest.json` exists and the root layout references it, but no service worker library is installed. Add offline caching:

```bash
npm install next-pwa
# OR
npm install @serwist/next
```

Configure in `next.config.ts` to cache:
- All static assets (JS, CSS, fonts)
- The current session's content JSON
- PWA icons

This makes the app installable with proper offline support. Not blocking for session 1 but should be done soon.

### 1C. Add Suspense Boundaries and Loading States
The session detail page (`/dm/sessions/[id]/page.tsx`) is a server component that blocks on the Supabase fetch. Wrap it in a Suspense boundary with a loading skeleton:

```tsx
// src/app/dm/sessions/[id]/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse px-4 py-6">
      <div className="h-6 w-48 rounded bg-gray-800 mb-4" />
      <div className="h-4 w-32 rounded bg-gray-800 mb-8" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 rounded bg-gray-800/50" />
        ))}
      </div>
    </div>
  );
}
```

Same for the sessions list page.

### 1D. Add Error Boundary
Add a basic error boundary for the session viewer. If the JSON content is malformed or a component crashes, the whole page shouldn't white-screen:

```tsx
// src/app/dm/sessions/[id]/error.tsx
"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-red-400">Something went wrong</h2>
        <p className="mt-2 text-sm text-gray-400">{error.message}</p>
        <button onClick={reset} className="mt-4 rounded bg-gray-800 px-4 py-2 text-sm text-gray-200">
          Try again
        </button>
      </div>
    </div>
  );
}
```

### 1E. Verify Auth Callback Flow
Test the complete auth flow end-to-end: login page → send magic link → click link → callback route → profile creation → redirect to DM dashboard. The callback route at `/auth/callback/route.ts` should handle the code exchange and redirect properly. Ensure the first signup gets `role: 'dm'` in the profiles table.

---

## Priority 2: Session Upload, Parser & Versioning

Full specs are in `docs/AUTHORING_SPEC.md` and `docs/UPLOAD_FEATURE_SPEC.md`. Summary of tasks:

### 2A. Database Migration — Versioning Tables
Add `session_versions` table. Add `current_version` and `raw_markdown` columns to `sessions` table. Add RLS policies. Full SQL is in UPLOAD_FEATURE_SPEC.md.

### 2B. Build the Markdown Parser
`src/lib/parser/sessionParser.ts`

Pipeline: raw markdown string → frontmatter extraction (YAML) → block tokenization → block parsing → aggregation → SessionContent JSON.

The parser output must match the exact same `SessionContent` TypeScript interface that the session viewer already consumes (defined in `src/lib/types/session.ts`).

Dependencies to add: `js-yaml` for YAML parsing. No generic markdown parser — write a custom tokenizer.

Key block types to parse (all defined in AUTHORING_SPEC.md):
- `> [!read-aloud]` → ReadAloud blocks
- `> [!tip]`, `> [!warning]`, `> [!lore]`, `> [!rp]` → DmNote blocks
- `> [!danger]` → Lethality warnings
- `> [!treasure]` → Treasure lists (also aggregated to quick reference)
- `> [!puzzle-book] X` → Puzzle book entries (also aggregated)
- `> [!npc] Name` → NPC entries (also aggregated)
- `> [!setting]` → Setting details
- ` ```stat-block ` fenced blocks → StatBlock objects (YAML inside)
- Tables with `Action` as first column header → Interaction tables
- `##` headers with `{time: X}` → Acts
- `###` headers with `{tags: x, y}` → Sections/rooms
- YAML frontmatter between `---` delimiters → Session metadata

The parser must be **lenient**: missing `title` in frontmatter is the only hard error. Everything else degrades gracefully (malformed stat block → code block, unknown callout → generic callout).

### 2C. Upload API Route
`POST /api/sessions/upload` — accepts multipart `.md` file upload. Validates, parses, handles versioning (new session vs new version of existing). Full request/response contract in UPLOAD_FEATURE_SPEC.md.

### 2D. Upload UI
"Upload Session Prep" button on sessions list page. File picker filtered to `.md`. Progress indicator. Success toast with version number. Redirect to session viewer.

### 2E. Version History Panel
Accessible from session viewer toolbar. Lists versions with timestamps. Tap to view old version (read-only with banner). "Restore" creates new version (numbers only go up). "Download .md" downloads raw source.

### 2F. Convert Session 1 to Markdown
Write `data/sessions/session-1-joy-of-extradimensional-spaces.md` — the existing JSON re-expressed in the authoring markdown format. This is the primary test fixture for the parser. Run the parser on it and verify the output matches the existing JSON structure.

### 2G. Parser Tests
Unit tests for: frontmatter extraction, each callout type, stat block YAML parsing, interaction table detection, aggregation, edge cases (empty file, no acts, malformed content).

---

## Priority 3: 5e.tools Data Ingestion

This is a prerequisite for the character creator but should be built as a standalone step.

### 3A. Reference Table Schema
Create tables: `ref_races`, `ref_classes`, `ref_subclasses`, `ref_backgrounds`, `ref_spells`, `ref_items`, `ref_conditions`. Full SQL schemas in CHARACTER_CREATOR_SPEC.md. All tables get public read-only RLS policies.

### 3B. Ingestion Seed Script
`scripts/ingest-5etools.ts` — fetches JSON from the 5e.tools GitHub mirror (`https://github.com/5etools-mirror-3/5etools-src`), normalizes data into our table schemas, upserts into Supabase. Must be:
- Runnable locally (`npx ts-node scripts/ingest-5etools.ts`)
- Idempotent (safe to re-run)
- Logged (reports how many records ingested per table)

Required data files:
- `data/races.json` + `data/fluff-races.json` → `ref_races`
- `data/classes/` directory → `ref_classes` + `ref_subclasses`
- `data/backgrounds.json` → `ref_backgrounds`
- `data/spells/` directory → `ref_spells`
- `data/items.json` + `data/basicitems.json` → `ref_items`
- `data/conditionsdiseases.json` → `ref_conditions`

---

## Priority 4: Character Creator

Full spec in `docs/CHARACTER_CREATOR_SPEC.md`. This is the largest feature. Build in this order:

### 4A. Character Creator Wizard UI
Step navigation shell, progress bar, persistent character preview sidebar (desktop) / collapsible panel (mobile). Route: `/player/character/create`.

### 4B. Steps 0-3: Welcome, Concept, Race, Class
Step 0: Campaign primer content (static, from player brief). Step 1: Archetype cards that filter the class list. Step 2: Race selection with DM recommendations highlighted. Step 3: Class selection with complexity ratings, plain-language descriptions, skill proficiency choices.

### 4C. Step 4: Ability Scores
Three tabs: Recommended Array (standard array with intelligent defaults per class), Point Buy (interactive allocator with 27 points), Roll (4d6 drop lowest with dice animation). Racial bonuses applied automatically and shown separately.

### 4D. Steps 5-6: Background, Equipment
Background selection with personality trait tables (d8/d6 with roll buttons). Equipment selection from class starting equipment choices with item descriptions on tap.

### 4E. Step 7: Spells (Casters Only)
Cantrip and level 1 spell selection. Filtered to class spell list. Concentration and ritual flagged. Counter showing selections remaining.

### 4F. Steps 8-9: Backstory, Review
Name, appearance, personality (pre-filled from background), book donation prompt, motivation. Review page with full computed character sheet preview. "Finalize Character" saves to Supabase.

### 4G. Character Sheet View
Post-creation reference page at `/player/character`. Quick stats bar (HP, AC, initiative, speed), tabbed sections (Combat, Abilities & Skills, Spells, Inventory, Character). HP and spell slot tappable for tracking during play.

### 4H. Computed Stats Utility
`src/lib/utils/characterStats.ts` — takes stored character data + reference data, returns all derived stats (modifiers, proficiency bonus, skill bonuses, initiative, passive perception, HP max, AC, spell save DC, attack bonuses). Used everywhere character stats are displayed.

### 4I. DM Recommendation Config
Simple config page in DM dashboard for setting recommended races, classes, and backgrounds per campaign with optional notes. Stored in `campaigns.recommendations` JSONB field.

### 4J. Player Auth & Role Flow
Player signup flow — new accounts default to `role: 'player'`. Players get redirected to `/player` routes. DM can invite players to a campaign (generate invite link or add by email). Campaign membership tracked in `campaign_members`.

---

## Priority 5: Cheat Sheets

### 5A. Static Reference Pages
Build at `/player/reference` with tab/accordion navigation. Seven pages of content (fully written in PLAYER_FEATURES_SPEC.md):
1. Your Turn in Combat
2. Actions in Combat
3. Actions in Combat
4. How Skill Checks Work
5. Conditions Quick Reference
6. Death & Dying
7. Resting
8. Spellcasting Basics (shown only for caster characters)

These are static content — no database needed. Dark mode, monospace/semi-monospace layout, scannable formatting. Searchable within the reference section.

---

## Priority 6: Handout Viewer (Post-Session-1)

### 6A. Handouts Table
Create `handouts` table with `campaign_id`, `title`, `content_type` (markdown/image/text), `content`, `published_at` (null = draft). RLS: DM full access, players can view published handouts in their campaign.

### 6B. DM Handout Management
"Handouts" section in DM dashboard. Create handout with title + markdown content or image upload. Publish/unpublish toggle.

### 6C. Player Handout Viewer
"Handouts" tab on player dashboard. Published handouts in reverse chronological order. "NEW" badge until viewed. Read-only.

---

## File Locations for New Specs

All referenced spec documents should be placed in the repo's `docs/` directory:
- `docs/AUTHORING_SPEC.md`
- `docs/UPLOAD_FEATURE_SPEC.md`
- `docs/CHARACTER_CREATOR_SPEC.md`
- `docs/PLAYER_FEATURES_SPEC.md`
