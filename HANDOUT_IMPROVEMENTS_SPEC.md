# Handout System — Improvement Spec

## Current State

The handout system has a working DM → player pipeline: create handouts with a text editor, publish/unpublish, players see published handouts. But it's bare-bones — no file upload, no markdown rendering, no in-session reveal flow, no read tracking.

## Design Philosophy

Handouts are one of the most exciting moments in a session. A player receiving a physical letter, map, or note from the DM is a classic tabletop thrill. The digital version should capture that same feeling — not just "content appeared in a tab" but "the DM just sent you something."

The handout system serves two distinct use cases:
1. **Pre-session materials** — campaign primers, world lore, "read before session 1" documents. Uploaded ahead of time, published when ready.
2. **In-session reveals** — "you find a note on the body," "the shopkeeper hands you a map," "you decipher the inscription." These need to be pre-staged and revealed instantly during play with minimal DM friction.

---

## Feature 1: File Upload Flow

### DM Upload Options

The "New Handout" flow should support three content creation methods:

**Option A — Write in app** (existing, improved)
- Title + markdown editor with live preview panel
- Preview shows how the player will see the rendered content
- Keep the existing textarea but add a side-by-side or toggle preview

**Option B — Upload a markdown file**
- Accept `.md` file upload
- Parse the title from the first `# heading` or from the filename
- Content becomes the handout body
- DM can edit after upload

**Option C — Upload an image**
- Accept `.png`, `.jpg`, `.jpeg`, `.webp` files
- Image stored in Supabase Storage (create a `handout-images` bucket)
- DM adds a title
- Player sees the image rendered inline, tappable to zoom/fullscreen
- Size limit: 5MB per image

### Upload UI

Replace the current "New Handout" button with a creation dialog:

```
┌─────────────────────────────────────┐
│  New Handout                    [X] │
│                                     │
│  ┌───────┐ ┌───────┐ ┌───────┐     │
│  │  ✏️   │ │  📄   │ │  🖼️   │     │
│  │ Write │ │Upload │ │ Image │     │
│  │       │ │  .md  │ │       │     │
│  └───────┘ └───────┘ └───────┘     │
│                                     │
│  Choose how to create your handout  │
└─────────────────────────────────────┘
```

Each option opens the appropriate creation flow. All three result in the same handout record in the database.

---

## Feature 2: In-Session Reveal System

### The Problem

During a session, the DM needs to reveal a handout to players *right now* — "you find a letter on the desk." Currently, the DM would have to navigate to the handouts page, find the right draft, and toggle publish. That's too many taps while also running the game.

### Staged Handouts

Add a `stage` field to handouts with three states:

| State | Meaning | Player Visibility |
|---|---|---|
| `draft` | Work in progress, not ready | Hidden |
| `staged` | Ready to reveal, waiting for the right moment | Hidden |
| `published` | Visible to players | Visible |

**Staged handouts** appear in a special "Ready to Reveal" section on the DM dashboard and in the session viewer's quick reference panel. One tap to publish. This is the "loaded gun" — pre-staged before the session, fired during play.

### Quick Reveal from Session Viewer

Add a "Reveal Handout" button to the session viewer's quick reference panel (alongside NPCs, Puzzles, Treasure, Map). This shows a list of staged handouts with a single "Reveal" button next to each. One tap → published → players see it immediately.

The DM should also be able to link handouts to specific sessions (this field already exists in the schema as `session_id`). When viewing a session, only that session's staged handouts appear in the quick reveal panel.

### Player Notification

When a handout is published during a session, players should see a notification:

- A subtle toast/banner at the top of the player app: "New handout from your DM: [title]"
- The handout tab gets a badge count showing unread handouts
- This uses Supabase Realtime — subscribe to inserts/updates on the `handouts` table where `published_at` changes from null to a timestamp

### Database Changes

```sql
-- Add stage column
ALTER TABLE handouts ADD COLUMN stage TEXT NOT NULL DEFAULT 'draft'
  CHECK (stage IN ('draft', 'staged', 'published'));

-- Migrate existing data: drafts stay draft, published become published
UPDATE handouts SET stage = 'published' WHERE published_at IS NOT NULL;
UPDATE handouts SET stage = 'draft' WHERE published_at IS NULL;

-- Add image storage fields
ALTER TABLE handouts ADD COLUMN storage_path TEXT; -- Supabase Storage path for images
ALTER TABLE handouts ADD COLUMN file_name TEXT;    -- Original filename for downloads

-- Add read tracking
CREATE TABLE handout_reads (
  handout_id UUID NOT NULL REFERENCES handouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (handout_id, user_id)
);

ALTER TABLE handout_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can track own reads"
  ON handout_reads FOR ALL USING (user_id = auth.uid());

CREATE POLICY "DM can view read status"
  ON handout_reads FOR SELECT USING (
    handout_id IN (
      SELECT h.id FROM handouts h
      JOIN campaigns c ON h.campaign_id = c.id
      WHERE c.dm_user_id = auth.uid()
    )
  );
```

---

## Feature 3: Markdown Rendering on Player Side

### The Problem

The player handout view currently renders content as `whitespace-pre-wrap` plain text. Markdown formatting (bold, headers, lists, links) is ignored. This makes handouts look flat and unpolished.

### Solution

Add a lightweight markdown renderer for the player handout view. Use `react-markdown` (widely used, small bundle) or a similar library.

```bash
npm install react-markdown
```

Render handout content through the markdown component instead of a plain `<div>`:

```tsx
import ReactMarkdown from 'react-markdown';

<ReactMarkdown className="prose prose-invert prose-sm max-w-none">
  {handout.content}
</ReactMarkdown>
```

Add `@tailwindcss/typography` for the `prose` classes that handle markdown styling:

```bash
npm install @tailwindcss/typography
```

### Styling

The rendered markdown should match the app's dark theme:
- Headers in `text-gray-100`
- Body text in `text-gray-300`
- Links in `text-amber-400`
- Code blocks with `bg-gray-800` background
- Block quotes with amber left border (matching read-aloud style)
- Tables with gray borders

### DM Preview

The DM editor should also render a preview of the markdown. Add a "Preview" toggle or side-by-side layout to the creation/editing form:

```
┌──────────────────────┬──────────────────────┐
│  Edit                │  Preview             │
│                      │                      │
│  # A Letter Found    │  A Letter Found      │
│                      │  ──────────────────  │
│  *Dearest Valetta,*  │  Dearest Valetta,    │
│                      │                      │
│  The wards are       │  The wards are       │
│  failing. I've seen  │  failing. I've seen  │
│  the signs...        │  the signs...        │
└──────────────────────┴──────────────────────┘
```

On mobile, use a toggle between Edit and Preview modes rather than side-by-side.

---

## Feature 4: Read Tracking

### DM Side

The DM should be able to see which players have viewed each handout. On the handout list in the DM dashboard, show read status:

```
📄 A Letter Found on the Desk
   Published 2 hours ago · Read by 3/4 players
   ⚪ Marcus hasn't read this yet
```

This uses the `handout_reads` table. When a player opens a handout, a row is inserted. The DM queries this to see read counts.

### Player Side

When a player opens a handout for the first time, automatically insert a read record. This also clears the "NEW" badge on that handout.

**"NEW" badge logic:**
- A handout is "new" for a player if `published_at IS NOT NULL` and no `handout_reads` row exists for that player + handout
- The badge count on the Handouts tab = count of unread published handouts
- Opening the handout inserts the read record and removes the badge

---

## Feature 5: Handout Categories and Ordering

### Categories

Allow handouts to be categorized for easier organization as the campaign grows:

```sql
ALTER TABLE handouts ADD COLUMN category TEXT DEFAULT 'general';
```

Suggested default categories:
- `general` — misc handouts
- `lore` — world lore, history, setting information
- `letter` — in-game correspondence, notes, messages
- `map` — maps and diagrams
- `rules` — campaign-specific rules, house rules, reference sheets

The DM can assign a category when creating/editing. Players see handouts grouped by category with collapsible headers.

### Sort Order

The existing `sort_order` field allows manual ordering. Add drag-and-drop reordering on the DM side (or simple up/down buttons for mobile). Within each category, handouts sort by `sort_order`, then by `published_at` descending.

---

## Feature 6: Supabase Realtime for Live Reveals

### Implementation

Subscribe to the `handouts` table using Supabase Realtime on the player side:

```tsx
// In the player layout or handouts page
useEffect(() => {
  const supabase = createClient();
  
  const channel = supabase
    .channel('handout-reveals')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'handouts',
        filter: `campaign_id=eq.${campaignId}`,
      },
      (payload) => {
        // Check if this update was a publish action
        if (payload.new.published_at && !payload.old.published_at) {
          // Show notification toast
          showToast(`New handout: ${payload.new.title}`);
          // Refresh handout list
          refreshHandouts();
        }
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [campaignId]);
```

This means when the DM taps "Reveal" on a staged handout during the session, every player's app immediately shows a notification without refreshing. This is the digital equivalent of the DM sliding a note across the table.

### Enable Realtime

In the Supabase dashboard, enable Realtime for the `handouts` table. Add to the Supabase config or migration:

```sql
-- Enable realtime for handouts table
ALTER PUBLICATION supabase_realtime ADD TABLE handouts;
```

---

## Feature 7: Handout Templates

### Pre-authored Handout Templates

The DM should be able to quickly create handouts from templates for common in-game documents. Provide a few built-in templates:

| Template | Content |
|---|---|
| **Letter** | Formatted with "Dear [recipient]," salutation, body, signature block |
| **Notice / Poster** | Centered title, bold header, body text — for job boards, wanted posters, proclamations |
| **Journal Entry** | Dated entry format with italicized personal reflections |
| **Inscription** | Centered, small-caps styled text — for runes, engravings, ancient writing |
| **Map Legend** | Numbered list with descriptions — companion text for an uploaded map image |

Templates are markdown strings pre-loaded into the editor when selected. The DM fills in the blanks and customizes.

### Template Selection UI

Add a "Start from template" option in the creation dialog alongside Write/Upload/Image:

```
┌─────────────────────────────────────────┐
│  New Handout                        [X] │
│                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────────┐   │
│  │ ✏️  │ │ 📄  │ │ 🖼️  │ │ 📋      │   │
│  │Write│ │ .md │ │Image│ │Template │   │
│  └─────┘ └─────┘ └─────┘ └─────────┘   │
└─────────────────────────────────────────┘
```

---

## Implementation Priority

| Priority | Feature | Effort | Impact |
|---|---|---|---|
| 1 | **Markdown rendering** on player side + DM preview | Small | High — handouts look polished immediately |
| 2 | **Staged reveal system** (draft/staged/published + quick reveal in session viewer) | Medium | High — core in-session workflow |
| 3 | **File upload** (.md files and images) | Medium | High — DM can author handouts outside the app |
| 4 | **Realtime notifications** for players | Small | High — the "wow" factor for live reveals |
| 5 | **Read tracking** + NEW badge | Small | Medium — useful for DM awareness |
| 6 | **Categories** | Small | Medium — organizational, becomes important as handout count grows |
| 7 | **Templates** | Small | Low — nice to have, speeds up creation |

### Dependencies

- `react-markdown` npm package (Priority 1)
- `@tailwindcss/typography` npm package (Priority 1)
- Supabase Storage bucket `handout-images` (Priority 3)
- Supabase Realtime enabled on `handouts` table (Priority 4)

---

## Updated Handout Manager UI (DM Side)

After improvements, the DM handout page should look like:

```
┌─────────────────────────────────────────────┐
│  Handouts                    [+ New Handout] │
│  Create and manage handouts for players      │
├─────────────────────────────────────────────┤
│                                             │
│  ⚡ READY TO REVEAL (2)                     │
│  ┌─────────────────────────────────────┐    │
│  │ 📄 A Letter Found on the Desk  [⚡] │    │
│  │    letter · staged                  │    │
│  ├─────────────────────────────────────┤    │
│  │ 🖼️ Map of the Lower Level     [⚡] │    │
│  │    map · staged                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  📢 PUBLISHED (3)                           │
│  ┌─────────────────────────────────────┐    │
│  │ 📄 Welcome to Candlekeep           │    │
│  │    lore · Read by 4/4 players  ✅   │    │
│  ├─────────────────────────────────────┤    │
│  │ 📄 Campaign House Rules            │    │
│  │    rules · Read by 3/4 players      │    │
│  │    ⚪ Marcus hasn't read this       │    │
│  ├─────────────────────────────────────┤    │
│  │ 📄 The Keeper's Offer (terms)      │    │
│  │    letter · Read by 2/4 players     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  📝 DRAFTS (1)                              │
│  ┌─────────────────────────────────────┐    │
│  │ 📄 Shemshime's Rhyme (Session 2)   │    │
│  │    letter · draft                   │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

The ⚡ button next to staged handouts is a one-tap publish. During a session, the DM scrolls to "Ready to Reveal" and taps ⚡. Players get notified instantly.

---

## Updated Player Handout View

```
┌─────────────────────────────────────────────┐
│  Handouts                                    │
│  From your DM                                │
├─────────────────────────────────────────────┤
│                                             │
│  🔴 NEW                                     │
│  ┌─────────────────────────────────────┐    │
│  │ The Keeper's Offer                  │    │
│  │ Published just now                  │    │
│  │                                     │    │
│  │ The Keeper of Tomes has extended    │    │
│  │ a formal offer to your party...     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  📚 LORE                                    │
│  ┌─────────────────────────────────────┐    │
│  │ Welcome to Candlekeep              │    │
│  │ Published 3 days ago               │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  📋 RULES                                   │
│  ┌─────────────────────────────────────┐    │
│  │ Campaign House Rules               │    │
│  │ Published 5 days ago               │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

New handouts appear at the top with a "NEW" indicator. Tapping opens the full rendered markdown content. Opening a handout marks it as read and removes the badge.
