# Player-Facing Features — Handoff

## Priority Order

1. **5e.tools Data Ingestion** (prerequisite for character creator)
2. **Character Creator** (must be ready before session 1)
3. **Character Sheet View** (players need this at the table)
4. **Cheat Sheets** (static reference pages, low effort, high value)
5. **Handout Viewer** (DM publishes, players view — post-session-1)

## Read These Specs

- `docs/CHARACTER_CREATOR_SPEC.md` — Full character creator flow, 5e.tools schema, data model, computed stats
- This file — cheat sheets content spec and handout viewer overview

## Cheat Sheets

Static reference pages accessible from the player dashboard under a "Quick Reference" tab. These are authored content baked into the app, not user-generated. They do NOT contain session-specific information.

### Implementation

- Build as a set of React components at `/player/reference`
- Tab or accordion navigation between sheets
- Styled consistently with the rest of the app (dark mode, readable)
- Searchable within the reference section
- No database required — these are static content

### Cheat Sheet Pages

**1. Your Turn in Combat**
```
On your turn, you can:

MOVE up to your speed (usually 30 ft.)
  You can split movement around your action.

Take one ACTION:
  Attack, Cast a Spell, Dash, Dodge, Disengage,
  Help, Hide, Ready, Search, Use an Object

Take one BONUS ACTION (if you have one):
  Some class features, spells, and abilities use 
  your bonus action. You only have one per turn.
  Not everyone has a bonus action available.

Take one FREE INTERACTION:
  Open a door, draw a weapon, pick up an item,
  speak a short sentence.

REACTION (not on your turn):
  Opportunity attack when an enemy leaves your 
  reach, or certain spells/features like Shield.
  You get one reaction per round.
```

**2. Actions in Combat**
```
ATTACK - Make a melee or ranged weapon attack.
  Roll d20 + attack bonus vs. target's AC.

CAST A SPELL - Use a spell you know/have prepared.
  Must have spell slots (or use a cantrip).

DASH - Double your movement for this turn.

DISENGAGE - Your movement doesn't provoke 
  opportunity attacks this turn.

DODGE - Attacks against you have disadvantage.
  You have advantage on Dex saves. Ends if you
  are incapacitated or your speed drops to 0.

HELP - Give an ally advantage on their next check
  or attack roll against a target within 5 ft.

HIDE - Make a Stealth check. If you succeed,
  you are unseen (advantage on attacks, enemies 
  have disadvantage to hit you).

READY - Prepare an action with a trigger.
  "When the goblin opens the door, I shoot it."
  Uses your reaction when triggered.

SEARCH - Make a Perception or Investigation check.

USE AN OBJECT - Interact with something that 
  requires your full action (e.g., drink a potion,
  use a complex device).
```

**3. How Skill Checks Work**
```
The DM asks for a check when the outcome is 
uncertain. You roll d20 + the relevant modifier.

ABILITY CHECK: d20 + ability modifier
SKILL CHECK: d20 + ability modifier + proficiency 
  bonus (if proficient in that skill)

ADVANTAGE: Roll 2d20, take the higher result.
DISADVANTAGE: Roll 2d20, take the lower result.

DIFFICULTY CLASSES:
  Very Easy: 5     Easy: 10     Medium: 15
  Hard: 20         Very Hard: 25     Nearly Impossible: 30

SKILLS BY ABILITY:
  Strength: Athletics
  Dexterity: Acrobatics, Sleight of Hand, Stealth
  Constitution: (no skills, but Con saves are common)
  Intelligence: Arcana, History, Investigation, 
    Nature, Religion
  Wisdom: Animal Handling, Insight, Medicine, 
    Perception, Survival
  Charisma: Deception, Intimidation, Performance, 
    Persuasion
```

**4. Conditions Quick Reference**
```
BLINDED - Can't see. Auto-fail sight checks.
  Attacks against you have advantage.
  Your attacks have disadvantage.

CHARMED - Can't attack the charmer.
  Charmer has advantage on social checks vs. you.

DEAFENED - Can't hear. Auto-fail hearing checks.

FRIGHTENED - Disadvantage on checks and attacks 
  while you can see the source of fear.
  Can't willingly move closer to the source.

GRAPPLED - Speed becomes 0. Ends if grappler is
  incapacitated or you are moved out of reach.

INCAPACITATED - Can't take actions or reactions.

INVISIBLE - Impossible to see without magic.
  Advantage on attacks. Attacks against you have
  disadvantage.

PARALYZED - Incapacitated, can't move or speak.
  Auto-fail Str and Dex saves. Attacks have 
  advantage. Melee hits are automatic crits.

PETRIFIED - Turned to stone. Incapacitated.
  Weight × 10. Resistant to all damage.

POISONED - Disadvantage on attacks and ability checks.

PRONE - Disadvantage on attacks. Melee attacks 
  against you have advantage. Ranged attacks
  against you have disadvantage. Standing costs 
  half your movement.

RESTRAINED - Speed 0. Attacks against you have
  advantage. Your attacks have disadvantage.
  Disadvantage on Dex saves.

STUNNED - Incapacitated, can't move, can only 
  speak falteringly. Auto-fail Str/Dex saves.
  Attacks against you have advantage.

UNCONSCIOUS - Incapacitated, can't move or speak.
  Drop everything, fall prone. Auto-fail Str/Dex
  saves. Attacks have advantage. Melee auto-crits.
```

**5. Death & Dying**
```
WHEN YOU DROP TO 0 HP:
  You fall unconscious and start making 
  death saving throws.

DEATH SAVING THROWS:
  At the start of each of your turns, roll a d20.
  10 or higher = success. 9 or lower = failure.
  3 successes = you stabilize (unconscious but safe).
  3 failures = you die.
  Rolling a 1 = counts as 2 failures.
  Rolling a 20 = you regain 1 HP and wake up!

TAKING DAMAGE AT 0 HP:
  Each hit = 1 automatic death save failure.
  A critical hit = 2 failures.

STABILIZING:
  Another creature can use an action to make a 
  Medicine check (DC 10) to stabilize you.
  Any healing (even 1 HP) wakes you up.

INSTANT DEATH:
  If damage remaining after hitting 0 HP equals
  or exceeds your max HP, you die instantly.
  (e.g., you have 12 max HP, you're at 5 HP,
  you take 17 damage → dead)
```

**6. Resting**
```
SHORT REST (1+ hours):
  Spend hit dice to regain HP.
  Roll your hit die + Con modifier per die spent.
  Some class features recharge on short rest.

LONG REST (8 hours, at least 6 sleeping):
  Regain ALL lost HP.
  Regain spent hit dice (up to half your total).
  Regain ALL spell slots.
  Most class features recharge.
  Can only benefit from 1 long rest per 24 hours.
```

**7. Spellcasting Basics** (shown only if character is a caster)
```
SPELL SLOTS:
  Slots are your "fuel" for casting spells.
  Each spell level requires a slot of that level
  or higher. Cantrips don't use slots.
  Slots recharge on a long rest (most classes).

CONCENTRATION:
  Some spells require concentration to maintain.
  You can only concentrate on one spell at a time.
  Taking damage → Con save (DC 10 or half the 
  damage, whichever is higher) or lose the spell.

SPELL SAVE DC:
  8 + proficiency bonus + spellcasting ability mod
  This is what enemies roll against.

SPELL ATTACK BONUS:
  Proficiency bonus + spellcasting ability mod
  Roll d20 + this vs. target's AC.

COMPONENTS:
  V (Verbal) - you must speak
  S (Somatic) - you need a free hand
  M (Material) - you need the listed material
    (or an arcane focus/component pouch)

RITUAL CASTING:
  Spells marked "ritual" can be cast without using
  a spell slot if you add 10 minutes to cast time.
```

### Cheat Sheet Rendering

- Each sheet should be a clean, monospace or semi-monospace layout optimized for scanning
- Dark background with high-contrast text
- Key terms in bold or accent color
- Collapsible sections for longer sheets (Conditions)
- A "search all cheat sheets" function that searches across all pages
- Consider adding the 5e.tools conditions data dynamically once ingested (for the Conditions sheet)

---

## Handout Viewer (Post-Session-1)

### Overview

The DM can publish handouts — short documents, images, or notes — that appear in the players' app. For now, handouts are party-wide (all players see them). Individual-player targeting is a future feature.

### Data Model

```sql
CREATE TABLE handouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('markdown', 'image', 'text')),
  content TEXT NOT NULL,          -- markdown text, image URL, or plain text
  image_url TEXT,                 -- for image handouts
  published_at TIMESTAMPTZ,      -- null = draft, set = published
  session_id UUID REFERENCES sessions(id),  -- optional: associate with a session
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE handouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DM full access" ON handouts FOR ALL USING (
  campaign_id IN (SELECT id FROM campaigns WHERE dm_user_id = auth.uid())
);

CREATE POLICY "Players can view published handouts" ON handouts FOR SELECT USING (
  published_at IS NOT NULL AND
  campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid())
);
```

### DM Side
- "Handouts" section in DM dashboard
- Create handout: title + markdown editor (simple, no rich text — just markdown) or image upload
- Publish/unpublish toggle — unpublished handouts are drafts only the DM sees
- Optionally associate with a session

### Player Side
- "Handouts" tab on player dashboard
- Shows published handouts in reverse chronological order
- Markdown handouts rendered with standard styling
- Image handouts shown inline (tappable to zoom)
- New handouts get a "NEW" badge until viewed
- No editing — read-only for players

### Implementation Priority
This is a post-session-1 feature. Build after the character creator and cheat sheets are done. The DM can use the existing player brief PDF/markdown for session 1 handouts.
