"use client";

import { useState } from "react";

function Section({
  title,
  defaultOpen = false,
  children,
  hidden = false,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  hidden?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (hidden) return null;

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors"
      >
        <span className="text-amber-400 font-semibold text-sm">{title}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 py-3 space-y-1 text-sm">{children}</div>}
    </div>
  );
}

function matchesSearch(text: string, filter: string): boolean {
  if (!filter) return true;
  return text.toLowerCase().includes(filter.toLowerCase());
}

interface ConditionEntry {
  name: string;
  effects: string[];
}

const CONDITIONS: ConditionEntry[] = [
  {
    name: "Blinded",
    effects: [
      "Can't see. Automatically fails any check that requires sight.",
      "Attack rolls against the creature have advantage.",
      "The creature's attack rolls have disadvantage.",
    ],
  },
  {
    name: "Charmed",
    effects: [
      "Can't attack the charmer or target them with harmful abilities or magical effects.",
      "The charmer has advantage on social ability checks to interact with the creature.",
    ],
  },
  {
    name: "Deafened",
    effects: [
      "Can't hear. Automatically fails any check that requires hearing.",
    ],
  },
  {
    name: "Exhaustion",
    effects: [
      "Level 1: Disadvantage on ability checks.",
      "Level 2: Speed halved.",
      "Level 3: Disadvantage on attack rolls and saving throws.",
      "Level 4: Hit point maximum halved.",
      "Level 5: Speed reduced to 0.",
      "Level 6: Death.",
      "Levels are cumulative. A long rest reduces exhaustion by 1 level (if you have food and drink).",
    ],
  },
  {
    name: "Frightened",
    effects: [
      "Disadvantage on ability checks and attack rolls while the source of fear is within line of sight.",
      "Can't willingly move closer to the source of fear.",
    ],
  },
  {
    name: "Grappled",
    effects: [
      "Speed becomes 0 and can't benefit from any bonus to speed.",
      "Ends if the grappler is incapacitated or the creature is moved out of the grappler's reach.",
    ],
  },
  {
    name: "Incapacitated",
    effects: [
      "Can't take actions or reactions.",
    ],
  },
  {
    name: "Invisible",
    effects: [
      "Impossible to see without magic or a special sense. Considered heavily obscured for hiding purposes.",
      "Attack rolls against the creature have disadvantage.",
      "The creature's attack rolls have advantage.",
    ],
  },
  {
    name: "Paralyzed",
    effects: [
      "Incapacitated — can't take actions or reactions.",
      "Can't move or speak.",
      "Automatically fails Strength and Dexterity saving throws.",
      "Attack rolls against the creature have advantage.",
      "Any hit from within 5 ft. is a critical hit.",
    ],
  },
  {
    name: "Petrified",
    effects: [
      "Transformed into a solid inanimate substance (usually stone). Weight increases by a factor of 10.",
      "Incapacitated, can't move or speak, unaware of surroundings.",
      "Attack rolls against the creature have advantage.",
      "Automatically fails Strength and Dexterity saving throws.",
      "Resistance to all damage. Immune to poison and disease (existing poison/disease is suspended).",
    ],
  },
  {
    name: "Poisoned",
    effects: [
      "Disadvantage on attack rolls and ability checks.",
    ],
  },
  {
    name: "Prone",
    effects: [
      "Can only crawl (1 ft. of movement costs 2 ft.) unless you stand up.",
      "Standing up costs half your movement speed.",
      "Disadvantage on attack rolls.",
      "Melee attacks against you from within 5 ft. have advantage; ranged attacks against you have disadvantage.",
    ],
  },
  {
    name: "Restrained",
    effects: [
      "Speed becomes 0 and can't benefit from any bonus to speed.",
      "Attack rolls against the creature have advantage.",
      "The creature's attack rolls have disadvantage.",
      "Disadvantage on Dexterity saving throws.",
    ],
  },
  {
    name: "Stunned",
    effects: [
      "Incapacitated — can't take actions or reactions.",
      "Can't move. Can speak only falteringly.",
      "Automatically fails Strength and Dexterity saving throws.",
      "Attack rolls against the creature have advantage.",
    ],
  },
  {
    name: "Unconscious",
    effects: [
      "Incapacitated — can't take actions or reactions.",
      "Can't move or speak. Unaware of surroundings.",
      "Drops whatever it's holding and falls prone.",
      "Automatically fails Strength and Dexterity saving throws.",
      "Attack rolls against the creature have advantage.",
      "Any hit from within 5 ft. is a critical hit.",
    ],
  },
];

export function Conditions({ searchFilter = "" }: { searchFilter?: string }) {
  const filtered = CONDITIONS.filter(
    (c) =>
      matchesSearch(c.name, searchFilter) ||
      c.effects.some((e) => matchesSearch(e, searchFilter))
  );

  if (filtered.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-8">
        No matches for &ldquo;{searchFilter}&rdquo;
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-amber-400">Conditions Quick Reference</h2>
      <p className="text-gray-400 text-sm">
        All {CONDITIONS.length} standard 5e conditions and their effects.
      </p>

      {filtered.map((condition) => (
        <Section key={condition.name} title={condition.name} defaultOpen={!!searchFilter}>
          <ul className="space-y-1">
            {condition.effects.map((effect, i) => (
              <li key={i} className="text-gray-300 leading-relaxed flex gap-2">
                <span className="text-amber-400 mt-0.5 flex-shrink-0">&bull;</span>
                <span>{effect}</span>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </div>
  );
}
