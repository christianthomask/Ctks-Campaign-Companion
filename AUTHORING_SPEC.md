# Session Prep Authoring Spec
## Markdown Format Reference

This document defines the markdown conventions used to author session prep documents for the Campaign Companion app. Files written in this format can be uploaded to the app, where a parser converts them into structured data for rendering.

The format is designed to:
- Read naturally as plain markdown in any editor (VS Code, Obsidian, GitHub)
- Be pleasant to author in conversation between a DM and Claude
- Parse unambiguously into typed UI components

---

## File Structure

Every session prep file follows this structure:

```
1. YAML frontmatter (session metadata)
2. Quick reference blocks (NPCs, puzzle tracker, setting details)
3. Act sections containing scene/room sections
4. Appendices
```

---

## 1. Frontmatter

YAML block at the top of the file. All fields are optional except `title`.

```yaml
---
title: Session 1
subtitle: The Joy of Extradimensional Spaces
level: 1
party_size: 3-4
duration: 5+ hours
tone: Whimsical & weird — magical curiosity cabinet with real teeth
lethality: Gloves off
command_word: CHAPTER
entry_word: scepter
---
```

| Field | Type | Purpose |
|---|---|---|
| `title` | string (required) | Session display title |
| `subtitle` | string | Adventure name or episode title |
| `level` | number | Recommended character level |
| `party_size` | string | Expected party size range |
| `duration` | string | Estimated session length |
| `tone` | string | Tone guidance for quick reference |
| `lethality` | string | Lethality level for quick reference |
| Any custom key | string | Stored as metadata, available in quick reference |

---

## 2. Section Headers

### Acts — Level 2 (`##`)

Acts are the major structural divisions of a session. They support an optional `{time: ...}` annotation.

```markdown
## Act 1: Candlekeep Arrival {time: ~30 min}
```

Parsed as:
- `id`: auto-generated slug (`act-1-candlekeep-arrival`)
- `title`: "Act 1: Candlekeep Arrival"
- `target_time`: "~30 min"

### Scenes/Rooms — Level 3 (`###`)

Individual scenes, rooms, or encounters within an act. Support `{tags: ...}` annotation for filtering and search.

```markdown
### M7. Dining Room {tags: upper-floor, combat, high-danger}
```

Parsed as:
- `id`: auto-generated slug (`m7-dining-room`)
- `title`: "M7. Dining Room"
- `tags`: ["upper-floor", "combat", "high-danger"]

### Subsections — Level 4 (`####`)

Optional subdivisions within a room. Not structurally significant — rendered as subheadings within the parent section.

```markdown
#### The Seventh Chair — MIMIC
```

---

## 3. Callout Blocks

Callout blocks use Obsidian-style syntax: `> [!type]` followed by indented content. They are the primary mechanism for typed content.

### Read-Aloud Text

Text the DM reads or paraphrases directly to players. Rendered in a warm amber box with serif font.

```markdown
> [!read-aloud]
> The fortress-library of Candlekeep rises from the
> cliffs of the Sword Coast like a crown of pale
> stone towers, ancient beyond reckoning.
```

**Parser rules:**
- All lines after `> [!read-aloud]` that begin with `> ` are the read-aloud content.
- The block ends at the first non-`>` line or a blank line without `>`.
- No title line — read-aloud blocks are always untitled.

### DM Notes

Contextual guidance for the DM. Four types, each rendered with a distinct color.

```markdown
> [!tip] Let Them Browse
> Give the party 5 minutes to poke around before
> the NPC approaches.

> [!warning] This Can Go South
> If they threaten the shopkeeper, the investigation
> collapses.

> [!lore] The Amalgamation Inc.
> A secret cabal of jackalweres replacing real books
> with monster-created fakes.

> [!rp] Playing Yalerion
> Nervous energy, talks with hands, avoids eye contact.
```

| Type | Rendered Color | Use Case |
|---|---|---|
| `tip` | Blue | Tactical DM advice, pacing suggestions |
| `warning` | Red | Danger alerts, things that can go wrong |
| `lore` | Purple | World lore, history, context the DM should know |
| `rp` | Green | Roleplay guidance, NPC voice notes, dialogue suggestions |

**Parser rules:**
- Text on the same line as `[!type]` after the type is the **title** (optional).
- Subsequent `> ` lines are the body content.
- Body content supports inline markdown (bold, italic, links).
- Body can contain line breaks — consecutive `> ` lines are joined as paragraphs, and `>` followed by a blank `>` line creates a paragraph break.

### Lethality Warning

A specialized danger callout for combat encounters. Rendered with a red border and ⚠️ icon.

```markdown
> [!danger]
> A mimic bite deals average 12 damage (1d8+3 + 1d8
> acid). Most level 1 PCs have 8-12 HP. **This can
> one-shot a PC.**
>
> Tactical outs: AC 12 means focus fire works.
> Alcohol or fire on adhesive could free a stuck
> character.
```

**Parser rules:**
- Same as DM notes but rendered with distinct "lethality" styling.
- Title line is optional (rarely used — the ⚠️ icon is sufficient).

### Treasure

A list of loot in the current section. Rendered as a compact tagged list.

```markdown
> [!treasure]
> - Jeweled letter opener — 20 gp
> - Matreous's coin purse — 15 gp, 22 sp
> - Wand (arcane focus) — Functional, nonmagical
> - Cold-iron figurine — Plot item
```

**Parser rules:**
- Each `- ` line is an item.
- The `—` (em dash) separates item name from value. If no em dash, the whole line is the item name with no value.
- Items are also aggregated into the session-level treasure summary in quick reference.

### Puzzle Book

Marks a puzzle book found in this room. Rendered as a compact info card.

```markdown
> [!puzzle-book] H
> **Location:** On the reading desk, near the letter opener
> **Discovery:** Passive Perception 12+ or thorough search
> **Illustration:** A cozy study with a cat on an armchair
```

**Parser rules:**
- The character after `[!puzzle-book]` is the **letter**.
- Body lines starting with `**Key:**` are parsed as key-value pairs.
- Expected keys: Location, Discovery, Illustration (all optional).
- Puzzle books are also aggregated into the session-level puzzle tracker.

### NPC

Defines or references an NPC. Rendered as a compact character card.

```markdown
> [!npc] Cumin
> **Location:** M6 Kitchen
> **Voice:** Fussy, clipped, anxious butler
> **Key Info:** Mansion layout, warns about dining room
```

**Parser rules:**
- Name follows `[!npc]` on the first line.
- Body lines with `**Key:**` are parsed as key-value pairs.
- Expected keys: Location, Voice, Key Info (all optional, additional keys allowed).
- NPCs are aggregated into the session-level NPC quick reference table.

### Setting

Session-level or location-level environment details. Rendered as an ambient reference panel.

```markdown
> [!setting]
> **Walls:** Gray stone, well-fitted
> **Floors:** Dark hardwood, mostly carpeted
> **Light:** Warm oil lamps. Windows show indigo miasma.
> **Sound:** Eerie quiet, distant sweeping, kitchen clatter
> **Resting:** Party can long rest freely. No time pressure.
```

**Parser rules:**
- `**Key:**` lines parsed as key-value pairs.
- Free-text lines (without keys) are treated as descriptive paragraphs.
- If placed before the first Act, it's session-level setting. If inside a section, it's local to that room.

---

## 4. Stat Blocks

Stat blocks use YAML inside a fenced code block with the `stat-block` language tag. They render as collapsible game-stat components — collapsed by default, showing name/AC/HP/CR on a single line.

````markdown
```stat-block
name: Mimic
ac: 12 (natural armor)
hp: 58 (9d8+18)
speed: 15 ft.
cr: 2
str: 17  dex: 12  con: 15  int: 5  wis: 13  cha: 8
attacks:
  - Pseudopod: +5 to hit, 5 ft., 1d8+3 bludgeoning. Target is grappled (escape DC 13) if mimic is in object form.
  - Bite: +5 to hit, 5 ft., 1d8+3 piercing + 1d8 acid. Only against grappled targets.
abilities:
  - name: Shapechanger
    desc: Can alter form to resemble a Medium object.
  - name: Adhesive (Object Form)
    desc: Adheres to anything that touches it. Grappled creature escapes DC 13 with disadvantage.
  - name: Grappler
    desc: Advantage on attacks against grappled creatures.
vulnerabilities: []
resistances: []
immunities: [acid]
condition_immunities: [prone (in object form)]
senses: darkvision 60 ft.
languages: —
```
````

**Parser rules for stat block YAML:**

| Field | Format | Notes |
|---|---|---|
| `name` | string (required) | Creature name |
| `ac` | string | Number, optionally followed by parenthetical note: `14 (chain shirt)` |
| `hp` | string | Number, optionally followed by formula: `58 (9d8+18)` |
| `speed` | string | Full speed string including special movement |
| `cr` | string | Challenge rating, can be fraction: `1/2` |
| `str/dex/con/int/wis/cha` | numbers | Can be on one line separated by spaces or on individual lines |
| `attacks` | list of strings | Each entry: `Name: +X to hit, reach, damage. Effects.` |
| `abilities` | list of {name, desc} | Special abilities, traits, actions |
| `vulnerabilities` | list of strings | Damage vulnerabilities |
| `resistances` | list of strings | Damage resistances |
| `immunities` | list of strings | Damage immunities |
| `condition_immunities` | list of strings | Condition immunities |
| `senses` | string | Sensory abilities |
| `languages` | string | Languages spoken |

**Multiple stat blocks per section are allowed.** Each gets its own fenced block.

**Inline stat references** for minor creatures that don't need a full block can use a single-line shorthand anywhere in body text:

```markdown
The cat is a perfectly normal cat. `{stat: cat | AC 12 | HP 2 | CR 0}`
```

These render as tappable inline badges that expand to show the brief stats.

---

## 5. Interaction Tables

Standard markdown tables with specific column headers are parsed as interaction tables — the check/result reference a DM uses when players search a room.

```markdown
| Action | Check | Result |
|---|---|---|
| Search the desk | Investigation DC 12 | Find the forged receipt |
| Examine the book | Arcana DC 13 | Decipher the command word "scepter" |
| Talk to the cat | Animal Handling DC 10 | It leads you to the kitchen |
| Cast Detect Magic | — | Faint conjuration permeates the room |
```

**Parser rules:**
- A table is recognized as an interaction table if its first column header is exactly `Action`.
- The `Check` column can contain `—` or be empty for actions with no check.
- Interaction tables are searchable — the Action and Result columns are indexed.

Other tables (without `Action` as the first header) are rendered as generic tables.

---

## 6. Appendices

Sections after the last act. Use level 2 headers (`##`) prefixed with "Appendix" or placed after an explicit appendix divider.

```markdown
## Appendix: Whimsy & Weirdness Table

| d10 | Weird Thing |
|---|---|
| 1 | A book on a shelf is snoring softly. |
| 2 | A painting follows the party with its eyes. |
```

**Parser rules:**
- Any `##` header containing "Appendix" is parsed as an appendix section.
- Alternatively, a horizontal rule (`---`) followed by `## Appendices` marks the start of the appendix zone — all subsequent `##` headers are appendices.

---

## 7. Body Text

Everything that isn't a callout, stat block, table, or header is **body text**. It's the DM's prose description of the room, scene, or situation. Rendered as standard paragraphs with support for:

- **Bold** and *italic* for emphasis
- `code` for game terms, command words, or dice notation
- [Links] for cross-references (future: deep links to other sections or reference entries)
- Bullet lists for short enumerations
- Numbered lists for ordered sequences

Body text is always DM-facing — it's never read to players (that's what `[!read-aloud]` is for).

---

## 8. Cross-References (Future)

Section references using `[[section-id]]` syntax will eventually render as tappable links that scroll to the referenced section:

```markdown
The mimic escaped from the menagerie ([[m19-menagerie]]).
```

For now, the parser stores these as metadata but the app renders them as plain text. Full cross-reference linking is a future feature.

---

## Complete Minimal Example

```markdown
---
title: Session 2
subtitle: Mazfroth's Mighty Digressions
level: 2
party_size: 3-4
duration: 4-5 hours
tone: Investigative noir
lethality: Moderate
---

> [!setting]
> **Location:** Baldur's Gate, The Wide (marketplace)
> **Time:** Late afternoon, overcast
> **Mood:** Bustling commerce masking quiet tension

> [!npc] Yalerion Highscroll
> **Location:** Amberdune Books (The Wide)
> **Voice:** Nervous, talks fast, avoids eye contact
> **Key Info:** Bought books from a mysterious seller, one killed his assistant

## Act 1: The Bookshop {time: ~45 min}

### Scene 1: Amberdune Books {tags: baldurs-gate, roleplay, investigation}

> [!read-aloud]
> The bookshop is narrow and tall, crammed floor to
> ceiling with volumes that lean against each other
> like drunken friends. The smell of old paper and
> candle wax is overwhelming. Behind the counter, a
> thin man in ink-stained robes looks up with the
> expression of someone expecting bad news.

Yalerion Highscroll is the owner. He's been selling
books acquired from a mysterious source — and one of
those books turned out to be a **gingwatzim** in
disguise, which killed his assistant three days ago.

> [!tip] Let Them Browse First
> Give the party a few minutes to look around and
> ask casual questions before Yalerion breaks down
> and confesses what happened.

| Action | Check | Result |
|---|---|---|
| Browse the shelves | — | Mostly mundane books, but three have an odd shimmer |
| Examine shimmering books | Arcana DC 14 | Faint transmutation magic — these aren't real books |
| Question Yalerion | Persuasion DC 10 | He confesses everything, tearfully |

> [!treasure]
> - 3 suspicious books — Plot items (possible gingwatzim)
> - Yalerion's payment ledger — Shows seller contact info

> [!warning] The Books Might Be Alive
> If a player handles one of the shimmering books
> roughly, it could revert to gingwatzim form. This
> is an optional early combat — deploy if the table
> needs action.

```stat-block
name: Gingwatzim
ac: 14
hp: 36 (8d8)
speed: 30 ft., fly 30 ft.
cr: 2
str: 14  dex: 18  con: 10  int: 6  wis: 10  cha: 6
attacks:
  - Claw: +6 to hit, 5 ft., 1d6+4 slashing
abilities:
  - name: Shapechanger
    desc: Can assume the form of a book or a winged humanoid. Reverts on death.
  - name: Antimagic Susceptibility
    desc: Incapacitated in an antimagic field.
immunities: [poison, psychic]
condition_immunities: [charmed, frightened, poisoned]
```
```

---

## Parser Behavior Notes

1. **Order matters within a section.** The parser preserves the order of blocks as they appear in the markdown. The app renders them in the same sequence.

2. **Aggregation.** `[!npc]`, `[!puzzle-book]`, and `[!treasure]` blocks are both rendered inline AND aggregated into the session-level quick reference panel.

3. **Graceful degradation.** Unrecognized callout types (e.g., `[!custom]`) are rendered as generic callout boxes with the type as a label. The parser never fails on unknown types.

4. **Whitespace tolerance.** Extra blank lines between blocks are ignored. Indentation inside callouts is normalized.

5. **UTF-8 required.** Files must be UTF-8 encoded.

6. **File extension.** `.md` files only. The upload endpoint rejects other formats.
