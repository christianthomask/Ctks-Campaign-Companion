"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CharacterDraft } from "@/app/player/character/create/page";

interface Props {
  draft: CharacterDraft;
  onUpdate: (updates: Partial<CharacterDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface Race {
  id: string;
  name: string;
  ability_bonuses: string | Record<string, number>;
  speed: number;
  traits: string | Array<{ name: string; description?: string }>;
}

// Format ability bonuses for display — handles both string and JSONB
function formatBonuses(bonuses: string | Record<string, number>): string {
  if (typeof bonuses === "string") return bonuses;
  if (!bonuses || typeof bonuses !== "object") return "";
  return Object.entries(bonuses)
    .map(([ab, val]) => `${ab.toUpperCase()} +${val}`)
    .join(", ");
}

// Format traits for display — handles both string and JSONB
function formatTraits(traits: string | Array<{ name: string; description?: string }>): string {
  if (typeof traits === "string") return traits;
  if (!Array.isArray(traits)) return "";
  return traits.map((t) => (typeof t === "string" ? t : t.name)).join(", ");
}

// Fallback static PHB races when no database data is available
const STATIC_RACES: Race[] = [
  {
    id: "human",
    name: "Human",
    ability_bonuses: "+1 to all ability scores",
    speed: 30,
    traits: "Extra language, versatile and adaptable",
  },
  {
    id: "elf",
    name: "Elf",
    ability_bonuses: "DEX +2",
    speed: 30,
    traits: "Darkvision, Keen Senses, Fey Ancestry, Trance",
  },
  {
    id: "dwarf",
    name: "Dwarf",
    ability_bonuses: "CON +2",
    speed: 25,
    traits: "Darkvision, Dwarven Resilience, Stonecunning",
  },
  {
    id: "halfling",
    name: "Halfling",
    ability_bonuses: "DEX +2",
    speed: 25,
    traits: "Lucky, Brave, Halfling Nimbleness",
  },
  {
    id: "half-elf",
    name: "Half-Elf",
    ability_bonuses: "CHA +2, +1 to two others",
    speed: 30,
    traits: "Darkvision, Fey Ancestry, Skill Versatility (2 skills)",
  },
  {
    id: "gnome",
    name: "Gnome",
    ability_bonuses: "INT +2",
    speed: 25,
    traits: "Darkvision, Gnome Cunning",
  },
  {
    id: "tiefling",
    name: "Tiefling",
    ability_bonuses: "CHA +2, INT +1",
    speed: 30,
    traits: "Darkvision, Hellish Resistance, Infernal Legacy",
  },
  {
    id: "dragonborn",
    name: "Dragonborn",
    ability_bonuses: "STR +2, CHA +1",
    speed: 30,
    traits: "Draconic Ancestry, Breath Weapon, Damage Resistance",
  },
  {
    id: "half-orc",
    name: "Half-Orc",
    ability_bonuses: "STR +2, CON +1",
    speed: 30,
    traits: "Darkvision, Menacing, Relentless Endurance, Savage Attacks",
  },
];

export function RaceStep({ draft, onUpdate, onNext, onBack }: Props) {
  const [races, setRaces] = useState<Race[]>(STATIC_RACES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Fetch races from Supabase on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchRaces() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("ref_races")
          .select("id, name, ability_bonuses, speed, traits")
          .order("name");

        if (!cancelled && data && data.length > 0 && !error) {
          setRaces(data as Race[]);
        }
        // If no data or error, keep the static fallback
      } catch {
        // Keep static fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRaces();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRaces = useMemo(() => {
    if (!search.trim()) return races;
    const q = search.toLowerCase();
    return races.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        formatBonuses(r.ability_bonuses).toLowerCase().includes(q) ||
        formatTraits(r.traits).toLowerCase().includes(q)
    );
  }, [races, search]);

  const handleSelect = (race: Race) => {
    onUpdate({ race_id: race.id, race_name: race.name });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-amber-400">Choose Your Race</h2>
        <p className="mt-1 text-sm text-gray-400">
          Your race determines physical traits, ability bonuses, and innate
          abilities.
        </p>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search races..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* Race cards */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading races...</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredRaces.map((race) => {
            const isSelected = draft.race_id === race.id;
            return (
              <button
                key={race.id}
                onClick={() => handleSelect(race)}
                className={`min-h-[44px] rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-950/30 ring-2 ring-amber-500/30"
                    : "border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800/80"
                }`}
              >
                <h3 className="text-lg font-semibold text-gray-100">
                  {race.name}
                </h3>
                <p className="mt-1 text-sm font-medium text-amber-400">
                  {formatBonuses(race.ability_bonuses)}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Speed: {race.speed} ft
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {formatTraits(race.traits)}
                </p>
              </button>
            );
          })}

          {filteredRaces.length === 0 && (
            <p className="col-span-full py-8 text-center text-gray-500">
              No races match your search.
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="min-h-[44px] rounded-lg border border-gray-700 bg-gray-800 px-6 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!draft.race_id}
          className="min-h-[44px] rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
