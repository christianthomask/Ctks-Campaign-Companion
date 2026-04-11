# Parser Improvements — Generic Appendices & ASCII Maps

## Problem 1: Appendices Only Support Two Table Formats

### Current Behavior

The parser (line 720-766 of `sessionParser.ts`) checks appendix tables for specific column names:
- If it finds a `d6`/`roll` column → `WhimsyEntry[]` (`{roll, description}`)
- If it finds a `thread` column → `LoreThread[]` (`{thread, clue, future}`)
- **Any other table format is silently dropped.** No error, no fallback — the appendix just renders empty.

This breaks tables like:
- Treasure Totals (columns: Room, Item, Value)
- Homebrew Modifications (columns: Change, Reason, Session)
- Player Impact Log (columns: Session, Event, Impact)
- Between-Session Rumor Table (columns: d6, What's New — close to Whimsy format but the description column header doesn't match)

### Fix: Add a Generic Table Appendix Type

**Type changes (`session.ts`):**

```typescript
// Add new generic table type
export interface GenericTableEntry {
  [key: string]: string;
}

// Extend Appendix content union
export interface Appendix {
  id: string;
  title: string;
  content: WhimsyEntry[] | LoreThread[] | GenericTableEntry[];
  headers?: string[]; // Column headers for generic tables
}
```

**Parser changes (`sessionParser.ts`, ~line 720-766):**

After the existing `hasRoll` and `hasThread` checks, add a fallback:

```typescript
if (hasRoll) {
  // ... existing WhimsyEntry logic (also update to match more d-column variants: "d6", "d8", "d10", "d12", "d20")
  // Also be more flexible on the description column — take the second column whatever it's called
  const entries = rows.map((row) => ({
    roll: parseInt(Object.values(row)[0] || "0", 10),
    description: Object.values(row)[1] || "",
  }));
  currentAppendix.content = entries;
} else if (hasThread) {
  // ... existing LoreThread logic
} else {
  // GENERIC TABLE FALLBACK — preserve all columns as-is
  const entries = rows.map((row) => ({ ...row }));
  currentAppendix.content = entries;
  currentAppendix.headers = headers;
}
```

**Renderer changes (`SessionViewer.tsx`, appendix rendering ~line 233):**

Add a third rendering branch for generic tables:

```tsx
{/* Check for generic table (has headers property) */}
{"headers" in appendix && appendix.headers ? (
  <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-700">
          {appendix.headers.map((header: string) => (
            <th key={header} className="px-3 py-2 text-left font-medium text-gray-400">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-700/50">
        {(appendix.content as Record<string, string>[]).map((row, i) => (
          <tr key={i}>
            {appendix.headers!.map((header: string) => (
              <td key={header} className="px-3 py-2 text-gray-300">
                {row[header] || "—"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
) : // ... existing whimsy/lore rendering
```

**Detection order:** WhimsyEntry → LoreThread → GenericTable (fallback). This means all existing appendices continue to work exactly as before. New table formats just fall through to the generic renderer.

---

## Problem 2: ASCII Maps Are Dropped

### Current Behavior

The tokenizer (line 95-111 of `sessionParser.ts`) handles fenced code blocks:
- If the language tag is `stat-block` → parsed as a stat block
- **Everything else is silently ignored** (line 109: "Other fenced blocks are ignored for now")

This means all ASCII maps wrapped in triple backticks — the mansion spatial map, the Candlekeep layout, the Firefly Cellar map — are invisible in the session viewer.

### Fix: Add an ASCII Map / Preformatted Text Token

**Tokenizer changes (`sessionParser.ts`, ~line 106-110):**

```typescript
if (lang === "stat-block") {
  tokens.push({ type: "stat-block", lines: blockLines });
} else {
  // Treat all other fenced blocks as preformatted content (maps, diagrams, etc.)
  tokens.push({ type: "preformatted", lines: blockLines, lang: lang || "text" });
}
```

**Type changes (`session.ts`):**

Add preformatted content to the Section interface:

```typescript
export interface Section {
  id: string;
  title: string;
  tags: string[];
  read_aloud?: string | null;
  description: string;
  dm_notes?: DmNote[];
  threats?: Threat[];
  interactions?: Interaction[];
  treasure?: TreasureEntry[];
  puzzle_book?: PuzzleBookEntry | null;
  lethality_warning?: string;
  connections?: string[];
  preformatted?: PreformattedBlock[]; // NEW
}

export interface PreformattedBlock {
  content: string;
  lang: string; // "text", or empty — could extend later for syntax highlighting
}
```

**Parser changes — section assembly:**

When the parser encounters a `preformatted` token while building a section, push it to the section's `preformatted` array:

```typescript
case "preformatted": {
  if (currentSection) {
    if (!currentSection.preformatted) currentSection.preformatted = [];
    currentSection.preformatted.push({
      content: token.lines.join("\n"),
      lang: token.lang || "text",
    });
  }
  break;
}
```

**Renderer changes (`RoomBlock.tsx`):**

Add rendering for preformatted blocks, placed after the description:

```tsx
{/* Preformatted content (ASCII maps, diagrams) */}
{section.preformatted?.map((block, i) => (
  <div
    key={`pre-${i}`}
    className="my-4 overflow-x-auto rounded-lg border border-gray-700 bg-gray-900 p-4"
  >
    <pre className="whitespace-pre text-xs leading-relaxed text-gray-300 font-mono">
      {block.content}
    </pre>
  </div>
))}
```

**Styling notes:**
- Use `whitespace-pre` to preserve exact spacing (critical for ASCII art)
- `overflow-x-auto` for horizontal scroll on mobile (maps are often wider than phone screens)
- `text-xs` and monospace font for dense map rendering
- Dark background (`bg-gray-900`) to make the map feel like a distinct panel
- On mobile, a pinch-to-zoom or horizontal scroll indicator would help with wide maps

---

## Implementation Priority

| Step | Work | Impact |
|---|---|---|
| 1 | Generic table appendix fallback | Small — one new type, one if/else branch, one render block. Fixes all current and future appendix tables. |
| 2 | Preformatted token type | Small — one new token type in existing code block handler (change "ignore" to "capture"). |
| 3 | Preformatted section field + parser | Small — new optional array on Section, one case in the switch. |
| 4 | Preformatted renderer | Small — one new block in RoomBlock.tsx with pre/code styling. |

Total effort: **Small.** Both features are fallback additions — they add handling for cases currently silently dropped, without changing any existing behavior.

---

## Test Cases

**Generic appendix — should render:**
```markdown
## Appendix: Treasure Totals

| Room | Item | Value |
|---|---|---|
| M3 | Jeweled letter opener | 20 gp |
| M15 | Moonstone ring | 50 gp |
```

**ASCII map — should render:**
````markdown
### Fortress Layout {tags: reference, map}

```
┌───────────────┐
│  INNER WARD   │
│               │
│  ╔═════════╗  │
│  ║ EMERALD ║  │
│  ║  DOOR   ║  │
│  ╚═════════╝  │
│               │
│  COURT OF AIR │
└───────────────┘
```
````

**Existing content — should NOT change:**
- WhimsyEntry tables (d6/roll column) → still render as before
- LoreThread tables (thread column) → still render as before
- stat-block fenced blocks → still parse as stat blocks
