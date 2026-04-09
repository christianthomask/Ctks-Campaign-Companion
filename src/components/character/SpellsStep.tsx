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

// Number of cantrips known at level 1 by class
const CANTRIP_COUNTS: Record<string, number> = {
  wizard: 3,
  sorcerer: 4,
  warlock: 2,
  bard: 2,
  cleric: 3,
  druid: 2,
};

// Number of level-1 spells known/prepared at level 1
// (For prepared casters like cleric/druid, this is WIS mod + level, but we
// approximate generously so users can pick freely at creation time.)
const SPELL_COUNTS: Record<string, number> = {
  wizard: 6,
  sorcerer: 2,
  warlock: 2,
  bard: 4,
  cleric: 99, // prepared caster — picks from full list
  druid: 99, // prepared caster
  paladin: 99, // prepared caster
  ranger: 2,
};

// School abbreviation colors
const SCHOOL_COLORS: Record<string, string> = {
  Abjuration: "text-blue-400",
  Conjuration: "text-yellow-400",
  Divination: "text-cyan-400",
  Enchantment: "text-pink-400",
  Evocation: "text-red-400",
  Illusion: "text-purple-400",
  Necromancy: "text-green-400",
  Transmutation: "text-orange-400",
};

export function SpellsStep({ draft, onUpdate, onNext, onBack }: Props) {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedSpell, setExpandedSpell] = useState<string | null>(null);

  const maxCantrips = CANTRIP_COUNTS[draft.class_id || ""] || 2;
  const maxSpells = SPELL_COUNTS[draft.class_id || ""] || 2;

  // Fetch spells from Supabase, filtered by class
  useEffect(() => {
    let cancelled = false;

    async function fetchSpells() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("ref_spells")
          .select(
            "id, name, level, school, casting_time, range, concentration, ritual, description"
          )
          .contains("classes", [draft.class_id || ""])
          .lte("level", 1)
          .order("level")
          .order("name");

        if (!cancelled && data && data.length > 0 && !error) {
          setSpells(data as Spell[]);
        }
      } catch {
        // Keep empty — will show placeholder
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSpells();
    return () => {
      cancelled = true;
    };
  }, [draft.class_id]);

  // Split into cantrips and level 1 spells, with search filtering
  const { cantrips, level1Spells } = useMemo(() => {
    let filtered = spells;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = spells.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.school.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );
    }
    return {
      cantrips: filtered.filter((s) => s.level === 0),
      level1Spells: filtered.filter((s) => s.level === 1),
    };
  }, [spells, search]);

  function toggleCantrip(id: string) {
    const current = draft.cantrips_known;
    if (current.includes(id)) {
      onUpdate({ cantrips_known: current.filter((c) => c !== id) });
    } else if (current.length < maxCantrips) {
      onUpdate({ cantrips_known: [...current, id] });
    }
  }

  function toggleSpell(id: string) {
    const current = draft.spells_known;
    if (current.includes(id)) {
      onUpdate({ spells_known: current.filter((s) => s !== id) });
    } else if (current.length < maxSpells) {
      onUpdate({ spells_known: [...current, id] });
    }
  }

  function toggleExpand(id: string) {
    setExpandedSpell((prev) => (prev === id ? null : id));
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-amber-400">Spells</h2>
          <p className="mt-1 text-sm text-gray-400">Loading spell list...</p>
        </div>
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-800/50" />
          ))}
        </div>
      </div>
    );
  }

  // No spells available — placeholder
  if (spells.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-amber-400">Spells</h2>
          <p className="mt-1 text-sm text-gray-400">
            Choose your starting cantrips and spells.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-gray-700 py-16 text-center">
          <p className="text-gray-500">
            No spell data available yet for{" "}
            <span className="text-gray-300">{draft.class_name || "this class"}</span>.
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Spell reference data needs to be imported. You can add spells to
            your character later.
          </p>
        </div>

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
            className="min-h-[44px] rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Render a spell card
  function SpellCard({
    spell,
    isSelected,
    onToggle,
    isDisabled,
  }: {
    spell: Spell;
    isSelected: boolean;
    onToggle: () => void;
    isDisabled: boolean;
  }) {
    const isExpanded = expandedSpell === spell.id;

    return (
      <div
        className={`rounded-xl border transition-all ${
          isSelected
            ? "border-amber-500/50 bg-amber-950/20"
            : "border-gray-800 bg-gray-900"
        }`}
      >
        <button
          onClick={onToggle}
          disabled={isDisabled && !isSelected}
          className={`flex min-h-[44px] w-full items-start gap-3 p-3 text-left ${
            isDisabled && !isSelected
              ? "cursor-not-allowed opacity-40"
              : "hover:bg-gray-800/50"
          }`}
        >
          {/* Checkbox indicator */}
          <div
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
              isSelected
                ? "border-amber-500 bg-amber-600"
                : "border-gray-600 bg-gray-800"
            }`}
          >
            {isSelected && (
              <svg
                className="h-3 w-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-100">{spell.name}</span>
              {spell.concentration && (
                <span className="shrink-0 rounded bg-blue-900/50 px-1.5 py-0.5 text-xs font-medium text-blue-300">
                  C
                </span>
              )}
              {spell.ritual && (
                <span className="shrink-0 rounded bg-green-900/50 px-1.5 py-0.5 text-xs font-medium text-green-300">
                  R
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
              <span className={SCHOOL_COLORS[spell.school] || "text-gray-400"}>
                {spell.school}
              </span>
              <span>{spell.casting_time}</span>
              <span>{spell.range}</span>
            </div>
          </div>
        </button>

        {/* Expandable description */}
        <button
          onClick={() => toggleExpand(spell.id)}
          className="w-full border-t border-gray-800/50 px-3 py-1.5 text-left text-xs text-gray-600 hover:text-gray-400"
        >
          {isExpanded ? "Hide details" : "Show details"}
        </button>
        {isExpanded && (
          <div className="border-t border-gray-800/50 px-3 py-2">
            <p className="text-sm leading-relaxed text-gray-400">
              {spell.description}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-amber-400">Spells</h2>
        <p className="mt-1 text-sm text-gray-400">
          Choose your starting cantrips and spells for{" "}
          <span className="text-gray-300">{draft.class_name}</span>.
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search spells..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />

      {/* Cantrips */}
      {cantrips.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-400">Cantrips</h3>
            <span className="text-xs text-gray-500">
              {draft.cantrips_known.length} / {maxCantrips} selected
            </span>
          </div>
          <div className="space-y-2">
            {cantrips.map((spell) => (
              <SpellCard
                key={spell.id}
                spell={spell}
                isSelected={draft.cantrips_known.includes(spell.id)}
                onToggle={() => toggleCantrip(spell.id)}
                isDisabled={draft.cantrips_known.length >= maxCantrips}
              />
            ))}
          </div>
        </div>
      )}

      {/* Level 1 Spells */}
      {level1Spells.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-400">
              Level 1 Spells
            </h3>
            {maxSpells < 99 && (
              <span className="text-xs text-gray-500">
                {draft.spells_known.length} / {maxSpells} selected
              </span>
            )}
          </div>
          <div className="space-y-2">
            {level1Spells.map((spell) => (
              <SpellCard
                key={spell.id}
                spell={spell}
                isSelected={draft.spells_known.includes(spell.id)}
                onToggle={() => toggleSpell(spell.id)}
                isDisabled={draft.spells_known.length >= maxSpells}
              />
            ))}
          </div>
        </div>
      )}

      {cantrips.length === 0 && level1Spells.length === 0 && search.trim() && (
        <div className="py-8 text-center text-gray-500">
          No spells match your search.
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
          className="min-h-[44px] rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
