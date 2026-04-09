"use client";

import type { CharacterDraft } from "@/app/player/character/create/page";

interface Props {
  draft: CharacterDraft;
  onUpdate: (updates: Partial<CharacterDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

const ARCHETYPES = [
  {
    id: "martial",
    name: "Warrior",
    icon: "\u2694\uFE0F",
    description:
      "You solve problems with steel and strength. Whether a disciplined soldier, a raging berserker, or a nimble duelist, you thrive in the thick of battle.",
    classes: "Fighter, Barbarian, Monk, Paladin, Ranger",
    color: "border-red-600/50 bg-red-950/20",
    selectedColor: "border-red-500 bg-red-950/40 ring-2 ring-red-500/30",
    accentText: "text-red-400",
  },
  {
    id: "skill",
    name: "Scoundrel",
    icon: "\uD83D\uDDE1\uFE0F",
    description:
      "Cunning, charm, and quick fingers are your tools. You talk your way in, sneak your way through, and always have a trick up your sleeve.",
    classes: "Rogue, Bard, Ranger",
    color: "border-emerald-600/50 bg-emerald-950/20",
    selectedColor: "border-emerald-500 bg-emerald-950/40 ring-2 ring-emerald-500/30",
    accentText: "text-emerald-400",
  },
  {
    id: "caster",
    name: "Arcanist",
    icon: "\u2728",
    description:
      "You wield arcane or natural magic to reshape reality. Whether through study, innate talent, or a pact with a powerful being, magic is your weapon.",
    classes: "Wizard, Sorcerer, Warlock, Druid",
    color: "border-purple-600/50 bg-purple-950/20",
    selectedColor: "border-purple-500 bg-purple-950/40 ring-2 ring-purple-500/30",
    accentText: "text-purple-400",
  },
  {
    id: "hybrid",
    name: "Devotee",
    icon: "\uD83D\uDEE1\uFE0F",
    description:
      "You draw power from faith, nature, or an oath. You can hold your own in a fight while supporting allies with healing and divine magic.",
    classes: "Cleric, Paladin, Druid, Ranger",
    color: "border-sky-600/50 bg-sky-950/20",
    selectedColor: "border-sky-500 bg-sky-950/40 ring-2 ring-sky-500/30",
    accentText: "text-sky-400",
  },
];

export function ConceptStep({ draft, onUpdate, onNext, onBack }: Props) {
  const handleSelect = (archetypeId: string) => {
    onUpdate({ archetype: archetypeId });
  };

  const handleSkip = () => {
    onUpdate({ archetype: null });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-amber-400">Character Concept</h2>
        <p className="mt-1 text-sm text-gray-400">
          What kind of adventurer do you want to play? Choose an archetype to
          filter classes, or skip to see everything.
        </p>
      </div>

      {/* Archetype cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {ARCHETYPES.map((archetype) => {
          const isSelected = draft.archetype === archetype.id;
          return (
            <button
              key={archetype.id}
              onClick={() => handleSelect(archetype.id)}
              className={`min-h-[44px] rounded-xl border p-4 text-left transition-all ${
                isSelected ? archetype.selectedColor : archetype.color
              } hover:brightness-110`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-2xl" role="img" aria-label={archetype.name}>
                  {archetype.icon}
                </span>
                <h3 className="text-lg font-semibold text-gray-100">
                  {archetype.name}
                </h3>
              </div>
              <p className="mb-2 text-sm leading-relaxed text-gray-300">
                {archetype.description}
              </p>
              <p className={`text-xs ${archetype.accentText}`}>
                Classes: {archetype.classes}
              </p>
            </button>
          );
        })}
      </div>

      {/* Skip link */}
      <div className="text-center">
        <button
          onClick={handleSkip}
          className="min-h-[44px] text-sm text-gray-400 underline decoration-gray-600 underline-offset-4 transition-colors hover:text-gray-200"
        >
          Skip &mdash; show all classes
        </button>
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
          disabled={!draft.archetype}
          className="min-h-[44px] rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
