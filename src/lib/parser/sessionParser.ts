import yaml from "js-yaml";
import type {
  SessionContent,
  Act,
  Section,
  DmNote,
  Threat,
  StatBlock,
  Attack,
  SpecialAbility,
  Interaction,
  TreasureEntry,
  NpcEntry,
  PuzzleEntry,
  PuzzleBookEntry,
  Appendix,
  Abilities,
  SettingDetails,
  QuickReference,
  SessionMeta,
} from "@/lib/types/session";

// ---------------------------------------------------------------------------
// Block types emitted by the tokenizer
// ---------------------------------------------------------------------------

type BlockType =
  | "callout"
  | "heading"
  | "stat-block"
  | "table"
  | "body"
  | "frontmatter";

interface Token {
  type: BlockType;
  /** For headings: 2, 3, 4. For callouts: the callout type string. */
  subtype?: string;
  /** Raw heading / callout title text */
  title?: string;
  /** Level for headings */
  level?: number;
  /** Body lines of the block */
  lines: string[];
  /** Annotations extracted from heading (e.g. time, tags) */
  annotations?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// 1. Frontmatter Extractor
// ---------------------------------------------------------------------------

function extractFrontmatter(markdown: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const trimmed = markdown.trimStart();
  if (!trimmed.startsWith("---")) {
    return { frontmatter: {}, body: markdown };
  }

  const endIdx = trimmed.indexOf("---", 3);
  if (endIdx === -1) {
    return { frontmatter: {}, body: markdown };
  }

  const yamlStr = trimmed.slice(3, endIdx).trim();
  const body = trimmed.slice(endIdx + 3);

  let frontmatter: Record<string, unknown> = {};
  try {
    const parsed = yaml.load(yamlStr);
    if (parsed && typeof parsed === "object") {
      frontmatter = parsed as Record<string, unknown>;
    }
  } catch (e) {
    console.warn("Failed to parse frontmatter YAML:", e);
  }

  return { frontmatter, body };
}

// ---------------------------------------------------------------------------
// 2. Block Tokenizer
// ---------------------------------------------------------------------------

function tokenize(body: string): Token[] {
  const lines = body.split("\n");
  const tokens: Token[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // --- Fenced code block (stat-block or generic) ---
    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().replace(/^`{3,}\s*/, "").toLowerCase();
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        blockLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence

      if (lang === "stat-block") {
        tokens.push({ type: "stat-block", lines: blockLines });
      }
      // Other fenced blocks are ignored for now
      continue;
    }

    // --- Heading ---
    const headingMatch = line.match(/^(#{2,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      let titleText = headingMatch[2].trim();
      const annotations: Record<string, string> = {};

      // Extract {key: value} annotations from end of title
      const annoMatch = titleText.match(/\{([^}]+)\}\s*$/);
      if (annoMatch) {
        titleText = titleText.slice(0, annoMatch.index).trim();
        const annoStr = annoMatch[1];
        // Parse key: value pairs
        const pairs = annoStr.split(",").map((s) => s.trim());
        for (const pair of pairs) {
          const colonIdx = pair.indexOf(":");
          if (colonIdx !== -1) {
            const key = pair.slice(0, colonIdx).trim();
            const val = pair.slice(colonIdx + 1).trim();
            annotations[key] = val;
          }
        }
      }

      tokens.push({
        type: "heading",
        level,
        title: titleText,
        lines: [],
        annotations,
      });
      i++;
      continue;
    }

    // --- Callout block (> [!type] ...) ---
    if (line.match(/^>\s*\[!/)) {
      const calloutHeader = line.match(/^>\s*\[!([^\]]+)\]\s*(.*)/);
      const calloutType = calloutHeader ? calloutHeader[1].toLowerCase() : "tip";
      const calloutTitle = calloutHeader ? calloutHeader[2].trim() : "";
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].startsWith(">")) {
        // Strip the leading > and optional space
        const content = lines[i].replace(/^>\s?/, "");
        blockLines.push(content);
        i++;
      }
      tokens.push({
        type: "callout",
        subtype: calloutType,
        title: calloutTitle,
        lines: blockLines,
      });
      continue;
    }

    // --- Table ---
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      tokens.push({ type: "table", lines: tableLines });
      continue;
    }

    // --- Blank lines: skip ---
    if (line.trim() === "") {
      i++;
      continue;
    }

    // --- Body text (paragraphs, bullet lists, etc.) ---
    const bodyLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].match(/^(#{2,4})\s+/) &&
      !lines[i].trimStart().startsWith("```") &&
      !lines[i].match(/^>\s*\[!/) &&
      !(lines[i].includes("|") && lines[i].trim().startsWith("|"))
    ) {
      bodyLines.push(lines[i]);
      i++;
    }
    if (bodyLines.length > 0) {
      tokens.push({ type: "body", lines: bodyLines });
    }
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// 3. Block Parsers
// ---------------------------------------------------------------------------

/** Generate a URL-friendly slug from a title */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/** Parse **Key:** Value lines from callout body */
function parseKeyValueLines(lines: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  let currentKey = "";
  let currentVal = "";

  for (const line of lines) {
    const kvMatch = line.match(/^\*\*([^*]+):\*\*\s*(.*)/);
    if (kvMatch) {
      // Save previous entry
      if (currentKey) {
        result[currentKey] = currentVal.trim();
      }
      currentKey = kvMatch[1].trim();
      currentVal = kvMatch[2];
    } else if (currentKey) {
      // Continuation line
      currentVal += " " + line;
    }
  }
  if (currentKey) {
    result[currentKey] = currentVal.trim();
  }
  return result;
}

/** Parse a treasure callout into TreasureEntry[] */
function parseTreasureCallout(
  lines: string[],
  room: string
): TreasureEntry[] {
  const entries: TreasureEntry[] = [];
  for (const line of lines) {
    // Match lines like "- Item Name — Value" or "- Item Name - Value" (em dash or hyphen)
    const match = line.match(/^[-*]\s+(.+?)\s*[—–]\s*(.+)$/);
    if (match) {
      entries.push({
        room,
        item: match[1].trim(),
        value: match[2].trim(),
      });
    }
  }
  return entries;
}

/** Parse an NPC callout into an NpcEntry */
function parseNpcCallout(name: string, lines: string[]): NpcEntry {
  const kv = parseKeyValueLines(lines);
  return {
    name,
    location: kv["Location"] || "",
    voice: kv["Voice"] || "",
    key_info: kv["Key Info"] || "",
  };
}

/** Parse a puzzle-book callout into a PuzzleBookEntry */
function parsePuzzleBookCallout(
  letter: string,
  lines: string[]
): PuzzleBookEntry {
  const kv = parseKeyValueLines(lines);
  return {
    letter: letter.trim(),
    location_description: kv["Location"] || "",
    discovery: kv["Discovery"] || "",
    illustration: kv["Illustration"] || "",
  };
}

/** Parse a setting callout into SettingDetails */
function parseSettingCallout(lines: string[]): SettingDetails {
  const kv = parseKeyValueLines(lines);
  return {
    walls: kv["Walls"] || "",
    floors: kv["Floors"] || "",
    doors: kv["Doors"] || "",
    light: kv["Light"] || "",
    miasma: kv["Miasma"] || "",
    atmosphere: kv["Atmosphere"] || "",
    sound: kv["Sound"] || "",
    resting: kv["Resting"] || "",
    ceilings: kv["Ceilings"] || "",
  };
}

/** Parse AC field: "12 (natural armor)" -> { ac: 12, ac_note: "natural armor" } */
function parseAC(val: string): { ac: number; ac_note?: string } {
  const match = val.match(/^(\d+)\s*(?:\(([^)]+)\))?/);
  if (match) {
    return {
      ac: parseInt(match[1], 10),
      ac_note: match[2] || undefined,
    };
  }
  return { ac: parseInt(val, 10) || 0 };
}

/** Parse HP field: "58 (9d8+18)" -> { hp: 58, hp_formula: "9d8+18" } */
function parseHP(val: string): { hp: number; hp_formula: string } {
  const match = val.match(/^(\d+)\s*(?:\(([^)]+)\))?/);
  if (match) {
    return {
      hp: parseInt(match[1], 10),
      hp_formula: match[2] || "",
    };
  }
  return { hp: parseInt(val, 10) || 0, hp_formula: "" };
}

/** Parse ability scores from either one line or separate lines */
function parseAbilities(raw: Record<string, unknown>): Abilities | undefined {
  // Check for individual keys first
  if (raw.str !== undefined) {
    return {
      str: Number(raw.str) || 0,
      dex: Number(raw.dex) || 0,
      con: Number(raw.con) || 0,
      int: Number(raw.int) || 0,
      wis: Number(raw.wis) || 0,
      cha: Number(raw.cha) || 0,
    };
  }
  return undefined;
}

/** Parse an attack string like "Pseudopod: +5 to hit, 5 ft., 1d8+3 bludgeoning." */
function parseAttackString(str: string): Attack {
  // Format: "Name: +X to hit, reach, damage type. Effects."
  const nameMatch = str.match(/^([^:]+):\s*(.*)/);
  const name = nameMatch ? nameMatch[1].trim() : str;
  const rest = nameMatch ? nameMatch[2] : "";

  // Parse "+X to hit"
  const toHitMatch = rest.match(/([+-]\d+)\s*to hit/);
  const toHit = toHitMatch ? parseInt(toHitMatch[1], 10) : 0;

  // Split by commas to get parts
  const parts = rest.split(",").map((p) => p.trim());

  // Reach is usually the second part (after to hit)
  let reach = "";
  let damageStr = "";
  let effects: string | undefined;

  for (let idx = 0; idx < parts.length; idx++) {
    const part = parts[idx];
    if (part.match(/to hit/)) continue;
    if (part.match(/ft\./)) {
      reach = part;
      continue;
    }
    // Remaining parts are damage
    if (!damageStr) {
      damageStr = part;
    } else {
      damageStr += ", " + part;
    }
  }

  // Parse damage: "1d8+3 bludgeoning. Effects here."
  let damage = "";
  let damageType = "";

  // Split on period to separate damage from effects
  const periodIdx = damageStr.indexOf(".");
  let damageMain = periodIdx !== -1 ? damageStr.slice(0, periodIdx) : damageStr;
  const afterPeriod =
    periodIdx !== -1 ? damageStr.slice(periodIdx + 1).trim() : "";
  if (afterPeriod) {
    effects = afterPeriod.replace(/\.$/, "").trim() || undefined;
  }

  // Extract damage dice and type
  damageMain = damageMain.trim();
  const dmgMatch = damageMain.match(/^(\d+d\d+(?:[+-]\d+)?)\s*(.*)/);
  if (dmgMatch) {
    damage = dmgMatch[1];
    damageType = dmgMatch[2].trim().replace(/\.$/, "");
  } else {
    damage = damageMain;
  }

  return {
    name,
    to_hit: toHit,
    reach,
    damage,
    damage_type: damageType,
    effects,
  };
}

/** Parse a stat-block fenced code block into a StatBlock */
function parseStatBlock(lines: string[]): StatBlock | null {
  try {
    const yamlStr = lines.join("\n");
    const raw = yaml.load(yamlStr) as Record<string, unknown>;
    if (!raw || typeof raw !== "object") return null;

    const acParsed = parseAC(String(raw.ac || "0"));
    const hpParsed = parseHP(String(raw.hp || "0"));
    const abilities = parseAbilities(raw);

    // Parse attacks
    const attacks: Attack[] = [];
    if (Array.isArray(raw.attacks)) {
      for (const atk of raw.attacks) {
        if (typeof atk === "string") {
          attacks.push(parseAttackString(atk));
        } else if (typeof atk === "object" && atk !== null) {
          // Object format: { Pseudopod: "+5 to hit, 5 ft., 1d8+3 bludgeoning." }
          const entries = Object.entries(atk as Record<string, string>);
          for (const [atkName, atkStr] of entries) {
            attacks.push(parseAttackString(`${atkName}: ${atkStr}`));
          }
        }
      }
    }

    // Parse special abilities
    const specialAbilities: SpecialAbility[] = [];
    if (Array.isArray(raw.abilities)) {
      for (const ab of raw.abilities) {
        if (typeof ab === "object" && ab !== null) {
          const abObj = ab as Record<string, string>;
          specialAbilities.push({
            name: abObj.name || "",
            description: abObj.desc || abObj.description || "",
          });
        }
      }
    }

    // Parse array fields
    const parseStringArray = (val: unknown): string[] | undefined => {
      if (Array.isArray(val)) return val.map(String);
      if (typeof val === "string") return [val];
      return undefined;
    };

    const statBlock: StatBlock = {
      name: String(raw.name || "Unknown"),
      ac: acParsed.ac,
      ac_note: acParsed.ac_note,
      hp: hpParsed.hp,
      hp_formula: hpParsed.hp_formula,
      speed: String(raw.speed || ""),
      abilities,
      cr: String(raw.cr || ""),
      attacks,
      special_abilities:
        specialAbilities.length > 0 ? specialAbilities : undefined,
      damage_vulnerabilities: parseStringArray(raw.vulnerabilities),
      damage_resistances: parseStringArray(raw.resistances),
      damage_immunities: parseStringArray(raw.immunities),
      condition_immunities: parseStringArray(raw.condition_immunities),
      senses: raw.senses ? String(raw.senses) : undefined,
      languages: raw.languages ? String(raw.languages) : undefined,
    };

    return statBlock;
  } catch (e) {
    console.warn("Failed to parse stat block:", e);
    return null;
  }
}

/** Parse a markdown table into rows of objects keyed by header */
function parseTable(
  lines: string[]
): { headers: string[]; rows: Record<string, string>[] } {
  if (lines.length < 2)
    return { headers: [], rows: [] };

  // Parse header row
  const headerLine = lines[0];
  const headers = headerLine
    .split("|")
    .map((h) => h.trim())
    .filter((h) => h !== "");

  // Skip separator row (line 1), parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i]
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c !== "");
    if (cells.length === 0) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = cells[j] || "";
    }
    rows.push(row);
  }

  return { headers, rows };
}

/** Parse an interaction table into Interaction[] */
function parseInteractionTable(lines: string[]): Interaction[] {
  const { rows } = parseTable(lines);
  return rows.map((row) => ({
    action: row["Action"] || "",
    check: row["Check"] || row["DC"] || undefined,
    result: row["Result"] || "",
  }));
}

// ---------------------------------------------------------------------------
// 4. Aggregator — assemble final SessionContent
// ---------------------------------------------------------------------------

/** Map callout type strings to DmNote type values */
function mapDmNoteType(
  calloutType: string
): "tip" | "warning" | "lore" | "rp_guidance" {
  switch (calloutType) {
    case "tip":
      return "tip";
    case "warning":
      return "warning";
    case "lore":
      return "lore";
    case "rp":
    case "rp-guidance":
    case "rp_guidance":
      return "rp_guidance";
    default:
      return "tip";
  }
}

function buildMeta(frontmatter: Record<string, unknown>): SessionMeta {
  if (!frontmatter.title) {
    throw new Error("Missing required 'title' in frontmatter");
  }
  return {
    title: String(frontmatter.title || ""),
    subtitle: String(frontmatter.subtitle || ""),
    level: Number(frontmatter.level) || 0,
    party_size: String(frontmatter.party_size || ""),
    estimated_duration: String(frontmatter.estimated_duration || ""),
    tone: String(frontmatter.tone || ""),
    lethality: String(frontmatter.lethality || ""),
    content_note: frontmatter.content_note
      ? String(frontmatter.content_note)
      : undefined,
  };
}

/**
 * Parse a complete markdown session document into structured SessionContent.
 */
export function parseSessionMarkdown(markdown: string): SessionContent {
  // --- Step 1: Extract frontmatter ---
  const { frontmatter, body } = extractFrontmatter(markdown);
  const meta = buildMeta(frontmatter);

  // --- Step 2: Tokenize ---
  const tokens = tokenize(body);

  // --- Step 3 & 4: Walk tokens and build structure ---
  const allNpcs: NpcEntry[] = [];
  const allTreasure: TreasureEntry[] = [];
  const allPuzzleEntries: PuzzleEntry[] = [];
  let settingDetails: SettingDetails = {
    walls: "",
    floors: "",
    doors: "",
    light: "",
    miasma: "",
    atmosphere: "",
    sound: "",
    resting: "",
    ceilings: "",
  };
  let explorationFlowchart = "";

  const acts: Act[] = [];
  const appendices: Appendix[] = [];

  let currentAct: Act | null = null;
  let currentSection: Section | null = null;
  let inAppendix = false;
  let currentAppendix: Appendix | null = null;

  // Track whether we've seen the first act (for pre-act content)
  let seenFirstAct = false;

  // Track the last stat block parsed, to associate with a Threat
  let lastStatBlock: StatBlock | null = null;

  /** Flush the current section into the current act */
  function flushSection() {
    if (currentSection && currentAct) {
      currentAct.sections.push(currentSection);
      currentSection = null;
    }
  }

  /** Flush the current act into the acts array */
  function flushAct() {
    flushSection();
    if (currentAct) {
      acts.push(currentAct);
      currentAct = null;
    }
  }

  /** Flush the current appendix */
  function flushAppendix() {
    if (currentAppendix) {
      appendices.push(currentAppendix);
      currentAppendix = null;
    }
  }

  /** Get current section title (for treasure room attribution) */
  function currentSectionTitle(): string {
    return currentSection?.title || "";
  }

  for (const token of tokens) {
    // --- Heading tokens ---
    if (token.type === "heading") {
      const level = token.level || 2;
      const title = token.title || "";

      // Check for Appendix heading
      if (level === 2 && title.toLowerCase().startsWith("appendix")) {
        flushAct();
        inAppendix = true;
        flushAppendix();
        currentAppendix = {
          id: slugify(title),
          title,
          content: [],
        };
        continue;
      }

      if (inAppendix) {
        // Sub-headings inside appendix are handled via body/table tokens
        continue;
      }

      if (level === 2) {
        // New Act
        flushAct();
        seenFirstAct = true;
        currentAct = {
          id: slugify(title),
          title,
          target_time: token.annotations?.["time"] || "",
          sections: [],
        };
      } else if (level === 3) {
        // New Section
        flushSection();
        const tagsStr = token.annotations?.["tags"] || "";
        const tags = tagsStr
          ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean)
          : [];

        currentSection = {
          id: slugify(title),
          title,
          tags,
          description: "",
        };

        // If we don't have an act yet, create an implicit one
        if (!currentAct) {
          seenFirstAct = true;
          currentAct = {
            id: "intro",
            title: "Introduction",
            target_time: "",
            sections: [],
          };
        }
      }
      // Level 4 headings are included in description text
      else if (level === 4) {
        if (currentSection) {
          if (currentSection.description) {
            currentSection.description += "\n\n";
          }
          currentSection.description += `#### ${title}`;
        }
      }
      continue;
    }

    // --- Handle appendix content ---
    if (inAppendix && currentAppendix) {
      if (token.type === "table") {
        const { headers, rows } = parseTable(token.lines);
        // Determine if this is a WhimsyEntry table or LoreThread table
        const hasRoll = headers.some(
          (h) => h.toLowerCase() === "d6" || h.toLowerCase() === "roll"
        );
        const hasThread = headers.some(
          (h) => h.toLowerCase() === "thread"
        );

        if (hasRoll) {
          const entries = rows.map((row) => ({
            roll: parseInt(
              row["d6"] || row["D6"] || row["Roll"] || row["roll"] || "0",
              10
            ),
            description:
              row["Extradimensional Whimsy"] ||
              row["Description"] ||
              row["description"] ||
              row["Effect"] ||
              row["effect"] ||
              Object.values(row).find((_, idx) => idx === 1) ||
              "",
          }));
          currentAppendix.content = entries;
        } else if (hasThread) {
          const entries = rows.map((row) => ({
            thread: row["Thread"] || row["thread"] || "",
            clue:
              row["Clue in This Session"] ||
              row["Clue"] ||
              row["clue"] ||
              "",
            future:
              row["Future Payoff"] ||
              row["Future"] ||
              row["future"] ||
              "",
          }));
          currentAppendix.content = entries;
        }
      }
      continue;
    }

    // --- Callout tokens ---
    if (token.type === "callout") {
      const calloutType = token.subtype || "tip";
      const calloutTitle = token.title || "";
      const lines = token.lines;

      switch (calloutType) {
        case "read-aloud": {
          if (currentSection) {
            currentSection.read_aloud = lines.join("\n").trim();
          }
          break;
        }

        case "tip":
        case "warning":
        case "lore":
        case "rp": {
          const note: DmNote = {
            type: mapDmNoteType(calloutType),
            title: calloutTitle || undefined,
            content: lines.join("\n").trim(),
          };
          if (currentSection) {
            if (!currentSection.dm_notes) currentSection.dm_notes = [];
            currentSection.dm_notes.push(note);
          }
          break;
        }

        case "danger": {
          if (currentSection) {
            currentSection.lethality_warning = lines.join("\n").trim();
          }
          break;
        }

        case "treasure": {
          const room = currentSectionTitle();
          const entries = parseTreasureCallout(lines, room);
          if (currentSection) {
            if (!currentSection.treasure) currentSection.treasure = [];
            currentSection.treasure.push(...entries);
          }
          // Also collect for quick reference
          allTreasure.push(...entries);
          break;
        }

        case "puzzle-book": {
          const letter = calloutTitle;
          const entry = parsePuzzleBookCallout(letter, lines);
          if (currentSection) {
            currentSection.puzzle_book = entry;
          }
          // Add to puzzle tracker
          allPuzzleEntries.push({
            letter: entry.letter,
            room: currentSectionTitle(),
            found: false,
          });
          break;
        }

        case "npc": {
          const npc = parseNpcCallout(calloutTitle, lines);
          allNpcs.push(npc);
          break;
        }

        case "setting": {
          if (!seenFirstAct) {
            settingDetails = parseSettingCallout(lines);
          }
          break;
        }

        default: {
          // Unknown callout type — treat as generic DmNote with type "tip"
          const note: DmNote = {
            type: "tip",
            title: calloutTitle || calloutType,
            content: lines.join("\n").trim(),
          };
          if (currentSection) {
            if (!currentSection.dm_notes) currentSection.dm_notes = [];
            currentSection.dm_notes.push(note);
          }
          break;
        }
      }
      continue;
    }

    // --- Stat block tokens ---
    if (token.type === "stat-block") {
      const statBlock = parseStatBlock(token.lines);
      if (statBlock) {
        lastStatBlock = statBlock;

        // Create a Threat from the stat block
        // Behavior and combat notes may come from subsequent body text;
        // for now initialize with empty strings and patch up later.
        const threat: Threat = {
          name: statBlock.name,
          stat_block: statBlock,
          behavior: "",
          combat_notes: "",
        };

        if (currentSection) {
          if (!currentSection.threats) currentSection.threats = [];
          currentSection.threats.push(threat);
        }
      }
      continue;
    }

    // --- Table tokens ---
    if (token.type === "table") {
      const { headers } = parseTable(token.lines);
      const isInteraction = headers.some(
        (h) => h.toLowerCase() === "action"
      );

      if (isInteraction && currentSection) {
        const interactions = parseInteractionTable(token.lines);
        if (!currentSection.interactions) currentSection.interactions = [];
        currentSection.interactions.push(...interactions);
      }
      continue;
    }

    // --- Body text tokens ---
    if (token.type === "body") {
      const text = token.lines.join("\n").trim();
      if (!text) continue;

      // Check if the body text follows a stat block and contains behavior/combat info
      // Heuristic: if we have a recent stat block and the text contains relevant keywords
      if (
        lastStatBlock &&
        currentSection?.threats &&
        currentSection.threats.length > 0
      ) {
        const lastThreat =
          currentSection.threats[currentSection.threats.length - 1];
        if (
          lastThreat.stat_block.name === lastStatBlock.name &&
          !lastThreat.behavior
        ) {
          // Try to split behavior / combat notes / trigger
          const behaviorMatch = text.match(
            /\*\*Behavior[:\s]*\*\*\s*([\s\S]*?)(?=\*\*|$)/
          );
          const combatMatch = text.match(
            /\*\*Combat Notes?[:\s]*\*\*\s*([\s\S]*?)(?=\*\*|$)/
          );
          const triggerMatch = text.match(
            /\*\*Trigger[:\s]*\*\*\s*([\s\S]*?)(?=\*\*|$)/
          );

          if (behaviorMatch || combatMatch || triggerMatch) {
            lastThreat.behavior = behaviorMatch
              ? behaviorMatch[1].trim()
              : "";
            lastThreat.combat_notes = combatMatch
              ? combatMatch[1].trim()
              : "";
            if (triggerMatch) {
              lastThreat.trigger = triggerMatch[1].trim();
            }
            lastStatBlock = null;
            continue;
          }
        }
      }
      lastStatBlock = null;

      // Check for "Connections:" pattern in body text
      const connectionsMatch = text.match(
        /\*\*Connections?:\*\*\s*([\s\S]*)/
      );
      if (connectionsMatch && currentSection) {
        const connLines = connectionsMatch[1]
          .split("\n")
          .map((l) => l.replace(/^[-*]\s*/, "").trim())
          .filter(Boolean);
        currentSection.connections = connLines;

        // Remove connections from description text
        const descPart = text
          .slice(0, connectionsMatch.index)
          .trim();
        if (descPart) {
          if (currentSection.description) {
            currentSection.description += "\n\n" + descPart;
          } else {
            currentSection.description = descPart;
          }
        }
        continue;
      }

      // Check for exploration flowchart pattern (pre-act content)
      if (!seenFirstAct && text.includes("→")) {
        explorationFlowchart = text;
        continue;
      }

      // Append to section description
      if (currentSection) {
        if (currentSection.description) {
          currentSection.description += "\n\n" + text;
        } else {
          currentSection.description = text;
        }
      }
      continue;
    }
  }

  // --- Final flush ---
  if (inAppendix) {
    flushAppendix();
  } else {
    flushAct();
  }

  // --- Build quick reference ---
  const quickReference: QuickReference = {
    setting: settingDetails,
    npcs: allNpcs,
    puzzle_tracker: allPuzzleEntries,
    treasure_summary: allTreasure,
    exploration_flowchart: explorationFlowchart,
  };

  return {
    meta,
    quick_reference: quickReference,
    acts,
    appendices,
  };
}
