# Phase 1 — Implementation Tasks

## Read These First
1. `docs/PROJECT_SPEC.md` — what we're building and why
2. `docs/ARCHITECTURE.md` — technical decisions, schema, component structure
3. `data/sessions/joy-of-extradimensional-spaces.json` — the actual content to render

## Setup Tasks

### Task 1: Initialize Next.js Project
```bash
npx create-next-app@latest campaign-companion --typescript --tailwind --eslint --app --src-dir
```
- Configure `tailwind.config.ts` with the design tokens from ARCHITECTURE.md
- Set dark mode to `class` strategy with `dark` as default
- Install dependencies: `@supabase/supabase-js`, `@supabase/ssr`
- Set up PWA with `next-pwa` or `@serwist/next`

### Task 2: Configure Supabase
- Create Supabase project (user will provide URL and anon key)
- Run the Phase 1 migration SQL from ARCHITECTURE.md
- Set up Supabase client utilities (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
- Configure auth with magic link (email) provider
- Set up middleware for auth session refresh

### Task 3: Auth Flow
- Build login page (`/auth/login`) with email magic link input
- Build auth callback handler (`/auth/callback`)
- Create `useAuth` hook for client-side auth state
- Build role-based layout guards:
  - `/dm/*` routes require authenticated user with role='dm'
  - `/player/*` routes require authenticated user with role='player'
- First signup defaults to 'dm' role (first user is always the DM)
  - Subsequent signups default to 'player'
- Build simple profile setup (display name) on first login

### Task 4: Seed Session Data
- Build API route (`/api/seed`) that:
  - Creates a campaign ("Candlekeep Mysteries")
  - Loads `joy-of-extradimensional-spaces.json` into the sessions table
  - Initializes session_state for the puzzle tracker
- This should be idempotent (safe to run multiple times)

## Core Feature Tasks

### Task 5: Session Viewer — Main Layout
Build the `SessionViewer` component and the `/dm/sessions/[id]` page.

**Layout structure (mobile-first):**
- Fixed top bar: session title, search icon, quick-reference toggle
- Scrollable main content area
- Bottom sheet (swipe up) for quick reference tables (NPC list, puzzle tracker, treasure summary)
- On desktop (768px+): sidebar navigation on the left with section links

**Navigation:**
- Render all act titles and section titles as a scrollable table of contents
- Tapping a section title smooth-scrolls to that section
- Sticky act headers that show which act you're in as you scroll
- "Back to top" FAB when scrolled down

### Task 6: Session Viewer — Section Rendering
Each section in the content JSON should render with the appropriate components:

**ReadAloud component:**
- Distinct visual style: warm background (amber-950/40), left border (amber-600), serif font (use Georgia or a web-safe serif)
- Italic text
- Quotation-style presentation — this text is read directly to players
- Slightly larger font size than body text for readability in dim light

**DmNote component:**
- Callout box with colored left border based on type:
  - `tip` → blue
  - `warning` → red  
  - `lore` → purple
  - `rp_guidance` → green
- Title line in bold if provided
- Collapsible (tap to expand/collapse), default expanded

**StatBlock component:**
- **Collapsed by default** — shows just creature name, AC, HP, CR on a single line
- Tap to expand full stat block
- Full view styled like a traditional D&D stat block:
  - Creature name as header
  - Horizontal rule
  - AC, HP, Speed on top line
  - Ability scores in a 6-column row (if provided)
  - Attacks formatted as: **Name.** *+X to hit, reach X ft.* Hit: damage description
  - Special abilities as titled paragraphs
  - Resistances, immunities, etc. as compact lists
- Use monospace for numbers (AC, HP, to-hit, damage)
- Warm parchment-style background in dark mode (gray-800 with slight warm tint)

**LethalityWarning component:**
- Red-bordered callout with ⚠️ icon
- Bold "LETHALITY CHECK" header
- Content rendered as markdown-like text (support bold, bullet points)

**PuzzleTracker component:**
- Renders as a table with checkbox per puzzle book letter
- Checkbox state persisted to Supabase `session_state` table
- Shows letter, room, and found/not-found status
- Compact enough to fit in the quick-reference bottom sheet AND inline in the main content

**Interaction table:**
- Renders the `interactions` array as a compact table
- Columns: Action | Check | Result
- Useful for quick reference during play when players are searching rooms

### Task 7: Search
Build `SearchOverlay` component:
- Triggered by search icon in top bar or Cmd/Ctrl+K
- Full-screen overlay on mobile, modal on desktop
- Text input with instant results as you type
- Searches across: section titles, descriptions, read_aloud text, creature names, NPC names, interaction actions and results, dm_note content
- Results grouped by section with highlighted matches
- Tapping a result closes search and scrolls to that section
- Implementation: client-side search over the JSON content (no need for server-side search in Phase 1 — the data is small enough)

### Task 8: Quick Reference Bottom Sheet
Build `QuickReference` component:
- Mobile: swipe-up bottom sheet with tabs
- Desktop: collapsible sidebar panel
- Tabs/sections:
  1. **NPCs** — renders the `quick_reference.npcs` array as a compact card list
  2. **Puzzle Tracker** — the interactive PuzzleTracker component
  3. **Treasure** — renders treasure summary as a table
  4. **Map** — the exploration flowchart (rendered as formatted text or simple visual)
- Should be accessible at any time during scrolling without losing position

### Task 9: PWA Setup
- Configure service worker to cache:
  - All static assets (JS, CSS, images)
  - The current session's content JSON
  - Font files
- Add install prompt on first visit (subtle banner, not modal)
- Configure `manifest.json` with correct icons, theme color, etc.

## Polish Tasks

### Task 10: Typography and Readability
- Body text: 16px minimum on mobile (dim light readability)
- Read-aloud text: 18px
- Stat block numbers: monospace font
- Section headers: clear hierarchy (act > room > subsection)
- Generous line height (1.6-1.7) for body text
- Adequate contrast ratios for dark mode (WCAG AA minimum)

### Task 11: Performance
- Session content loaded once and cached client-side
- No unnecessary re-renders — memoize section components
- Lazy load collapsed stat blocks (don't render full content until expanded)
- Keep bundle size small — no heavy dependencies beyond Supabase SDK

### Task 12: Mobile UX Polish
- All tap targets minimum 44x44px
- Smooth scroll behavior for section navigation
- Bottom sheet should be draggable with a handle
- Search overlay should auto-focus the input and show keyboard
- Test on actual phone screen sizes (375px width minimum)

## Out of Scope for Phase 1
- Player-facing features (no character sheets, no player login flow beyond basic auth)
- Real-time sync (no Supabase Realtime subscriptions yet)
- 5e.tools data import
- Campaign tracker / session logs
- Encounter/initiative tracker
- Dice roller
- Multi-campaign support (hardcode one campaign for now)
- Content editor (DM adds/edits session prep via JSON file, not in-app editing)

## Definition of Done (Phase 1)
The DM can:
1. Open the app on their phone
2. Log in with magic link
3. See the full "Joy of Extradimensional Spaces" session prep
4. Scroll through all acts and rooms with proper formatting
5. Tap stat blocks to expand/collapse them
6. Read read-aloud text in a distinct, legible style
7. Search for any keyword and jump to the relevant section
8. Check off puzzle books as players find them (persisted)
9. Pull up the quick reference sheet at any time
10. Install the app as a PWA on their phone's home screen
