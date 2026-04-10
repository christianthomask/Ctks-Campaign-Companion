# DM Session Viewer — Quality of Life Improvements

## What This Covers

These are improvements to the DM-facing session viewer that reduce friction during a live session. Focused entirely on making it easier to run the game from a phone without flipping between apps, scribbling on paper, or losing your place.

Prioritized by "how often will this save me during a 5-hour session."

---

## Priority 1: Combat HP Tracker on Stat Blocks

### The Problem

The stat block shows `HP: 58` but there's no way to track current HP during combat. The DM is either keeping it in their head (bad after hour 3) or scribbling on paper (defeats the purpose of the app). This is the single most frequent manual tracking task during play.

### The Fix

Add an interactive HP tracker to the stat block collapsed header AND the expanded view.

**Collapsed view (current):**
```
Mimic                    AC 12  HP 58  CR 2  [v]
```

**Collapsed view (improved):**
```
Mimic          AC 12  HP 43/58  CR 2  [-] [+] [v]
```

**Implementation:**
- Add `currentHp` state to `StatBlockCard`, initialized to `stat_block.hp`
- `[-]` and `[+]` buttons adjust HP by a tappable amount
- **Tap** [-] or [+] = adjust by 1
- **Long press** [-] or [+] = open a number input to subtract/add a specific amount (e.g., player rolls 14 damage — long press minus, type 14, confirm)
- HP bar changes color: green (>50%), yellow (25-50%), red (<25%), black with skull icon (0 = dead)
- Persist HP state in the `session_state` JSONB alongside puzzle tracker data (key: `monster_hp:{section_id}:{monster_name}`)
- **Reset button** (small, in expanded view) to restore to max HP — for when you spawn a second mimic or need a fresh encounter

**The expanded stat block should also show the HP tracker prominently at the top**, not buried in the stat list.

### Multiple Instances

Sometimes you have 2 flying swords or 2 faerie dragons. Add a small "x2" count display and let the DM track HP for each individually:

```
Flying Sword (1)    AC 17  HP 12/17  [-] [+]
Flying Sword (2)    AC 17  HP 17/17  [-] [+]
```

The instance count should be editable — if the DM wants to add a third, they can tap a [+instance] button. Default to 1 instance per stat block.

---

## Priority 2: Setting Details in Quick Reference

### The Problem

The `[!setting]` callout gets parsed into `quick_reference.setting` with fields for walls, floors, doors, light, miasma, atmosphere, sound, resting, and ceilings. But this data is **never rendered in the UI.** The DM has no quick way to answer "what are the walls made of?" or "how high are the ceilings?" without scrolling to the top of the session.

### The Fix

Add a **Setting** tab to the quick reference panel (alongside NPCs, Puzzles, Treasure, Map).

```
TABS: [NPCs] [Puzzles] [Treasure] [Setting] [Map]
```

The Setting tab renders each field as a compact key-value pair:

```
┌──────────────────────────────────┐
│  SETTING                         │
│                                  │
│  Walls      Gray stone           │
│  Floors     Dark hardwood        │
│  Doors      Ironbound oak, brass │
│  Light      Warm oil lamps       │
│  Ceilings   10 feet              │
│  Atmosphere Well-maintained      │
│  Sound      Distant sweeping     │
│  Resting    Long rest anywhere   │
│  Miasma     Exhaustion outside   │
└──────────────────────────────────┘
```

This is the description your players never hear verbatim but you constantly reference when they ask "can I see?" or "is there light?" or "how tall is this room?"

---

## Priority 3: Read-Aloud Fullscreen Mode

### The Problem

Read-aloud text is styled beautifully (serif italic, amber border) but on a phone screen, only 3-4 lines are visible at a time. The DM is reading aloud while scrolling, which breaks eye contact with the table and causes stumbles. Long read-aloud blocks (like the M3 library entrance) are especially awkward.

### The Fix

**Tap the read-aloud block to enter fullscreen reading mode.**

Fullscreen mode:
- Black background, centered text
- Larger font (18-20px), generous line height
- Full screen, no chrome — no header, no nav, no other content
- Text scrolls vertically with a large tap target
- **Tap anywhere** or **swipe down** to dismiss and return to normal view
- Optional: auto-scroll at a configurable reading pace (like a teleprompter)

This lets the DM hold their phone up slightly and read without squinting or scrolling manually. It's a presentation mode — the phone becomes a cue card.

---

## Priority 4: Mobile Table of Contents

### The Problem

The sidebar TOC is desktop-only (`hidden md:block`). On mobile, the only way to navigate is scrolling or search. In a 773-line session with 19 rooms across 3 acts, finding M13 by scrolling is slow. Search works but requires knowing the room name.

### The Fix

Add a mobile-accessible TOC as a **slide-up drawer** triggered by tapping the session title in the header.

**Trigger:** Tap the title "The Joy of Extradimensional Spaces" in the sticky header.

**Drawer behavior:**
- Slides up from bottom (same pattern as quick reference panel)
- Shows the full act → section hierarchy
- Each section is tappable → scrolls to that section and dismisses the drawer
- Current section is highlighted (based on scroll position)
- Shows room tags next to section names for quick scanning:
  ```
  Act 2: The Mansion
    M1. Foyer
    M2. Hallway
    M3. Library                 🔴 combat
    M4. Exercise Room
    M5. Study                   ⭐ key
    M6. Kitchen                 🎭 roleplay
    M7. Dining Room             🔴 danger
    ...
  ```

**Active section tracking:** Use an IntersectionObserver on section headings to track which section is currently visible. Highlight it in the TOC. This also enables a subtle breadcrumb in the header: the sticky header could show the current room name alongside the session title.

---

## Priority 5: Quick Dice Roller

### The Problem

The DM constantly needs to roll dice during play — damage rolls, ability checks, random table results. Currently they're using physical dice (fine) or a separate app (friction). A built-in roller keeps everything in one place.

### The Fix

Add a **dice roller** accessible from the sticky header. Small die icon button.

**Tap** the die icon → a compact roller appears below the header:

```
┌──────────────────────────────────────────┐
│  [d4] [d6] [d8] [d10] [d12] [d20] [d%]  │
│                                          │
│         🎲  17                           │
│         (1d20)                           │
│                                          │
│  Last: 14 (2d6+3)   [Roll Again]        │
└──────────────────────────────────────────┘
```

**Behavior:**
- Tap a die button → rolls one of that die, shows result with animation
- **Quick modifiers:** After rolling, show [+1] [+2] [+3] [+5] buttons to add common modifiers
- **Custom roll input:** A text field for expressions like `2d6+3` or `4d6k3` (keep highest 3)
- **History:** Show last 3-5 rolls in a small scrollable row
- The roller stays open until dismissed — you'll roll multiple times per combat round
- **Sound:** Optional subtle dice-roll sound effect (toggleable)

This doesn't need to be a full VTT dice engine. Just fast d20s, damage dice, and the occasional 2d6+3.

---

## Priority 6: Session Pacing Timer

### The Problem

The session has target times per act ("Act 1: ~30 min", "Act 2: ~3.5 hours") but there's no actual clock. After 3 hours the DM has no idea if they're on pace or running behind. This matters for a 5+ hour session where you need to hit the campaign hook before people leave.

### The Fix

Add a small **session timer** to the sticky header bar.

**Display:** A subtle elapsed time counter in the header:

```
┌─────────────────────────────────────────────┐
│  The Joy of Extradimensional Spaces   2:34  │
│  Session 1                          ⏱️ ⚙️  │
└─────────────────────────────────────────────┘
```

**Behavior:**
- **Starts manually** — the DM taps the timer to start when the session begins
- Shows elapsed time in `H:MM` format
- Tap the timer to pause/resume (for breaks)
- The timer icon subtly changes color based on pacing:
  - Green: on pace for current act's target time
  - Yellow: running 20%+ over the act target
  - Red: significantly behind
- **Pacing is calculated** from act target times in the session metadata. If Act 1 targets 30 min and the DM is still in Act 1 at 0:45, the timer goes yellow.

**Persist across page refreshes** — store start time and pause state in `session_state`.

---

## Priority 7: NPC Quick-Nav Links

### The Problem

The NPC quick reference cards show name, location, voice, and key info. But if the DM wants to see the full context for an NPC (their room description, interaction table, etc.), they have to close the quick reference, search for the room, and scroll to it.

### The Fix

Add a **"Go to room"** link on each NPC card in the quick reference.

```
┌─────────────────────────────────────┐
│  Cumin                              │
│  M6 Kitchen                  [→ Go] │
│  Voice: Fussy, clipped, anxious     │
│  Key Info: Mansion layout, warns    │
│  about dining room                  │
└─────────────────────────────────────┘
```

Tapping [→ Go] scrolls to that NPC's section, closes the quick reference panel, and briefly highlights the section header with a flash animation so the DM can see where they landed.

This requires matching NPC locations to section IDs. The parser already stores NPC locations ("M6 Kitchen") — the link just needs to find the section whose title contains "M6" or "Kitchen" and scroll to it.

---

## Priority 8: Collapsible Room Sections

### The Problem

When the DM is in M7 (Dining Room) running the mimic fight, they don't need to see M1-M6 above them. But they can't collapse completed rooms. The session is one long scroll, and rooms they've already run take up visual space and make scrolling to the current room slower.

### The Fix

Add a **collapse/expand toggle** on each room section header.

**Tap the room title** (or a small chevron) to collapse a room to just its header:

```
M3. Library 🔴 combat                          [⌄]
─────────────────────────────────────────────────
M4. Exercise Room                               [⌄]
─────────────────────────────────────────────────
M5. Study ⭐ key                                [⌄]
─────────────────────────────────────────────────
M6. Kitchen 🎭 roleplay                         [⌃]
  [full room content visible]
```

**Behavior:**
- Collapsed rooms show just the title + tags
- Tapping expands back to full content
- **Persist collapse state** in session_state so rooms stay collapsed across refreshes
- **"Collapse all above"** convenience: when the DM scrolls to a new room, offer a subtle button to collapse all rooms above the current one

This dramatically reduces scroll distance as the session progresses. By Act 3, the DM might have 15 rooms collapsed above them, making navigation instant.

---

## Implementation Summary

| Priority | Feature | Effort | Impact During Session |
|---|---|---|---|
| 1 | HP Tracker on stat blocks | Medium | Every combat encounter, multiple times per round |
| 2 | Setting tab in quick ref | Small | Every time a player asks about the environment |
| 3 | Read-aloud fullscreen | Small | Every read-aloud block (15+ times per session) |
| 4 | Mobile TOC | Medium | Every time DM needs to navigate (dozens of times) |
| 5 | Dice roller | Medium | Dozens of times per session |
| 6 | Session pacing timer | Small | Continuous passive awareness |
| 7 | NPC quick-nav links | Small | Several times per session |
| 8 | Collapsible rooms | Medium | Increasing value as session progresses |

**For session 1, priorities 1-4 are the highest impact.** The HP tracker alone will save you from scribbling on paper during every combat. The setting details tab prevents the most common "uh, let me check" moment. Read-aloud fullscreen makes the most important dramatic moments smoother. And mobile TOC eliminates the "scroll scroll scroll to find M13" problem.

Priorities 5-8 are excellent quality of life but the session will run fine without them.
