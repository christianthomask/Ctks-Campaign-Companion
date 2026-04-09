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
      {open && <div className="px-4 py-3 space-y-2 text-sm">{children}</div>}
    </div>
  );
}

function matchesSearch(text: string, filter: string): boolean {
  if (!filter) return true;
  return text.toLowerCase().includes(filter.toLowerCase());
}

const SECTIONS = [
  {
    key: "slots",
    title: "Spell Slots & Levels",
    content: [
      "Spells have levels from 1st to 9th. Higher level = more powerful.",
      "Spell slots are your 'fuel' for casting. Each slot has a level. To cast a spell, you expend a slot of the spell's level or higher.",
      "Expended spell slots are restored after a long rest (Warlocks restore theirs on a short rest).",
      "Your class table tells you how many slots of each level you have.",
    ],
  },
  {
    key: "cantrips",
    title: "Cantrips",
    content: [
      "Cantrips are 0-level spells you can cast at will, without expending a spell slot.",
      "They are always available and can be used as often as you like.",
      "Most cantrips scale in damage at certain character levels (5th, 11th, 17th).",
    ],
  },
  {
    key: "casting-time",
    title: "Casting Time, Range & Components",
    content: [
      "Casting Time: Most spells take 1 action. Some take a bonus action, reaction, or longer (1 minute, 10 minutes, 1 hour, etc.).",
      "Range: Self, Touch, or a distance in feet. You must be able to see or target the point/creature.",
      "Components:",
      "  V (Verbal) — You must speak. Can't cast if silenced.",
      "  S (Somatic) — You need a free hand for gestures. Can't cast if both hands are occupied (unless using a focus).",
      "  M (Material) — You need specific materials. A component pouch or arcane focus can replace materials that don't have a cost listed.",
      "  Materials with a listed gold cost must be provided specifically and are consumed if the spell says so.",
    ],
  },
  {
    key: "concentration",
    title: "Concentration",
    content: [
      "Some spells require concentration to maintain (marked with 'Concentration' in duration).",
      "You can only concentrate on ONE spell at a time. Casting another concentration spell ends the first.",
      "Concentration can be broken by:",
      "  • Taking damage — make a Constitution saving throw. DC = 10 or half the damage taken, whichever is higher. On failure, the spell ends.",
      "  • Being incapacitated or killed.",
      "  • DM-determined environmental effects (e.g., a wave crashing over you — typically DC 10 Con save).",
      "You can voluntarily end concentration at any time (no action required).",
    ],
  },
  {
    key: "ritual",
    title: "Ritual Casting",
    content: [
      "Some spells have the 'Ritual' tag.",
      "If you can cast rituals (class dependent), you can cast a ritual spell without expending a spell slot.",
      "Ritual casting takes 10 minutes longer than the spell's normal casting time.",
      "Wizards can cast any ritual spell in their spellbook (even if not prepared). Clerics, Druids, and Bards must have the spell prepared/known.",
    ],
  },
  {
    key: "save-dc",
    title: "Spell Save DC & Spell Attack",
    content: [
      "Spell Save DC = 8 + proficiency bonus + spellcasting ability modifier.",
      "This is the number enemies must meet or beat on their saving throw to resist your spell.",
      "Spell Attack Modifier = proficiency bonus + spellcasting ability modifier.",
      "Roll d20 + spell attack modifier vs. target's AC for spells that require attack rolls.",
      "Spellcasting ability depends on class: Intelligence (Wizard, Artificer), Wisdom (Cleric, Druid, Ranger), Charisma (Bard, Paladin, Sorcerer, Warlock).",
    ],
  },
  {
    key: "upcasting",
    title: "Upcasting",
    content: [
      "Many spells can be cast using a higher-level slot for increased effect.",
      "The spell description specifies what changes 'At Higher Levels.'",
      "Example: Cure Wounds cast with a 2nd-level slot heals an additional 1d8 over the base amount.",
      "A spell always counts as the level of the slot used to cast it. A 1st-level spell cast with a 3rd-level slot is treated as a 3rd-level spell.",
    ],
  },
];

export function SpellcastingBasics({ searchFilter = "" }: { searchFilter?: string }) {
  const filtered = SECTIONS.filter(
    (s) =>
      matchesSearch(s.title, searchFilter) ||
      s.content.some((c) => matchesSearch(c, searchFilter))
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
      <h2 className="text-xl font-bold text-amber-400">Spellcasting Basics</h2>
      <p className="text-gray-400 text-sm">
        How spells, spell slots, and spellcasting mechanics work.
      </p>

      {filtered.map((section) => (
        <Section key={section.key} title={section.title} defaultOpen={!!searchFilter}>
          <ul className="space-y-1.5">
            {section.content.map((line, i) => (
              <li
                key={i}
                className={`leading-relaxed ${line.startsWith("  ") ? "text-gray-400 ml-3" : "text-gray-300"}`}
              >
                {line}
              </li>
            ))}
          </ul>
        </Section>
      ))}

      {!searchFilter && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm space-y-3">
          <div>
            <p className="text-amber-400 font-semibold mb-1">Spell Save DC</p>
            <p className="text-gray-300">
              <span className="font-mono text-amber-400">8</span> + proficiency bonus +
              spellcasting ability modifier
            </p>
          </div>
          <div>
            <p className="text-amber-400 font-semibold mb-1">Spell Attack</p>
            <p className="text-gray-300">
              <span className="font-mono text-amber-400">d20</span> + proficiency bonus +
              spellcasting ability modifier
            </p>
          </div>
          <div>
            <p className="text-amber-400 font-semibold mb-1">Concentration Save DC</p>
            <p className="text-gray-300">
              <span className="font-mono text-amber-400">max(10, damage &divide; 2)</span>
              {" — Constitution saving throw"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
