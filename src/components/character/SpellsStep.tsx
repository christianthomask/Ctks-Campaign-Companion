"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CharacterDraft } from "@/app/player/character/create/page";

interface Props {
  draft: CharacterDraft;
  onUpdate: (updates: Partial<CharacterDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  concentration: boolean;
  ritual: boolean;
  description: string;
}

const CANTRIP_COUNTS: Record<string, number> = {
  wizard: 3, sorcerer: 4, warlock: 2, bard: 2, cleric: 3, druid: 2,
};
const SPELL_COUNTS: Record<string, number> = {
  wizard: 6, sorcerer: 2, warlock: 2, bard: 4, cleric: 99, druid: 99,
};

export function SpellsStep({ draft, onUpdate, onNext, onBack }: Props) {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState(true);

  const maxCantrips = CANTRIP_COUNTS[draft.class_id || ""] || 2;
  const maxSpells = SPELL_COUNTS[draft.class_id || ""] || 2;

  useEffect(() => {
    async function fetchSpells() {
      const supabase = createClient();
      const { data } = await supabase
        .from("ref_spells")
        .select("id, name, level, school, casting_time, range, concentration, ritual, description")
        .contains("classes", [draft.class_id || ""])
        .lte("level", 1)
        .order("level")
        .order("name");

      if (data && data.length > 0) {
        setSpells(data as Spell[]);
      }
      setLoading(false);
    }
    fetchSpells();
  }, [draft.class_id]);

  const cantrips = spells.filter((s) => s.level === 0);
  const level1Spells = spells.filter((s) => s.level === 1);

  function toggleCantrip(id: string) {
    const current = draft.cantrips_known;
    const next = current.includes(id)
      ? current.filter((c) => c !== id)
      : current.length < maxCantrips
      ? [...current, id]
      : current;
    onUpdate({ cantrips_known: next });
  }

  function toggleSpell(id: string) {
    const current = draft.spells_known;
    const next = current.includes(id)
      ? current.filter((s) => s !== id)
      : current.length < maxSpells
      ? [...current, id]
      : current;
    onUpdate({ spells_known: next });
  }

  if (loading) {
    return <div className="animate-pulse space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded bg-gray-800/50" />)}</div>;
  }

  if (spells.length === 0) {
    return (
      <div>
        <h2 className="mb-2 text-xl font-bold text-gray-100">Spells</h2>
        <p className="mb-6 text-sm text-gray-400">
          No spell data available yet. The 5e.tools data needs to be ingested first. You can add spells later.
        </p>
        <div className="mt-8 flex justify-between">
          <button onClick={onBack} className="rounded-lg bg-gray-800 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700">Back</button>
          <button onClick={onNext} className="rounded-lg bg-amber-600 px-6 py-3 text-sm font-medium text-gray-950 hover:bg-amber-500">Continue</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-gray-100">Spells</h2>
      <p className="mb-6 text-sm text-gray-400">Choose your starting spells.</p>

      {/* Cantrips */}
      <h3 className="mb-2 text-sm font-semibold text-amber-400">
        Cantrips ({draft.cantrips_known.length}/{maxCantrips})
      </h3>
      <div className="mb-6 space-y-2">
        {cantrips.map((spell) => (
          <button
            key={spell.id}
            onClick={() => toggleCantrip(spell.id)}
            className={`w-full rounded-lg p-3 text-left transition-colors ${
              draft.cantrips_known.includes(spell.id)
                ? "bg-amber-900/20 border border-amber-700/50"
                : "bg-gray-900 border border-transparent hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-100">{spell.name}</span>
              <span className="text-xs text-gray-500">{spell.school}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400 line-clamp-1">{spell.description}</p>
          </button>
        ))}
      </div>

      {/* Level 1 spells */}
      <h3 className="mb-2 text-sm font-semibold text-amber-400">
        Level 1 Spells ({draft.spells_known.length}/{maxSpells})
      </h3>
      <div className="space-y-2">
        {level1Spells.map((spell) => (
          <button
            key={spell.id}
            onClick={() => toggleSpell(spell.id)}
            className={`w-full rounded-lg p-3 text-left transition-colors ${
              draft.spells_known.includes(spell.id)
                ? "bg-amber-900/20 border border-amber-700/50"
                : "bg-gray-900 border border-transparent hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-100">{spell.name}</span>
              {spell.concentration && <span className="rounded bg-blue-900/50 px-1.5 py-0.5 text-xs text-blue-300">C</span>}
              {spell.ritual && <span className="rounded bg-green-900/50 px-1.5 py-0.5 text-xs text-green-300">R</span>}
            </div>
            <p className="mt-1 text-xs text-gray-400 line-clamp-1">{spell.description}</p>
          </button>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="rounded-lg bg-gray-800 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700">Back</button>
        <button onClick={onNext} className="rounded-lg bg-amber-600 px-6 py-3 text-sm font-medium text-gray-950 hover:bg-amber-500">Continue</button>
      </div>
    </div>
  );
}
