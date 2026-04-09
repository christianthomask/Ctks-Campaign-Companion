import * as yaml from "js-yaml";
import type {
  SessionContent,
  SessionMeta,
  QuickReference,
  SettingDetails,
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
} from "@/lib/types/session";

// ─── Slug generation ───────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Frontmatter extraction ────────────────────────────────────────

interface FrontmatterResult {
  meta: Record<string, unknown>;
  body: string;
}

function extractFrontmatter(markdown: string): FrontmatterResult {
  const trimmed = markdown.trimStart();
  if (!trimmed.startsWith("---")) {
    return { meta: {}, body: markdown };
  }

  const end = trimmed.indexOf("---", 3);
  if (end === -1) {
    return { meta: {}, body: markdown };
  }

  const yamlStr = trimmed.slice(3, end).trim();
  const body = trimmed.slice(end + 3).trim();

  try {
    const parsed = yaml.load(yamlStr) as Record<string, unknown>;
    return { meta: parsed || {}, body };
  } catch {
    return { meta: {}, body: markdown };
  }
}

// ─── Block tokenizer ───────────────────────────────────────────────

type BlockType =
  | "heading_2"
  | "heading_3"
  | "heading_4"
  | "callout"
  | "stat_block"
  | "table"
  | "body";

interface Block {
  type: BlockType;
  lines: string[];
  raw: string;
}

function tokenize(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Heading 2
    if (trimmed.startsWith("## ") && !trimmed.startsWith("### ")) {
      blocks.push({ type: "heading_2", lines: [trimmed], raw: trimmed });
      i++;
      continue;
    }

    // Heading 3
    if (trimmed.startsWith("### ") && !trimmed.startsWith("#### ")) {
      blocks.push({ type: "heading_3", lines: [trimmed], raw: trimmed });
      i++;
      continue;
    }

    // Heading 4
    if (trimmed.startsWith("#### ")) {
      blocks.push({ type: "heading_4", lines: [trimmed], raw: trimmed });
      i++;
      continue;
    }

    // Stat block (fenced code block with stat-block language)
    if (trimmed === "```stat-block") {
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "```") {
        blockLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        type: "stat_block",
        lines: blockLines,
        raw: blockLines.join("\n"),
      });
      continue;
    }

    // Callout block
    if (trimmed.startsWith("> [!")) {
      const blockLines: string[] = [trimmed];
      i++;
      while (i < lines.length) {
        const next = lines[i];
        if (next.startsWith("> ") || next.trim() === ">") {
          blockLines.push(next);
          i++;
        } else {
          break;
        }
      }
      blocks.push({
        type: "callout",
        lines: blockLines,
        raw: blockLines.join("\n"),
      });
      continue;
    }

    // Table (line starts with | and next line is separator)
    if (trimmed.startsWith("|") && i + 1 < lines.length) {
      const nextLine = lines[i + 1]?.trim() || "";
      if (nextLine.startsWith("|") && nextLine.includes("---")) {
        const tableLines: string[] = [trimmed];
        i++;
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          tableLines.push(lines[i].trim());
          i++;
        }
        blocks.push({
          type: "table",
          lines: tableLines,
          raw: tableLines.join("\n"),
        });
        continue;
      }
    }

    // Body text (collect consecutive non-empty non-special lines)
    const bodyLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        cur.startsWith("## ") ||
        cur.startsWith("### ") ||
        cur.startsWith("#### ") ||
        cur.startsWith("> [!") ||
        cur === "```stat-block" ||
        (cur.startsWith("|") &&
          i + 1 < lines.length &&
          lines[i + 1]?.trim().startsWith("|"))
      ) {
        break;
      }
      bodyLines.push(lines[i]);
      i++;
    }
    if (bodyLines.length > 0) {
      blocks.push({
        type: "body",
        lines: bodyLines,
        raw: bodyLines.join("\n"),
      });
    }
  }

  return blocks;
}

// ─── Block parsers ─────────────────────────────────────────────────

interface HeadingData {
  text: string;
  time?: string;
  tags?: string[];
}

function parseHeading(line: string): HeadingData {
  // Remove ## / ### / #### prefix
  let text = line.replace(/^#+\s+/, "");

  // Extract {time: ...}
  let time: string | undefined;
  const timeMatch = text.match(/\{time:\s*([^}]+)\}/);
  if (timeMatch) {
    time = timeMatch[1].trim();
    text = text.replace(timeMatch[0], "").trim();
  }

  // Extract {tags: ...}
  let tags: string[] | undefined;
  const tagsMatch = text.match(/\{tags:\s*([^}]+)\}/);
  if (tagsMatch) {
    tags = tagsMatch[1].split(",").map((t) => t.trim()).filter(Boolean);
    text = text.replace(tagsMatch[0], "").trim();
  }

  return { text, time, tags };
}

interface CalloutData {
  calloutType: string;
  title?: string;
  body: string;
  keyValues: Record<string, string>;
  listItems: string[];
}

function parseCallout(lines: string[]): CalloutData {
  const firstLine = lines[0];
  const typeMatch = firstLine.match(/>\s*\[!([^\]]+)\]\s*(.*)/);
  if (!typeMatch) {
    return { calloutType: "unknown", body: "", keyValues: {}, listItems: [] };
  }

  const calloutType = typeMatch[1].trim();
  const titlePart = typeMatch[2]?.trim() || "";
  const title = titlePart || undefined;

  // Parse body lines (strip `> ` prefix)
  const bodyLines: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    if (line.startsWith("> ")) {
      line = line.slice(2);
    } else if (line.trim() === ">") {
      line = "";
    }
    bodyLines.push(line);
  }

  // Extract key-value pairs (**Key:** Value)
  const keyValues: Record<string, string> = {};
  const listItems: string[] = [];
  const plainLines: string[] = [];

  for (const line of bodyLines) {
    const kvMatch = line.match(/^\*\*([^*]+):\*\*\s*(.*)/);
    if (kvMatch) {
      keyValues[kvMatch[1].trim()] = kvMatch[2].trim();
    } else if (line.startsWith("- ")) {
      listItems.push(line.slice(2).trim());
    } else {
      plainLines.push(line);
    }
  }

  const body = plainLines.join("\n").trim();

  return { calloutType, title, body, keyValues, listItems };
}

function parseStatBlockYaml(yamlText: string): StatBlock | null {
  try {
    // Handle one-line ability scores: `str: 17  dex: 12  con: 15  int: 5  wis: 13  cha: 8`
    let normalized = yamlText;
    const abilityLineMatch = normalized.match(
      /^(str:\s*\d+)\s+(dex:\s*\d+)\s+(con:\s*\d+)\s+(int:\s*\d+)\s+(wis:\s*\d+)\s+(cha:\s*\d+)/m
    );
    if (abilityLineMatch) {
      const replacement = abilityLineMatch
        .slice(1)
        .map((s) => s.trim())
        .join("\n");
      normalized = normalized.replace(abilityLineMatch[0], replacement);
    }

    const data = yaml.load(normalized) as Record<string, unknown>;
    if (!data || typeof data !== "object" || !data.name) return null;

    // Parse AC: "12 (natural armor)" → ac: 12, ac_note: "natural armor"
    let ac = 0;
    let acNote: string | undefined;
    const acStr = String(data.ac || "0");
    const acMatch = acStr.match(/^(\d+)\s*\(([^)]+)\)/);
    if (acMatch) {
      ac = parseInt(acMatch[1]);
      acNote = acMatch[2];
    } else {
      ac = parseInt(acStr) || 0;
    }

    // Parse HP: "58 (9d8+18)" → hp: 58, hp_formula: "9d8+18"
    let hp = 0;
    let hpFormula = "";
    const hpStr = String(data.hp || "0");
    const hpMatch = hpStr.match(/^(\d+)\s*\(([^)]+)\)/);
    if (hpMatch) {
      hp = parseInt(hpMatch[1]);
      hpFormula = hpMatch[2];
    } else {
      hp = parseInt(hpStr) || 0;
    }

    // Parse abilities
    let abilities: Abilities | undefined;
    if (data.str != null && data.dex != null) {
      abilities = {
        str: Number(data.str) || 10,
        dex: Number(data.dex) || 10,
        con: Number(data.con) || 10,
        int: Number(data.int) || 10,
        wis: Number(data.wis) || 10,
        cha: Number(data.cha) || 10,
      };
    }

    // Parse attacks
    const attacks: Attack[] = [];
    const rawAttacks = (data.attacks as string[]) || [];
    for (const atk of rawAttacks) {
      const attack = parseAttackString(atk);
      if (attack) attacks.push(attack);
    }

    // Parse special abilities
    const specialAbilities: SpecialAbility[] = [];
    const rawAbilities =
      (data.abilities as Array<{ name: string; desc: string }>) || [];
    for (const ab of rawAbilities) {
      if (ab.name && ab.desc) {
        specialAbilities.push({ name: ab.name, description: ab.desc });
      }
    }

    const toStringArray = (val: unknown): string[] => {
      if (Array.isArray(val)) return val.map(String);
      return [];
    };

    return {
      name: String(data.name),
      ac,
      ac_note: acNote,
      hp,
      hp_formula: hpFormula,
      speed: String(data.speed || "30 ft."),
      abilities,
      cr: String(data.cr || "0"),
      attacks,
      special_abilities:
        specialAbilities.length > 0 ? specialAbilities : undefined,
      damage_vulnerabilities: toStringArray(data.vulnerabilities),
      damage_resistances: toStringArray(data.resistances),
      damage_immunities: toStringArray(data.immunities),
      condition_immunities: toStringArray(data.condition_immunities),
      senses: data.senses ? String(data.senses) : undefined,
      languages: data.languages ? String(data.languages) : undefined,
    };
  } catch (e) {
    console.warn("Failed to parse stat block YAML:", e);
    return null;
  }
}

function parseAttackString(str: string): Attack | null {
  // Format: "Name: +X to hit, reach, damage. Effects."
  // or "Name: +X to hit, 5 ft., 1d8+3 bludgeoning. Extra effects."
  const match = str.match(
    /^([^:]+):\s*\+(\d+)\s*to hit,\s*([^,]+),\s*(.+)/
  );
  if (!match) {
    // Simpler format without all parts
    const parts = str.split(":");
    if (parts.length >= 2) {
      return {
        name: parts[0].trim(),
        to_hit: 0,
        reach: "5 ft.",
        damage: parts.slice(1).join(":").trim(),
        damage_type: "",
      };
    }
    return null;
  }

  const name = match[1].trim();
  const toHit = parseInt(match[2]);
  const reach = match[3].trim();
  const rest = match[4].trim();

  // Try to parse damage and type from the rest
  const dmgMatch = rest.match(
    /^([\dd+\s]+)\s+(\w+)(?:\.\s*(.*))?/
  );
  if (dmgMatch) {
    return {
      name,
      to_hit: toHit,
      reach,
      damage: dmgMatch[1].trim(),
      damage_type: dmgMatch[2].trim(),
      effects: dmgMatch[3]?.trim() || undefined,
    };
  }

  // Fallback: put everything in damage
  const periodIdx = rest.indexOf(".");
  if (periodIdx > 0) {
    return {
      name,
      to_hit: toHit,
      reach,
      damage: rest.slice(0, periodIdx).trim(),
      damage_type: "",
      effects: rest.slice(periodIdx + 1).trim() || undefined,
    };
  }

  return {
    name,
    to_hit: toHit,
    reach,
    damage: rest,
    damage_type: "",
  };
}

function parseInteractionTable(lines: string[]): Interaction[] {
  // Skip header and separator rows
  const interactions: Interaction[] = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i]
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length >= 3) {
      interactions.push({
        action: cells[0],
        check: cells[1] === "—" || cells[1] === "-" ? undefined : cells[1],
        result: cells[2],
      });
    }
  }
  return interactions;
}

function parseTreasureItems(
  items: string[],
  room: string
): TreasureEntry[] {
  return items.map((item) => {
    const dashIdx = item.indexOf("—");
    if (dashIdx > 0) {
      return {
        room,
        item: item.slice(0, dashIdx).trim(),
        value: item.slice(dashIdx + 1).trim(),
      };
    }
    return { room, item: item.trim(), value: "" };
  });
}

// ─── Main parser ───────────────────────────────────────────────────

export function parseSessionMarkdown(markdown: string): SessionContent {
  const { meta: rawMeta, body } = extractFrontmatter(markdown);

  if (!rawMeta.title) {
    throw new Error("Missing required frontmatter field: title");
  }

  // Build session meta
  const meta: SessionMeta = {
    title: String(rawMeta.title || ""),
    subtitle: String(rawMeta.subtitle || ""),
    level: Number(rawMeta.level) || 1,
    party_size: String(rawMeta.party_size || ""),
    estimated_duration: String(rawMeta.duration || ""),
    tone: String(rawMeta.tone || ""),
    lethality: String(rawMeta.lethality || ""),
    content_note: rawMeta.content_note
      ? String(rawMeta.content_note)
      : undefined,
  };

  // Tokenize the body
  const blocks = tokenize(body);

  // State for building the output
  const acts: Act[] = [];
  const appendices: Appendix[] = [];
  const allNpcs: NpcEntry[] = [];
  const allTreasure: TreasureEntry[] = [];
  const allPuzzles: PuzzleEntry[] = [];
  let setting: SettingDetails = {} as SettingDetails;
  let flowchart = "";

  let currentAct: Act | null = null;
  let currentSection: Section | null = null;
  let inAppendix = false;
  let currentAppendix: Appendix | null = null;

  function getCurrentSectionTitle(): string {
    return currentSection?.title || currentAct?.title || "";
  }

  function ensureSection() {
    if (!currentSection && currentAct) {
      currentSection = {
        id: slugify(currentAct.title + "-intro"),
        title: currentAct.title,
        tags: [],
        description: "",
      };
      currentAct.sections.push(currentSection);
    }
  }

  for (const block of blocks) {
    switch (block.type) {
      case "heading_2": {
        const heading = parseHeading(block.lines[0]);
        const isAppendix =
          heading.text.toLowerCase().includes("appendix") ||
          heading.text.toLowerCase().includes("appendices");

        if (isAppendix) {
          inAppendix = true;
          currentAppendix = {
            id: slugify(heading.text),
            title: heading.text.replace(/^appendix:\s*/i, "").trim(),
            content: [],
          };
          appendices.push(currentAppendix);
          currentAct = null;
          currentSection = null;
        } else {
          inAppendix = false;
          currentAct = {
            id: slugify(heading.text),
            title: heading.text,
            target_time: heading.time || "",
            sections: [],
          };
          acts.push(currentAct);
          currentSection = null;
        }
        break;
      }

      case "heading_3": {
        if (inAppendix) break;
        const heading = parseHeading(block.lines[0]);
        currentSection = {
          id: slugify(heading.text),
          title: heading.text,
          tags: heading.tags || [],
          description: "",
        };
        if (currentAct) {
          currentAct.sections.push(currentSection);
        }
        break;
      }

      case "heading_4": {
        // Subheading — append to current section description
        if (currentSection) {
          const heading = parseHeading(block.lines[0]);
          currentSection.description +=
            (currentSection.description ? "\n\n" : "") +
            `**${heading.text}**`;
        }
        break;
      }

      case "callout": {
        const callout = parseCallout(block.lines);

        switch (callout.calloutType) {
          case "read-aloud": {
            if (inAppendix) break;
            ensureSection();
            if (currentSection) {
              const text =
                callout.body ||
                block.lines
                  .slice(1)
                  .map((l) => (l.startsWith("> ") ? l.slice(2) : l.trim() === ">" ? "" : l))
                  .join("\n")
                  .trim();
              currentSection.read_aloud = text;
            }
            break;
          }

          case "tip":
          case "warning":
          case "lore":
          case "rp": {
            if (inAppendix) break;
            ensureSection();
            if (currentSection) {
              const dmNote: DmNote = {
                type:
                  callout.calloutType === "rp"
                    ? "rp_guidance"
                    : (callout.calloutType as DmNote["type"]),
                title: callout.title,
                content: callout.body,
              };
              currentSection.dm_notes = currentSection.dm_notes || [];
              currentSection.dm_notes.push(dmNote);
            }
            break;
          }

          case "danger": {
            if (inAppendix) break;
            ensureSection();
            if (currentSection) {
              currentSection.lethality_warning = callout.body;
            }
            break;
          }

          case "treasure": {
            if (inAppendix) break;
            ensureSection();
            const room = getCurrentSectionTitle().split(".")[0]?.trim() || "";
            const items = parseTreasureItems(callout.listItems, room);
            if (currentSection) {
              currentSection.treasure = currentSection.treasure || [];
              currentSection.treasure.push(...items);
            }
            allTreasure.push(...items);
            break;
          }

          case "puzzle-book": {
            if (inAppendix) break;
            ensureSection();
            const letter = (callout.title || "").trim();
            const room =
              getCurrentSectionTitle().split(".")[0]?.trim() || "";
            if (currentSection && letter) {
              currentSection.puzzle_book = {
                letter,
                location_description: callout.keyValues["Location"] || "",
                discovery: callout.keyValues["Discovery"] || "",
                illustration: callout.keyValues["Illustration"] || "",
              };
              allPuzzles.push({ letter, room: getCurrentSectionTitle(), found: false });
            }
            break;
          }

          case "npc": {
            const npc: NpcEntry = {
              name: callout.title || "Unknown NPC",
              location: callout.keyValues["Location"] || "",
              voice: callout.keyValues["Voice"] || "",
              key_info: callout.keyValues["Key Info"] || callout.keyValues["Key info"] || "",
            };
            allNpcs.push(npc);
            break;
          }

          case "setting": {
            setting = {
              ...setting,
              ...(Object.fromEntries(
                Object.entries(callout.keyValues).map(([k, v]) => [
                  k.toLowerCase(),
                  v,
                ])
              ) as Record<string, string>),
            } as SettingDetails;
            break;
          }

          default: {
            // Unknown callout type — treat as a tip
            if (!inAppendix && currentSection) {
              ensureSection();
              const dmNote: DmNote = {
                type: "tip",
                title: callout.title || callout.calloutType,
                content: callout.body,
              };
              currentSection!.dm_notes = currentSection!.dm_notes || [];
              currentSection!.dm_notes.push(dmNote);
            }
            break;
          }
        }
        break;
      }

      case "stat_block": {
        if (inAppendix) break;
        ensureSection();
        const statBlock = parseStatBlockYaml(block.raw);
        if (statBlock && currentSection) {
          const threat: Threat = {
            name: statBlock.name,
            stat_block: statBlock,
            behavior: "",
            combat_notes: "",
          };
          currentSection.threats = currentSection.threats || [];
          currentSection.threats.push(threat);
        }
        break;
      }

      case "table": {
        // Check if it's an interaction table
        const headers = block.lines[0]
          ?.split("|")
          .map((c) => c.trim())
          .filter(Boolean);

        if (
          !inAppendix &&
          headers?.[0]?.toLowerCase() === "action"
        ) {
          ensureSection();
          if (currentSection) {
            const interactions = parseInteractionTable(block.lines);
            currentSection.interactions = currentSection.interactions || [];
            currentSection.interactions.push(...interactions);
          }
        } else if (inAppendix && currentAppendix) {
          // Parse appendix table content
          const rows = block.lines.slice(2); // skip header + separator
          const content = rows.map((row) => {
            const cells = row
              .split("|")
              .map((c) => c.trim())
              .filter(Boolean);
            // Try to detect whimsy table (first col is number)
            const firstCell = parseInt(cells[0]);
            if (!isNaN(firstCell) && cells.length >= 2) {
              return { roll: firstCell, description: cells[1] };
            }
            return { roll: 0, description: cells.join(" | ") };
          });
          currentAppendix.content = content as Appendix["content"];
        }
        break;
      }

      case "body": {
        if (inAppendix) break;
        ensureSection();
        if (currentSection) {
          const text = block.raw.trim();
          if (currentSection.description) {
            currentSection.description += "\n\n" + text;
          } else {
            currentSection.description = text;
          }
        }
        break;
      }
    }
  }

  // Build the quick reference
  const quickReference: QuickReference = {
    setting,
    npcs: allNpcs,
    puzzle_tracker: allPuzzles,
    treasure_summary: allTreasure,
    exploration_flowchart: flowchart,
  };

  return {
    meta,
    quick_reference: quickReference,
    acts,
    appendices,
  };
}
