# Feature Spec: Session Prep Upload & Versioning

## Overview

DMs author session prep as markdown files following the conventions in `AUTHORING_SPEC.md`. The app provides an upload flow that parses the markdown into structured JSON and stores it in Supabase. Previous versions are retained and accessible.

## User Flow

1. DM navigates to **Sessions** page in the DM dashboard
2. Clicks **"Upload Session Prep"** button
3. File picker opens — accepts `.md` files only
4. File is uploaded to an API route
5. API route parses the markdown into structured JSON
6. If a session with the same `title` exists, a new **version** is created
7. If no matching session exists, a new session is created at version 1
8. DM is redirected to the session viewer showing the new/updated content
9. A toast notification confirms: "Session uploaded (v3)" or "New session created"

## Versioning

### Database Changes

Add a `session_versions` table:

```sql
CREATE TABLE session_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,         -- parsed session content
  raw_markdown TEXT NOT NULL,      -- original markdown source
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,                      -- optional version note from DM
  UNIQUE (session_id, version_number)
);

-- RLS: DM full access
ALTER TABLE session_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DM full access to session versions"
  ON session_versions FOR ALL USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN campaigns c ON s.campaign_id = c.id
      WHERE c.dm_user_id = auth.uid()
    )
  );
```

Modify the `sessions` table to track the current version:

```sql
ALTER TABLE sessions ADD COLUMN current_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sessions ADD COLUMN raw_markdown TEXT;  -- current version's source
```

### Version Behavior

- **Upload new file, matching title:** Increments `current_version`, creates new `session_versions` row, updates `sessions.content` and `sessions.raw_markdown` to the latest.
- **Upload new file, new title:** Creates new `sessions` row at version 1, creates first `session_versions` row.
- **View old versions:** DM can access a version history panel showing all versions with timestamps. Tapping a version shows that version's content (read-only). The "current" badge marks the active version.
- **Restore old version:** DM can promote an old version to current. This creates a NEW version (copy) rather than rolling back — version numbers only go up.
- **Download source:** DM can download the raw markdown of any version.

## API Route: `/api/sessions/upload`

### Request
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: 
  - `file`: The `.md` file
  - `campaign_id`: UUID of the campaign
  - `notes`: Optional version note string

### Response
```json
{
  "session_id": "uuid",
  "version_number": 3,
  "title": "Session 1",
  "is_new": false,
  "message": "Session updated to version 3"
}
```

### Error Responses
- `400` — Invalid file type (not `.md`), parse failure, missing campaign_id
- `401` — Not authenticated
- `403` — Not the DM for this campaign
- `413` — File too large (limit: 500KB — more than enough for any session prep)
- `422` — Markdown parsed but missing required frontmatter fields (title)

### Processing Steps
1. Validate auth — user must be DM of the specified campaign
2. Validate file — must be `.md`, under 500KB, UTF-8
3. Read file content as string
4. Parse markdown using the parser (see below)
5. Check if a session with this title exists in the campaign
6. If exists: increment version, create version row, update session
7. If new: create session row and first version row
8. Return response

## The Markdown Parser

### Location
`src/lib/parser/sessionParser.ts`

### Architecture
The parser is a pipeline:

```
Raw Markdown String
  → Frontmatter Extractor (YAML → metadata object)
  → Block Tokenizer (split into typed blocks)
  → Block Parser (each block type → structured data)
  → Aggregator (collect NPCs, treasure, puzzle books into quick reference)
  → SessionContent JSON output
```

### Frontmatter Extractor
- Detects YAML between `---` delimiters at start of file
- Parses with a lightweight YAML parser (use `yaml` npm package or `js-yaml`)
- Returns metadata object + remaining markdown string

### Block Tokenizer
Walks through the markdown line by line and identifies block boundaries:

| Token Type | Trigger |
|---|---|
| `heading_2` | Line starts with `## ` |
| `heading_3` | Line starts with `### ` |
| `heading_4` | Line starts with `#### ` |
| `callout` | Line starts with `> [!` |
| `stat_block` | Line matches `` ```stat-block `` |
| `table` | Line starts with `\|` and next line is separator `\|---` |
| `body` | Everything else (paragraphs, lists, inline content) |

### Block Parsers

Each block type has a dedicated parser function:

**`parseCallout(lines: string[]): CalloutBlock`**
- Extracts type from `[!type]`
- Extracts optional title from same line
- Extracts body content (stripping `> ` prefixes)
- For typed callouts (npc, treasure, puzzle-book, setting): extracts key-value pairs from `**Key:** Value` patterns
- Returns typed block object

**`parseStatBlock(lines: string[]): StatBlock`**
- Extracts YAML content between fences
- Parses YAML into stat block object
- Normalizes ability scores (handles both one-line and multi-line formats)
- Parses attack strings into structured attack objects
- Returns StatBlock object matching the TypeScript interface

**`parseTable(lines: string[]): TableBlock`**
- Standard markdown table parser
- Detects interaction tables (first column header === "Action")
- Returns typed table object (interaction or generic)

**`parseHeading(line: string): HeadingBlock`**
- Extracts heading text
- Extracts `{key: value}` annotations (time, tags)
- Generates slug ID from heading text
- Returns heading block with metadata

**`parseBody(lines: string[]): BodyBlock`**
- Handles paragraphs, bold/italic, inline code, bullet lists, numbered lists
- Detects inline stat references: `{stat: name | AC X | HP X | CR X}`
- Returns body block with parsed inline elements

### Aggregator
After all blocks are parsed, the aggregator:
1. Collects all `[!npc]` blocks → builds NPC quick reference array
2. Collects all `[!treasure]` blocks → builds treasure summary
3. Collects all `[!puzzle-book]` blocks → builds puzzle tracker
4. Collects all `[!setting]` blocks before first Act → builds session setting
5. Assembles the final `SessionContent` JSON matching the schema in ARCHITECTURE.md

### Error Handling
- Missing frontmatter: Error — `title` is required
- Malformed YAML in stat block: Warning (logged), stat block rendered as raw code block
- Unrecognized callout type: Warning (logged), rendered as generic callout
- Malformed table: Warning, rendered as raw text
- The parser should be **lenient** — prefer degraded rendering over failure. Only missing `title` is a hard error.

## UI Components

### Upload Button (Sessions page)
- Prominent button: "Upload Session Prep"
- Opens native file picker filtered to `.md`
- Shows upload progress indicator
- On success: toast notification + redirect to session viewer
- On error: toast with error message, no redirect

### Version History Panel (Session viewer)
- Accessible via a "History" icon/button in the session viewer toolbar
- Slides in as a side panel (desktop) or bottom sheet (mobile)
- Shows list of versions:
  ```
  v3 (current) — uploaded Apr 8, 2026 2:15 PM
    "Added chained library combat notes"
  v2 — uploaded Apr 7, 2026 11:30 AM
    "Reworked puzzle to CHAPTER"  
  v1 — uploaded Apr 5, 2026 9:00 PM
  ```
- Tapping a version loads that version's content in the viewer (read-only, with a banner: "Viewing version 2 of 3")
- "Restore this version" button creates a new version from the old content
- "Download .md" button downloads the raw markdown source
- "Current" button returns to the active version

### Session List (DM dashboard)
- Shows all sessions for the campaign
- Each card shows: title, subtitle, version number, last updated
- Sort by session number or last updated
- Upload button accessible from this page

## Dependencies

Add to the project:
- `js-yaml` or `yaml` — YAML parser for frontmatter and stat blocks
- No markdown parser library needed — we write a custom tokenizer since we need specific block-type awareness that generic parsers don't provide

## Testing

The parser should have unit tests covering:
- Frontmatter extraction (valid, missing, partial)
- Each callout type (with title, without title, with key-value pairs)
- Stat block parsing (full block, minimal block, malformed YAML)
- Interaction table detection
- Aggregation of NPCs, treasure, puzzle books
- Edge cases: empty file, frontmatter only, no acts, nested callouts
- The complete example from AUTHORING_SPEC.md should parse without errors

## File Size Reference

The Session 1 JSON is ~1,019 lines / ~45KB. The equivalent markdown source will be roughly 600-800 lines / ~30KB. Well within the 500KB upload limit even for very detailed sessions.
