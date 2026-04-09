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

interface Background {
  id: string;
  name: string;
  skill_proficiencies: string;
  description: string;
}

const STATIC_BACKGROUNDS: Background[] = [
  {
    id: "acolyte",
    name: "Acolyte",
    skill_proficiencies: "Insight, Religion",
    description:
      "You have spent your life in service to a temple, learning sacred rites and providing sacrifices to the gods.",
  },
  {
    id: "criminal",
    name: "Criminal",
    skill_proficiencies: "Deception, Stealth",
    description:
      "You have a history of breaking the law. You have a reliable contact who acts as your liaison to a criminal network.",
  },
  {
    id: "folk-hero",
    name: "Folk Hero",
    skill_proficiencies: "Animal Handling, Survival",
    description:
      "You come from a humble background, but you are destined for much more. People from your village regard you as their champion.",
  },
  {
    id: "noble",
    name: "Noble",
    skill_proficiencies: "History, Persuasion",
    description:
      "You come from a family of wealth, power, and privilege. Your family owns land, collects taxes, and wields political influence.",
  },
  {
    id: "sage",
    name: "Sage",
    skill_proficiencies: "Arcana, History",
    description:
      "You spent years learning the lore of the multiverse. You have scoured manuscripts and studied scrolls to uncover hidden knowledge.",
  },
  {
    id: "soldier",
    name: "Soldier",
    skill_proficiencies: "Athletics, Intimidation",
    description:
      "War has been your life for as long as you care to remember. You trained as a youth, studied warfare, and served in a military.",
  },
  {
    id: "entertainer",
    name: "Entertainer",
    skill_proficiencies: "Acrobatics, Performance",
    description:
      "You thrive in front of an audience. You know how to entrance, fascinate, and entertain through music, dance, or acting.",
  },
  {
    id: "outlander",
    name: "Outlander",
    skill_proficiencies: "Athletics, Survival",
    description:
      "You grew up in the wilds, far from civilization. The wilderness is in your blood, and you have an excellent memory for maps and geography.",
  },
];

export function BackgroundStep({ draft, onUpdate, onNext, onBack }: Props) {
  const [backgrounds, setBackgrounds] = useState<Background[]>(STATIC_BACKGROUNDS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchBackgrounds() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("ref_backgrounds")
          .select("id, name, skill_proficiencies, description")
          .order("name");

        if (!cancelled && data && data.length > 0 && !error) {
          setBackgrounds(data as Background[]);
        }
      } catch {
        // Keep static fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBackgrounds();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return backgrounds;
    const q = search.toLowerCase();
    return backgrounds.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.skill_proficiencies.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );
  }, [backgrounds, search]);

  const handleSelect = (bg: Background) => {
    onUpdate({
      background_id: bg.id,
      background_name: bg.name,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-amber-400">Background</h2>
        <p className="mt-1 text-sm text-gray-400">
          Your background reveals where you came from and your place in the
          world. It also provides additional skill proficiencies.
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search backgrounds..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />

      {/* Background cards */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">
          Loading backgrounds...
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((bg) => {
            const isSelected = draft.background_id === bg.id;
            return (
              <button
                key={bg.id}
                onClick={() => handleSelect(bg)}
                className={`min-h-[44px] rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-950/30 ring-2 ring-amber-500/30"
                    : "border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800/80"
                }`}
              >
                <h3 className="text-lg font-semibold text-gray-100">
                  {bg.name}
                </h3>
                <p className="mt-1 text-xs font-medium text-amber-400">
                  {bg.skill_proficiencies}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {bg.description}
                </p>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <p className="col-span-full py-8 text-center text-gray-500">
              No backgrounds match your search.
            </p>
          )}
        </div>
      )}

      {/* Personality traits / ideals / bonds / flaws */}
      {draft.background_id && (
        <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h3 className="font-semibold text-gray-100">
            Personality &amp; Roleplay
          </h3>
          <p className="text-xs text-gray-500">
            These help define how your character thinks and acts. You can fill
            these in now or come back later.
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Personality Traits
            </label>
            <textarea
              value={draft.personality_traits}
              onChange={(e) =>
                onUpdate({ personality_traits: e.target.value })
              }
              placeholder="Two personality traits that make your character unique..."
              rows={2}
              className="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Ideals
            </label>
            <textarea
              value={draft.ideals}
              onChange={(e) => onUpdate({ ideals: e.target.value })}
              placeholder="What principles drive your character?"
              rows={2}
              className="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Bonds
            </label>
            <textarea
              value={draft.bonds}
              onChange={(e) => onUpdate({ bonds: e.target.value })}
              placeholder="What connections tie you to people, places, or events?"
              rows={2}
              className="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Flaws
            </label>
            <textarea
              value={draft.flaws}
              onChange={(e) => onUpdate({ flaws: e.target.value })}
              placeholder="What is your character's weakness or vice?"
              rows={2}
              className="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
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
          disabled={!draft.background_id}
          className="min-h-[44px] rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
