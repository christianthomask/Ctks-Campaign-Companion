---
title: Test Session
subtitle: Parser Test Fixture
level: 1
party_size: 3-4
duration: 2 hours
tone: Testing
lethality: Low
---

> [!setting]
> **Walls:** Gray stone
> **Floors:** Dark hardwood
> **Light:** Warm oil lamps
> **Sound:** Quiet

> [!npc] Test NPC
> **Location:** Room 1
> **Voice:** Calm and measured
> **Key Info:** Knows the way out

## Act 1: The Beginning {time: ~30 min}

### Scene 1: The Entry Hall {tags: intro, roleplay}

> [!read-aloud]
> You stand before a great stone archway. The air
> smells of old books and candle wax.

This is the entry hall. Players arrive here first.

> [!tip] Pacing Note
> Let the players explore for a few minutes before
> introducing the NPC.

| Action | Check | Result |
|---|---|---|
| Search the desk | Investigation DC 12 | Find a hidden key |
| Examine the door | Perception DC 10 | Notice scratch marks |

> [!treasure]
> - Hidden key — Plot item
> - Silver coin — 1 gp

### Scene 2: The Library {tags: exploration, puzzle}

> [!read-aloud]
> Shelves stretch from floor to ceiling, laden with
> ancient tomes. Dust motes dance in lamplight.

The library contains the first puzzle clue.

> [!warning] Trapped Shelf
> The third shelf from the left is trapped. DC 14
> to spot, DC 12 to disarm. 1d6 piercing on fail.

> [!puzzle-book] A
> **Location:** On the top shelf, behind a false book
> **Discovery:** Investigation DC 14 or Detect Magic
> **Illustration:** A key being turned in a lock

```stat-block
name: Animated Book
ac: 12
hp: 6 (1d6+3)
speed: 0 ft., fly 30 ft.
cr: 1/4
str: 6  dex: 14  con: 16  int: 1  wis: 3  cha: 1
attacks:
  - Slam: +4 to hit, 5 ft., 1d4+2 bludgeoning
abilities:
  - name: False Appearance
    desc: While motionless, indistinguishable from a normal book.
immunities: [poison, psychic]
condition_immunities: [blinded, charmed, deafened, frightened, paralyzed, petrified, poisoned]
senses: blindsight 60 ft.
languages: —
```

> [!lore] The Library's History
> This library was built by an archmage centuries ago.
> The books are magically preserved.

## Appendix: Random Events

| d4 | Event |
|---|---|
| 1 | A book falls off a shelf |
| 2 | The lights flicker |
| 3 | A distant door slams |
| 4 | Footsteps echo from above |
