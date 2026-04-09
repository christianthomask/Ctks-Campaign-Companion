# Priority Handoff: Pre-Session-1 Blockers (Excluding Handouts)

The handout improvements are being handled separately. This covers the remaining blockers.

---

## Priority 1: Player Invite Flow (BLOCKER — nothing player-side works without this)

Players can sign up and log in, but there's no way to join a campaign. The `campaign_members` table exists but nothing creates those records. This breaks the character creator (alerts "No campaign found"), handouts (shows empty), and any future campaign-scoped feature.

### Database Migration

```sql
-- Migration: 006_invite_system.sql

-- Add invite code to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Allow authenticated users to read campaigns by invite code (for join page)
CREATE POLICY "Anyone can find campaign by invite code"
  ON campaigns FOR SELECT
  USING (invite_code IS NOT NULL AND auth.uid() IS NOT NULL);

-- Allow authenticated users to join campaigns via invite
CREATE POLICY "Players can join via invite"
  ON campaign_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'player'
    AND campaign_id IN (
      SELECT id FROM campaigns WHERE invite_code IS NOT NULL
    )
  );
```

Note: the existing RLS policies on `campaigns` and `campaign_members` allow DM full access already. The new policies add read access for the join flow and insert access for self-joining.

### API Route: Generate Invite Code

`POST /api/campaigns/invite`

```typescript
// Generates or regenerates an invite code for the DM's campaign
// Requires: authenticated DM
// Returns: { invite_code: string, invite_url: string }

// Generate 8-character alphanumeric code
const code = crypto.randomUUID().replace(/-/g, '').slice(0, 8);

await supabase
  .from('campaigns')
  .update({ invite_code: code })
  .eq('id', campaignId)
  .eq('dm_user_id', user.id);

return { invite_code: code, invite_url: `${origin}/join/${code}` };
```

### API Route: Join Campaign

`POST /api/campaigns/join`

```typescript
// Joins the authenticated player to a campaign via invite code
// Body: { invite_code: string }
// Returns: { campaign_id: string, campaign_name: string }

// Look up campaign by invite code
const { data: campaign } = await supabase
  .from('campaigns')
  .select('id, name')
  .eq('invite_code', invite_code)
  .single();

if (!campaign) return 404;

// Check if already a member
const { data: existing } = await supabase
  .from('campaign_members')
  .select('campaign_id')
  .eq('campaign_id', campaign.id)
  .eq('user_id', user.id)
  .single();

if (existing) return { already_member: true, campaign_id: campaign.id };

// Insert membership
await supabase.from('campaign_members').insert({
  campaign_id: campaign.id,
  user_id: user.id,
  role: 'player'
});

return { campaign_id: campaign.id, campaign_name: campaign.name };
```

### Join Page: `/join/[code]/page.tsx`

A simple page that:
1. Reads the invite code from the URL params
2. If user is NOT logged in: shows "You've been invited to a campaign! Sign in to join." with a login button that passes a return URL back to `/join/[code]`
3. If user IS logged in: calls the join API automatically, shows a success message, and redirects to `/player` after 2 seconds
4. If already a member: "You're already in this campaign!" → redirect to `/player`
5. If invalid code: "This invite link is invalid or has expired."

### DM Side: Players/Invite Page

Create `/dm/players/page.tsx`:

- Show campaign name
- "Invite Players" section:
  - If no invite code exists: "Generate Invite Link" button
  - If code exists: show the shareable URL with a "Copy Link" button, and a "Regenerate" button
- "Current Players" section:
  - List all campaign members with display names and join dates
  - Query: `campaign_members` joined with `profiles` where `campaign_id` matches

### Player Dashboard Update

Update `/player/page.tsx`:

- On load, check if the player has any campaign memberships
- If YES: show the dashboard as-is (character, handouts, reference links) with the campaign name at the top
- If NO: show a friendly message:
  ```
  Welcome! You're not part of a campaign yet.
  Ask your DM for an invite link, or paste an invite code below.
  
  [____________] [Join]
  ```
  The text input accepts either a full URL or just the code. Calls the join API.

---

## Priority 2: 2024 Rules Data Update

Full spec is in `DATA_UPDATE_2024_RULES.md`. This is the full rewrite of the ingestion script and character creator for XPHB data.

**If the full 2024 update can't be done before session 1**, apply this minimal fallback:

### Fallback: Ensure 2014 Data Is Populated

1. Run the existing ingestion script (`npx tsx scripts/ingest-5etools.ts`) and confirm it populates the ref tables
2. Verify the character creator shows options (races, classes, backgrounds, spells) from the populated tables
3. Verify a character can be created end-to-end and saved

This gives players functional character creation with 2014 content while the 2024 update is built. It's imperfect but usable.

### Full 2024 Update Tasks (in order)

1. **Migration 006** (if not already used for invite system, use 007): rename `ref_races` → `ref_species`, add columns, create `ref_feats`
2. **Update ingestion script**: change source filters from `PHB/XGE/TCE` → `XPHB`, update data parsing for 2024 JSON structure
3. **Truncate and re-seed**: wipe ref tables, run updated script, verify counts (10 species, 12 classes, ~48 subclasses, ~16 backgrounds, ~75 feats)
4. **Update character creator components**:
   - Rename `RaceStep.tsx` → `SpeciesStep.tsx`, update all "race" references to "species"
   - Reorder wizard steps: Welcome → Concept → Class → Background → Species → Ability Scores → Equipment → Spells → Backstory → Review
   - Update `AbilityScoresStep.tsx`: bonuses come from selected Background (3 options, +2/+1 or +1/+1/+1)
   - Update `EquipmentStep.tsx`: gold-budget shopping (50 gp) instead of fixed class packages
   - Update `CharacterDraft` interface: `race_id` → `species_id`
5. **Update character sheet view**: same terminology updates
6. **Update `characterStats.ts`**: ability score computation uses background bonuses, not species bonuses

---

## Priority 3: DM Navigation

The DM has no way to navigate between Sessions, Handouts, and Players (once built) without going back to the browser URL bar.

Update `src/app/dm/layout.tsx` to add a nav bar:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DmLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "dm") redirect("/");

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-4">
          <div className="flex gap-1">
            <NavLink href="/dm/sessions">Sessions</NavLink>
            <NavLink href="/dm/handouts">Handouts</NavLink>
            <NavLink href="/dm/players">Players</NavLink>
          </div>
          <span className="text-xs text-gray-500">DM</span>
        </div>
      </nav>
      {children}
    </div>
  );
}

// Client component for active state highlighting
// (or use next/navigation usePathname in a client wrapper)
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-3 text-sm text-gray-400 hover:text-amber-400 transition-colors"
    >
      {children}
    </Link>
  );
}
```

Note: To highlight the active nav item, the NavLink component needs to be a client component using `usePathname()` from `next/navigation`. Extract it to a separate file if needed:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`px-3 py-3 text-sm transition-colors ${
        isActive ? "text-amber-400 border-b-2 border-amber-400" : "text-gray-400 hover:text-amber-400"
      }`}
    >
      {children}
    </Link>
  );
}
```

Do the same for the player layout — add nav links for Reference, Character, and Handouts.

---

## Priority 4: Player Navigation

Same pattern for `/player/layout.tsx`:

```tsx
<nav>
  <NavLink href="/player/reference">Reference</NavLink>
  <NavLink href="/player/character">Character</NavLink>
  <NavLink href="/player/handouts">Handouts</NavLink>
</nav>
```

This replaces the card-based dashboard links with persistent navigation. The player dashboard (`/player/page.tsx`) can become a redirect to `/player/character` (or stay as a landing page with campaign info).

---

## Priority 5: Verify End-to-End Flow

After implementing priorities 1-4, manually test this complete flow:

1. DM logs in → sees sessions page with nav bar
2. DM navigates to Players → generates invite link → copies URL
3. New user opens invite URL → prompted to sign in → clicks magic link → returns to join page → automatically joined → redirected to player dashboard
4. Player sees campaign name, navigates to Character → opens character creator → ref tables have data → completes wizard → character saved
5. Player navigates to Reference → sees all 7 cheat sheets
6. DM publishes a handout → Player navigates to Handouts → sees the published handout with rendered markdown
7. DM navigates to Sessions → opens session viewer → can use all features during play

Every step in this chain must work. If one breaks, that's the priority fix.
