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

interface Species {
  id: string;
  name: string;
  speed: number;
  size: string;
  darkvision: number;
  creature_type: string;
  traits: string | Array<{ name: string; description?: string }>;
}

function formatTraits(traits: string | Array<{ name: string; description?: string }>): string {
  if (typeof traits === "string") return traits;
  if (!Array.isArray(traits)) return "";
  return traits.map((t) => (typeof t === "string" ? t : t.name)).join(", ");
}

const STATIC_SPECIES: Species[] = [
  { id: "human", name: "Human", speed: 30, size: "Medium", darkvision: 0, creature_type: "Humanoid", traits: "Resourceful, Skillful, Versatile" },
  { id: "elf", name: "Elf", speed: 30, size: "Medium", darkvision: 60, creature_type: "Humanoid", traits: "Darkvision, Fey Ancestry, Keen Senses, Trance" },
  { id: "dwarf", name: "Dwarf", speed: 30, size: "Medium", darkvision: 120, creature_type: "Humanoid", traits: "Darkvision, Dwarven Resilience, Stonecunning" },
  { id: "halfling", name: "Halfling", speed: 30, size: "Small", darkvision: 0, creature_type: "Humanoid", traits: "Brave, Halfling Nimbleness, Lucky, Naturally Stealthy" },
  { id: "dragonborn", name: "Dragonborn", speed: 30, size: "Medium", darkvision: 0, creature_type: "Humanoid", traits: "Draconic Ancestry, Breath Weapon, Damage Resistance" },
  { id: "gnome", name: "Gnome", speed: 30, size: "Small", darkvision: 60, creature_type: "Humanoid", traits: "Darkvision, Gnomish Cunning" },
  { id: "tiefling", name: "Tiefling", speed: 30, size: "Medium or Small", darkvision: 60, creature_type: "Humanoid", traits: "Darkvision, Fiendish Legacy, Otherworldly Presence" },
  { id: "orc", name: "Orc", speed: 30, size: "Medium", darkvision: 120, creature_type: "Humanoid", traits: "Adrenaline Rush, Darkvision, Relentless Endurance" },
  { id: "aasimar", name: "Aasimar", speed: 30, size: "Medium or Small", darkvision: 60, creature_type: "Humanoid", traits: "Celestial Resistance, Darkvision, Healing Hands, Light Bearer" },
  { id: "goliath", name: "Goliath", speed: 35, size: "Medium", darkvision: 0, creature_type: "Humanoid", traits: "Giant Ancestry, Large Form, Powerful Build" },
];

export function SpeciesStep({ draft, onUpdate, onNext, onBack }: Props) {
  const [species, setSpecies] = useState<Species[]>(STATIC_SPECIES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchSpecies() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("ref_species")
          .select("id, name, speed, size, darkvision, creature_type, traits")
          .order("name");

        if (!cancelled && data && data.length > 0 && !error) {
          setSpecies(data as Species[]);
        }
      } catch {
        // Keep static fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchSpecies();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return species;
    const q = search.toLowerCase();
    return species.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        formatTraits(s.traits).toLowerCase().includes(q)
    );
  }, [species, search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-amber-400">Choose Your Species</h2>
        <p className="mt-1 text-sm text-gray-400">
          Your species determines physical traits, innate abilities, and creature type.
          In 2024 rules, ability score bonuses come from your Background, not your species.
        </p>
      </div>

      <input
        type="text"
        placeholder="Search species..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading species...</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((sp) => {
            const isSelected = draft.species_id === sp.id;
            return (
              <button
                key={sp.id}
                onClick={() => onUpdate({ species_id: sp.id, species_name: sp.name })}
                className={`min-h-[44px] rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-950/30 ring-2 ring-amber-500/30"
                    : "border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800/80"
                }`}
              >
                <h3 className="text-lg font-semibold text-gray-100">{sp.name}</h3>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span>Speed: {sp.speed} ft</span>
                  <span>{sp.size}</span>
                  {sp.darkvision > 0 && <span>Darkvision {sp.darkvision} ft</span>}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {formatTraits(sp.traits)}
                </p>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-8 text-center text-gray-500">No species match your search.</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <button onClick={onBack} className="min-h-[44px] rounded-lg border border-gray-700 bg-gray-800 px-6 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700">Back</button>
        <button onClick={onNext} disabled={!draft.species_id} className="min-h-[44px] rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-40">Continue</button>
      </div>
    </div>
  );
}
