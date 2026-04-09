/**
 * 5e.tools Data Ingestion Script
 *
 * Fetches D&D 5e reference data from the 5e.tools GitHub mirror and
 * upserts it into the Supabase ref_* tables.
 *
 * Usage:
 *   npx tsx scripts/ingest-5etools.ts
 *
 * Required env vars (from .env.local or environment):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (required — bypasses RLS for writes)
 *
 * This script is idempotent and safe to re-run.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ─── Configuration ─────────────────────────────────────────────────

// Load .env.local if it exists
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Set them in .env.local or as environment variables."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BASE_URL =
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data";

// ─── Helpers ───────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchJson(url: string): Promise<unknown> {
  console.log(`  Fetching ${url.split("/data/")[1] || url}...`);

  // Try native fetch first, fall back to curl for restricted environments
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    return res.json();
  } catch {
    // Fallback: use curl via child_process
    const { execSync } = await import("child_process");
    const output = execSync(`curl -sL "${url}"`, {
      maxBuffer: 10 * 1024 * 1024,
      encoding: "utf-8",
    });
    return JSON.parse(output);
  }
}

async function upsertBatch(
  table: string,
  rows: Record<string, unknown>[],
  batchSize = 100
): Promise<number> {
  // Deduplicate by id within the batch — Postgres rejects duplicate keys in a single upsert
  const seen = new Set<string>();
  const deduped = rows.filter((row) => {
    const id = String(row.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  let total = 0;
  for (let i = 0; i < deduped.length; i += batchSize) {
    const batch = deduped.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error(`  Error upserting to ${table}:`, error.message);
      // Continue with remaining batches
    } else {
      total += batch.length;
    }
  }
  return total;
}

// Render 5etools entry text to plain text
function renderEntries(entries: unknown[] | undefined): string {
  if (!entries) return "";
  return entries
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (typeof entry === "object" && entry !== null) {
        const e = entry as Record<string, unknown>;
        if (e.type === "entries" && Array.isArray(e.entries)) {
          return renderEntries(e.entries);
        }
        if (e.type === "list" && Array.isArray(e.items)) {
          return (e.items as string[]).map((item) => `• ${item}`).join("\n");
        }
        if (typeof e.entry === "string") return e.entry;
        if (typeof e.text === "string") return e.text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

// ─── Races ─────────────────────────────────────────────────────────

async function ingestRaces() {
  console.log("\n📖 Ingesting races...");
  const data = (await fetchJson(`${BASE_URL}/races.json`)) as {
    race: Array<Record<string, unknown>>;
  };

  const rows: Record<string, unknown>[] = [];

  for (const race of data.race || []) {
    const source = String(race.source || "");
    // Only ingest PHB, basic rules, and common sources
    if (!["PHB", "MPMM", "XGE", "VGM", "TCE"].includes(source)) continue;

    const id = slugify(String(race.name));
    const abilityBonuses: Record<string, number> = {};

    if (Array.isArray(race.ability)) {
      for (const ab of race.ability) {
        if (typeof ab === "object" && ab !== null) {
          for (const [key, val] of Object.entries(ab as Record<string, number>)) {
            if (key !== "choose") abilityBonuses[key] = val;
          }
        }
      }
    }

    const speed =
      typeof race.speed === "number"
        ? race.speed
        : typeof race.speed === "object" && race.speed !== null
          ? (race.speed as Record<string, number>).walk || 30
          : 30;

    const darkvision =
      Array.isArray(race.darkvision) && race.darkvision.length > 0
        ? race.darkvision[0]
        : typeof race.darkvision === "number"
          ? race.darkvision
          : 0;

    const traits: Array<{ name: string; description: string }> = [];
    if (Array.isArray(race.entries)) {
      for (const entry of race.entries) {
        if (typeof entry === "object" && entry !== null && (entry as Record<string, unknown>).name) {
          const e = entry as Record<string, unknown>;
          traits.push({
            name: String(e.name),
            description: renderEntries(e.entries as unknown[]),
          });
        }
      }
    }

    const languages: string[] = [];
    if (Array.isArray(race.languageProficiencies)) {
      for (const lp of race.languageProficiencies) {
        if (typeof lp === "object" && lp !== null) {
          for (const [lang, val] of Object.entries(lp as Record<string, unknown>)) {
            if (val === true) languages.push(lang.charAt(0).toUpperCase() + lang.slice(1));
          }
        }
      }
    }

    rows.push({
      id,
      name: String(race.name),
      source,
      parent_race_id: null,
      ability_bonuses: abilityBonuses,
      size: Array.isArray(race.size) ? race.size[0] : String(race.size || "M"),
      speed,
      darkvision,
      traits,
      languages,
      flavor_text: renderEntries(race.entries as unknown[])?.slice(0, 500) || null,
    });
  }

  const count = await upsertBatch("ref_races", rows);
  console.log(`  ✅ ${count} races ingested`);
}

// ─── Classes ───────────────────────────────────────────────────────

const ARCHETYPE_MAP: Record<string, string> = {
  Fighter: "martial",
  Barbarian: "martial",
  Monk: "martial",
  Paladin: "hybrid",
  Ranger: "hybrid",
  Cleric: "hybrid",
  Druid: "caster",
  Wizard: "caster",
  Sorcerer: "caster",
  Warlock: "caster",
  Bard: "skill",
  Rogue: "skill",
  Artificer: "hybrid",
};

async function ingestClasses() {
  console.log("\n⚔️ Ingesting classes...");
  const data = (await fetchJson(`${BASE_URL}/class/index.json`)) as Record<
    string,
    string
  >;

  const rows: Record<string, unknown>[] = [];

  for (const [className, fileName] of Object.entries(data)) {
    if (fileName === "index.json") continue;

    let classData: Record<string, unknown>;
    try {
      const fileData = (await fetchJson(`${BASE_URL}/class/${fileName}`)) as {
        class: Array<Record<string, unknown>>;
        subclass?: Array<Record<string, unknown>>;
      };
      const classes = fileData.class || [];
      const phbClass = classes.find((c) => c.source === "PHB") || classes[0];
      if (!phbClass) continue;
      classData = phbClass;
    } catch {
      console.log(`  Skipping ${className} (fetch failed)`);
      continue;
    }

    const id = slugify(String(classData.name));
    const hitDie = (classData.hd as Record<string, number>)?.faces || 8;

    // Extract proficiencies
    const profs = (classData.startingProficiencies as Record<string, unknown>) || {};
    const savingThrows = Array.isArray(profs.savingThrows)
      ? profs.savingThrows.map((s: unknown) => String(s).toLowerCase())
      : [];

    const armorProfs: string[] = [];
    if (Array.isArray(profs.armor)) {
      for (const a of profs.armor) {
        if (typeof a === "string") armorProfs.push(a);
        else if (typeof a === "object" && a !== null) {
          const profStr =
            (a as Record<string, unknown>).full ||
            (a as Record<string, unknown>).proficiency;
          if (profStr) armorProfs.push(String(profStr));
        }
      }
    }

    const weaponProfs: string[] = [];
    if (Array.isArray(profs.weapons)) {
      for (const w of profs.weapons) {
        if (typeof w === "string") weaponProfs.push(w);
        else if (typeof w === "object" && w !== null) {
          const profStr =
            (w as Record<string, unknown>).full ||
            (w as Record<string, unknown>).proficiency;
          if (profStr) weaponProfs.push(String(profStr));
        }
      }
    }

    // Skill choices
    const skillChoices: Record<string, unknown> = {};
    if (Array.isArray(profs.skills)) {
      for (const sk of profs.skills) {
        if (typeof sk === "object" && sk !== null) {
          const choose = sk as Record<string, unknown>;
          skillChoices.count = choose.count || 2;
          if (Array.isArray(choose.from)) {
            skillChoices.from = choose.from.map((s: unknown) => String(s).toLowerCase());
          }
        }
      }
    }

    // Spellcasting
    let spellcasting = null;
    if (classData.spellcastingAbility) {
      spellcasting = {
        ability: String(classData.spellcastingAbility).toLowerCase(),
      };
    } else if (
      Array.isArray(classData.classFeatures) &&
      JSON.stringify(classData.classFeatures).includes("Spellcasting")
    ) {
      // Has spellcasting feature but no explicit ability — check casterProgression
      if (classData.casterProgression) {
        const abilityMap: Record<string, string> = {
          Wizard: "int", Cleric: "wis", Druid: "wis",
          Bard: "cha", Sorcerer: "cha", Warlock: "cha",
          Paladin: "cha", Ranger: "wis", Artificer: "int",
        };
        spellcasting = {
          ability: abilityMap[String(classData.name)] || "int",
        };
      }
    }

    rows.push({
      id,
      name: String(classData.name),
      source: String(classData.source || "PHB"),
      hit_die: hitDie,
      primary_abilities: savingThrows.slice(0, 2),
      saving_throw_proficiencies: savingThrows,
      armor_proficiencies: armorProfs,
      weapon_proficiencies: weaponProfs,
      tool_proficiencies: [],
      skill_choices: skillChoices,
      starting_equipment: [],
      features_by_level: {},
      spellcasting,
      subclass_level: classData.subclassTitle ? 3 : null,
      flavor_text: renderEntries(classData.fluff as unknown[])?.slice(0, 500) || null,
      archetype: ARCHETYPE_MAP[String(classData.name)] || "martial",
    });
  }

  const count = await upsertBatch("ref_classes", rows);
  console.log(`  ✅ ${count} classes ingested`);
}

// ─── Backgrounds ───────────────────────────────────────────────────

async function ingestBackgrounds() {
  console.log("\n🎭 Ingesting backgrounds...");
  const data = (await fetchJson(`${BASE_URL}/backgrounds.json`)) as {
    background: Array<Record<string, unknown>>;
  };

  const rows: Record<string, unknown>[] = [];

  for (const bg of data.background || []) {
    const source = String(bg.source || "");
    if (!["PHB", "MPMM", "XGE", "TCE"].includes(source)) continue;

    const id = slugify(String(bg.name));
    const skillProfs: string[] = [];

    if (Array.isArray(bg.skillProficiencies)) {
      for (const sp of bg.skillProficiencies) {
        if (typeof sp === "object" && sp !== null) {
          for (const [skill, val] of Object.entries(sp as Record<string, unknown>)) {
            if (val === true) skillProfs.push(skill.toLowerCase());
          }
        }
      }
    }

    const toolProfs: string[] = [];
    if (Array.isArray(bg.toolProficiencies)) {
      for (const tp of bg.toolProficiencies) {
        if (typeof tp === "object" && tp !== null) {
          for (const [tool, val] of Object.entries(tp as Record<string, unknown>)) {
            if (val === true) toolProfs.push(tool);
          }
        }
      }
    }

    // Feature
    let featureName = "";
    let featureDesc = "";
    if (Array.isArray(bg.entries)) {
      for (const entry of bg.entries) {
        if (
          typeof entry === "object" &&
          entry !== null &&
          (entry as Record<string, unknown>).type === "entries" &&
          (entry as Record<string, unknown>).name
        ) {
          const e = entry as Record<string, unknown>;
          if (String(e.name).startsWith("Feature:")) {
            featureName = String(e.name).replace("Feature:", "").trim();
            featureDesc = renderEntries(e.entries as unknown[]);
          }
        }
      }
    }

    rows.push({
      id,
      name: String(bg.name),
      source,
      skill_proficiencies: skillProfs,
      tool_proficiencies: toolProfs,
      languages_choice: 0,
      equipment: [],
      feature_name: featureName || null,
      feature_description: featureDesc || null,
      personality_traits: [],
      ideals: [],
      bonds: [],
      flaws: [],
      flavor_text:
        renderEntries(bg.entries as unknown[])?.slice(0, 500) || null,
    });
  }

  const count = await upsertBatch("ref_backgrounds", rows);
  console.log(`  ✅ ${count} backgrounds ingested`);
}

// ─── Spells ────────────────────────────────────────────────────────

async function ingestSpells() {
  console.log("\n✨ Ingesting spells...");
  const index = (await fetchJson(`${BASE_URL}/spells/index.json`)) as Record<
    string,
    string
  >;

  const allSpells: Record<string, unknown>[] = [];

  // Only ingest from core sources
  const targetFiles = ["spells-phb.json", "spells-xge.json", "spells-tce.json"];

  for (const [, fileName] of Object.entries(index)) {
    if (!targetFiles.includes(fileName)) continue;

    try {
      const fileData = (await fetchJson(`${BASE_URL}/spells/${fileName}`)) as {
        spell: Array<Record<string, unknown>>;
      };

      for (const spell of fileData.spell || []) {
        const id = slugify(String(spell.name));
        const level = Number(spell.level) || 0;

        // Components
        const comp = spell.components as Record<string, unknown> | undefined;
        const components: string[] = [];
        if (comp?.v) components.push("V");
        if (comp?.s) components.push("S");
        if (comp?.m) {
          const mat = typeof comp.m === "string" ? comp.m : (comp.m as Record<string, unknown>)?.text || "";
          components.push(`M (${mat})`);
        }

        // Classes that can cast this spell
        const classes: string[] = [];
        if (spell.classes) {
          const classData = spell.classes as Record<string, unknown>;
          if (Array.isArray(classData.fromClassList)) {
            for (const c of classData.fromClassList) {
              const cn = c as Record<string, unknown>;
              if (cn.source === "PHB") {
                classes.push(String(cn.name).toLowerCase());
              }
            }
          }
        }

        // Duration and concentration
        let duration = "";
        let concentration = false;
        if (Array.isArray(spell.duration)) {
          const dur = spell.duration[0] as Record<string, unknown>;
          if (dur.type === "timed") {
            const time = dur.duration as Record<string, unknown>;
            duration = `${time.amount} ${time.type}${Number(time.amount) > 1 ? "s" : ""}`;
          } else if (dur.type === "instant") {
            duration = "Instantaneous";
          } else if (dur.type === "permanent") {
            duration = "Until dispelled";
          } else {
            duration = String(dur.type || "");
          }
          if (dur.concentration) concentration = true;
        }

        // Casting time
        let castingTime = "";
        if (Array.isArray(spell.time)) {
          const time = spell.time[0] as Record<string, unknown>;
          castingTime = `${time.number} ${time.unit}`;
        }

        // Range
        let range = "";
        if (spell.range) {
          const r = spell.range as Record<string, unknown>;
          if (r.type === "point") {
            const dist = r.distance as Record<string, unknown>;
            range =
              dist.type === "self"
                ? "Self"
                : dist.type === "touch"
                  ? "Touch"
                  : `${dist.amount} ${dist.type}`;
          } else if (r.type === "special") {
            range = "Special";
          }
        }

        // School
        const schoolMap: Record<string, string> = {
          A: "Abjuration", C: "Conjuration", D: "Divination",
          E: "Enchantment", V: "Evocation", I: "Illusion",
          N: "Necromancy", T: "Transmutation",
        };
        const school = schoolMap[String(spell.school)] || String(spell.school);

        // Description
        const description = renderEntries(spell.entries as unknown[]);
        const higherLevels = renderEntries(
          spell.entriesHigherLevel as unknown[]
        );

        allSpells.push({
          id,
          name: String(spell.name),
          source: String(spell.source || "PHB"),
          level,
          school,
          casting_time: castingTime,
          range,
          duration,
          concentration,
          ritual: Boolean(
            spell.meta && (spell.meta as Record<string, unknown>).ritual
          ),
          components: components.join(", "),
          classes,
          description: description.slice(0, 2000),
          higher_levels: higherLevels?.slice(0, 1000) || null,
          damage_type: null,
          save_type: null,
        });
      }
    } catch (e) {
      console.log(`  Skipping ${fileName}: ${(e as Error).message}`);
    }
  }

  const count = await upsertBatch("ref_spells", allSpells);
  console.log(`  ✅ ${count} spells ingested`);
}

// ─── Items ─────────────────────────────────────────────────────────

async function ingestItems() {
  console.log("\n🗡️ Ingesting items...");

  const rows: Record<string, unknown>[] = [];

  for (const fileName of ["items.json", "items-base.json"]) {
    try {
      const data = (await fetchJson(`${BASE_URL}/${fileName}`)) as {
        item?: Array<Record<string, unknown>>;
        baseitem?: Array<Record<string, unknown>>;
      };

      const items = data.item || data.baseitem || [];

      for (const item of items) {
        const source = String(item.source || "");
        if (!["PHB", "DMG"].includes(source)) continue;

        const id = slugify(String(item.name));

        // Determine type
        let type: string | null = null;
        const itemType = String(item.type || "");
        if (["LA", "MA", "HA", "S"].includes(itemType)) type = "armor";
        else if (
          ["M", "R", "A", "AF"].includes(itemType) ||
          item.weaponCategory
        )
          type = "weapon";
        else if (itemType === "AT" || itemType === "T") type = "tool";
        else if (itemType === "INS" || itemType === "GS") type = "tool";
        else if (itemType === "SCF" || itemType === "P" || itemType === "G")
          type = "gear";
        else type = "gear";

        // AC
        let acBase: number | null = null;
        let acDexBonus = false;
        let acMaxDex: number | null = null;
        if (item.ac != null) {
          acBase = Number(item.ac);
          if (itemType === "LA") {
            acDexBonus = true;
          } else if (itemType === "MA") {
            acDexBonus = true;
            acMaxDex = 2;
          }
        }

        // Damage
        let damage: string | null = null;
        let damageType: string | null = null;
        if (item.dmg1) {
          damage = String(item.dmg1);
          damageType = String(item.dmgType || "");
          const dmgTypeMap: Record<string, string> = {
            B: "bludgeoning", P: "piercing", S: "slashing",
          };
          damageType = dmgTypeMap[damageType] || damageType;
        }

        rows.push({
          id,
          name: String(item.name),
          source,
          type,
          cost: item.value
            ? `${Math.floor(Number(item.value) / 100)} gp`
            : null,
          weight: item.weight ? Number(item.weight) : null,
          properties: item.property || [],
          damage,
          damage_type: damageType,
          ac_base: acBase,
          ac_dex_bonus: acDexBonus,
          ac_max_dex: acMaxDex,
          strength_requirement: item.strength
            ? Number(item.strength)
            : null,
          stealth_disadvantage: Boolean(item.stealth),
          description:
            renderEntries(item.entries as unknown[])?.slice(0, 1000) || null,
          pack_contents: [],
        });
      }
    } catch (e) {
      console.log(`  Skipping ${fileName}: ${(e as Error).message}`);
    }
  }

  // Deduplicate by id (items.json and items-base.json may overlap)
  const seen = new Set<string>();
  const dedupedRows = rows.filter((row) => {
    const id = row.id as string;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const count = await upsertBatch("ref_items", dedupedRows);
  console.log(`  ✅ ${count} items ingested`);
}

// ─── Conditions ────────────────────────────────────────────────────

async function ingestConditions() {
  console.log("\n🔴 Ingesting conditions...");
  const data = (await fetchJson(
    `${BASE_URL}/conditionsdiseases.json`
  )) as {
    condition: Array<Record<string, unknown>>;
  };

  const rows: Record<string, unknown>[] = [];

  for (const cond of data.condition || []) {
    const id = slugify(String(cond.name));
    rows.push({
      id,
      name: String(cond.name),
      description: renderEntries(cond.entries as unknown[]),
      source: String(cond.source || "PHB"),
    });
  }

  const count = await upsertBatch("ref_conditions", rows);
  console.log(`  ✅ ${count} conditions ingested`);
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log("🎲 5e.tools Data Ingestion");
  console.log("=".repeat(50));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log("");

  try {
    await ingestRaces();
    await ingestClasses();
    await ingestBackgrounds();
    await ingestSpells();
    await ingestItems();
    await ingestConditions();

    console.log("\n" + "=".repeat(50));
    console.log("✅ Ingestion complete!");
  } catch (e) {
    console.error("\n❌ Ingestion failed:", (e as Error).message);
    process.exit(1);
  }
}

main();
