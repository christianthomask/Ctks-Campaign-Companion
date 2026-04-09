# Next Up: Session Upload, Parser & Versioning

## Context
Phase 1 MVP (session viewer) should be complete or nearly complete. This adds the ability for the DM to upload session prep authored as markdown files, which the app parses into the structured JSON the viewer already renders.

## Read These Specs (in order)
1. `docs/AUTHORING_SPEC.md` — The markdown format definition. Every block type, syntax rules, and a complete example.
2. `docs/UPLOAD_FEATURE_SPEC.md` — Full feature spec: upload API route, parser architecture, versioning schema, UI components.

## Tasks

### 1. Database Migration
Add `session_versions` table and update `sessions` table per the schema in UPLOAD_FEATURE_SPEC.md. Run migration. Update RLS policies.

### 2. Build the Markdown Parser
`src/lib/parser/sessionParser.ts`

Pipeline: Raw markdown → frontmatter extraction → block tokenization → block parsing → aggregation → SessionContent JSON.

The parser must produce output matching the exact same `SessionContent` shape that the session viewer already consumes. The existing `data/sessions/joy-of-extradimensional-spaces.json` is the reference for the target output format.

Key libraries needed:
- `js-yaml` for frontmatter and stat block YAML parsing
- No generic markdown parser — write a custom tokenizer (see spec for why)

The parser should be **lenient**: only a missing `title` in frontmatter is a hard error. Everything else degrades gracefully (malformed stat block → rendered as code block, unknown callout type → generic callout).

### 3. Build the Upload API Route
`POST /api/sessions/upload` — multipart form upload accepting `.md` files. Validates, parses, handles versioning logic (new session vs. new version of existing session). See spec for full request/response contract.

### 4. Build Upload UI
- "Upload Session Prep" button on the Sessions list page
- File picker filtered to `.md`
- Upload progress indicator
- Success toast with version number → redirect to session viewer
- Error toast on failure

### 5. Build Version History Panel
- Accessible from session viewer toolbar (clock/history icon)
- Side panel (desktop) or bottom sheet (mobile)
- Lists all versions with timestamps and optional notes
- Tap to view old version (read-only, with banner)
- "Restore this version" creates a new version (numbers only go up)
- "Download .md" downloads raw markdown source of any version

### 6. Convert Session 1 to Markdown
Write `data/sessions/session-1-joy-of-extradimensional-spaces.md` — the existing JSON session content re-expressed in the authoring markdown format. This serves as:
- The primary test fixture for the parser
- A validation that the parser output matches the existing JSON
- A reference example for future session authoring

Run the parser on this file and diff the output against the existing JSON to verify parity.

### 7. Parser Tests
Unit tests covering the cases listed in UPLOAD_FEATURE_SPEC.md: frontmatter, each callout type, stat blocks, interaction tables, aggregation, and edge cases.

## Definition of Done
- DM can upload a `.md` file from the Sessions page
- The file is parsed and the session appears in the viewer, identical to the seed data experience
- Re-uploading creates a new version; old versions are viewable and restorable
- Raw markdown is downloadable from any version
- The existing Session 1 content roundtrips through markdown → parser → viewer without loss
