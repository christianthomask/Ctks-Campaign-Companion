# CLAUDE.md — Campaign Companion

## Project Overview
A D&D 5E campaign companion PWA with DM and player-facing features. Built with Next.js 14 (App Router), Supabase (auth + database + realtime), Tailwind CSS, deployed on Vercel.

## Read Order
1. **This file** — high-level context
2. `docs/PROJECT_SPEC.md` — full product spec with phased build plan
3. `docs/ARCHITECTURE.md` — tech stack, database schema, component structure, TypeScript types
4. `docs/PHASE_1_TASKS.md` — specific implementation tasks for MVP
5. `data/sessions/joy-of-extradimensional-spaces.json` — the actual session content to render

## Current Phase: Phase 1 — MVP
Build the DM session prep viewer. The core deliverable is: the DM opens the app on their phone, logs in, and sees their session prep rendered as a beautiful, searchable, interactive reference they can use at the game table.

## Key Decisions Already Made
- **Dark mode default** — game tables are dim, white backgrounds are blinding
- **Mobile-first** — primary device is a phone at a game table
- **Supabase Auth with magic link** — no passwords
- **Session content stored as structured JSONB** — see the data file for the complete schema
- **First user who signs up = DM role** — subsequent signups default to player
- **PWA** — installable on home screen, basic offline caching

## Code Style
- TypeScript strict mode
- Functional components with hooks
- Server components by default, client components only when needed (interactivity, hooks)
- Tailwind for all styling — no CSS modules, no styled-components
- Clean, well-commented code — this will be maintained by one person working with Claude
- Co-locate related files (component + its types + its hooks in the same directory when practical)

## Environment Setup
The developer will provide Supabase credentials. The app needs:
```
NEXT_PUBLIC_SUPABASE_URL=<provided>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<provided>
```

## What NOT to Build Yet
- Player character sheets (Phase 2)
- Real-time session tools (Phase 3)  
- 5e.tools reference library (Phase 4)
- Campaign tracker / session logs (Phase 5)
- In-app content editing (DM provides session data as JSON files for now)
