"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { computeCharacterStats, type ComputedStats } from "@/lib/utils/characterStats";
import Link from "next/link";

interface Character {
  id: string;
  name: string;
  species_id: string | null;
  class_id: string | null;
  level: number;
  str_base: number;
  dex_base: number;
  con_base: number;
  int_base: number;
  wis_base: number;
  cha_base: number;
  skill_proficiencies: string[];
  hp_current: number | null;
  hp_max: number | null;
  hp_temp: number | null;
  equipment: Array<{ item_id: string; quantity: number; equipped: boolean }>;
  cantrips_known: string[];
  spells_known: string[];
  personality_traits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  backstory: string;
  appearance: string;
  book_donation: string;
}

type Tab = "combat" | "abilities" | "spells" | "inventory" | "character";

export default function CharacterSheetPage() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [stats, setStats] = useState<ComputedStats | null>(null);
  const [tab, setTab] = useState<Tab>("combat");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "complete")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        const char = data as unknown as Character;
        setCharacter(char);

        // Compute stats (simplified — no ref table lookups for now)
        const computed = computeCharacterStats(
          {
            level: char.level,
            race_id: char.species_id,
            class_id: char.class_id,
            str_base: char.str_base,
            dex_base: char.dex_base,
            con_base: char.con_base,
            int_base: char.int_base,
            wis_base: char.wis_base,
            cha_base: char.cha_base,
            skill_proficiencies: char.skill_proficiencies || [],
            equipment: char.equipment || [],
            hp_max: char.hp_max,
            hp_current: char.hp_current,
            hp_temp: char.hp_temp,
          },
          null, // race data — would need ref table lookup
          null, // class data — would need ref table lookup
          []    // equipped items — would need ref table lookup
        );
        setStats(computed);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse px-4 py-6">
        <div className="h-8 w-48 rounded bg-gray-800 mb-4" />
        <div className="h-20 rounded bg-gray-800/50 mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded bg-gray-800/50" />
          ))}
        </div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4">
        <p className="text-gray-400 mb-4">No character yet.</p>
        <Link
          href="/player/character/create"
          className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-gray-950 hover:bg-amber-500"
        >
          Create Character
        </Link>
      </div>
    );
  }

  function modStr(mod: number) {
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "combat", label: "Combat" },
    { id: "abilities", label: "Skills" },
    { id: "spells", label: "Spells" },
    { id: "inventory", label: "Items" },
    { id: "character", label: "Bio" },
  ];

  return (
    <div className="min-h-full px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-amber-400">{character.name}</h1>
          <p className="text-sm text-gray-400">
            Level {character.level} {character.species_id} {character.class_id}
          </p>
        </div>

        {/* Quick stats bar */}
        {stats && (
          <div className="mb-6 grid grid-cols-4 gap-2">
            <div className="rounded-lg bg-red-900/30 p-3 text-center">
              <div className="text-2xl font-bold font-mono text-red-300">
                {stats.hpCurrent}/{stats.hpMax}
              </div>
              <div className="text-xs text-gray-400">HP</div>
            </div>
            <div className="rounded-lg bg-blue-900/30 p-3 text-center">
              <div className="text-2xl font-bold font-mono text-blue-300">
                {stats.ac}
              </div>
              <div className="text-xs text-gray-400">AC</div>
            </div>
            <div className="rounded-lg bg-green-900/30 p-3 text-center">
              <div className="text-2xl font-bold font-mono text-green-300">
                {modStr(stats.initiative)}
              </div>
              <div className="text-xs text-gray-400">Init</div>
            </div>
            <div className="rounded-lg bg-purple-900/30 p-3 text-center">
              <div className="text-2xl font-bold font-mono text-purple-300">
                {stats.speed} ft
              </div>
              <div className="text-xs text-gray-400">Speed</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4 flex border-b border-gray-800">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-b-2 border-amber-400 text-amber-400"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "combat" && stats && (
          <div className="space-y-4">
            {/* Ability scores */}
            <div className="grid grid-cols-6 gap-1 rounded-lg bg-gray-900 p-3 text-center text-xs">
              {(["str", "dex", "con", "int", "wis", "cha"] as const).map((ab) => (
                <div key={ab}>
                  <div className="font-semibold uppercase text-gray-400">{ab}</div>
                  <div className="text-lg font-mono text-gray-100">{stats[ab]}</div>
                  <div className="font-mono text-gray-400">
                    ({modStr(stats[`${ab}Mod` as keyof ComputedStats] as number)})
                  </div>
                </div>
              ))}
            </div>

            {/* Proficiency bonus */}
            <div className="rounded-lg bg-gray-900 p-3 flex justify-between items-center">
              <span className="text-sm text-gray-300">Proficiency Bonus</span>
              <span className="font-mono text-amber-400">{modStr(stats.proficiencyBonus)}</span>
            </div>

            {/* Saving throws */}
            <div className="rounded-lg bg-gray-900 p-3">
              <h3 className="mb-2 text-sm font-semibold text-gray-300">Saving Throws</h3>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(stats.savingThrows).map(([ab, save]) => (
                  <div key={ab} className="flex items-center justify-between text-sm">
                    <span className={save.proficient ? "text-amber-400" : "text-gray-400"}>
                      {save.proficient ? "●" : "○"} {ab.toUpperCase()}
                    </span>
                    <span className="font-mono text-gray-200">{modStr(save.modifier)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "abilities" && stats && (
          <div className="rounded-lg bg-gray-900 p-3">
            <h3 className="mb-3 text-sm font-semibold text-gray-300">Skills</h3>
            <div className="space-y-1">
              {Object.entries(stats.skills)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([skill, data]) => (
                  <div key={skill} className="flex items-center justify-between text-sm py-1">
                    <span className={data.proficient ? "text-amber-400" : "text-gray-400"}>
                      {data.proficient ? "●" : "○"}{" "}
                      {skill
                        .split("-")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}
                    </span>
                    <span className="font-mono text-gray-200">{modStr(data.modifier)}</span>
                  </div>
                ))}
            </div>
            <div className="mt-3 border-t border-gray-800 pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Passive Perception</span>
                <span className="font-mono text-gray-200">{stats.passivePerception}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Passive Investigation</span>
                <span className="font-mono text-gray-200">{stats.passiveInvestigation}</span>
              </div>
            </div>
          </div>
        )}

        {tab === "spells" && (
          <div className="rounded-lg bg-gray-900 p-4">
            {character.cantrips_known.length > 0 || character.spells_known.length > 0 ? (
              <div className="space-y-4">
                {character.cantrips_known.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-300">Cantrips</h3>
                    <div className="space-y-1">
                      {character.cantrips_known.map((s) => (
                        <div key={s} className="text-sm text-gray-200">{s}</div>
                      ))}
                    </div>
                  </div>
                )}
                {character.spells_known.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-300">Level 1 Spells</h3>
                    <div className="space-y-1">
                      {character.spells_known.map((s) => (
                        <div key={s} className="text-sm text-gray-200">{s}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No spells — not a caster class.</p>
            )}
          </div>
        )}

        {tab === "inventory" && (
          <div className="rounded-lg bg-gray-900 p-4">
            {character.equipment.length > 0 ? (
              <div className="space-y-1">
                {character.equipment.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-200">
                      {(item as unknown as { name: string }).name || item.item_id}
                    </span>
                    <span className="text-gray-500">x{item.quantity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No equipment selected.</p>
            )}
          </div>
        )}

        {tab === "character" && (
          <div className="space-y-4">
            {character.appearance && (
              <div className="rounded-lg bg-gray-900 p-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-300">Appearance</h3>
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{character.appearance}</p>
              </div>
            )}
            {character.backstory && (
              <div className="rounded-lg bg-gray-900 p-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-300">Backstory</h3>
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{character.backstory}</p>
              </div>
            )}
            {character.personality_traits && (
              <div className="rounded-lg bg-gray-900 p-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-300">Personality</h3>
                <p className="text-sm text-gray-200">{character.personality_traits}</p>
                {character.ideals && <p className="mt-1 text-sm text-gray-400">Ideals: {character.ideals}</p>}
                {character.bonds && <p className="mt-1 text-sm text-gray-400">Bonds: {character.bonds}</p>}
                {character.flaws && <p className="mt-1 text-sm text-gray-400">Flaws: {character.flaws}</p>}
              </div>
            )}
            {character.book_donation && (
              <div className="rounded-lg bg-amber-950/30 border border-amber-900/50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-amber-400">Book Donation</h3>
                <p className="text-sm text-gray-200">{character.book_donation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
