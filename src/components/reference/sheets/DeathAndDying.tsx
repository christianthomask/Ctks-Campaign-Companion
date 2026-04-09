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
    key: "dropping",
    title: "Dropping to 0 HP",
    content: [
      "When you drop to 0 hit points, you either die outright (see Instant Death) or fall unconscious.",
      "You fall unconscious and are subject to the Unconscious condition: you drop prone, can't take actions or reactions, can't move or speak, and are unaware of your surroundings.",
      "You drop whatever you're holding.",
      "Any remaining damage does NOT carry over — you're simply at 0 HP.",
    ],
  },
  {
    key: "death-saves",
    title: "Death Saving Throws",
    content: [
      "At the start of each of your turns while at 0 HP, you make a death saving throw — a special saving throw with no ability modifier.",
      "Roll a d20. 10 or higher = success. 9 or lower = failure.",
      "3 successes: you become stable (unconscious but no longer dying).",
      "3 failures: you die.",
      "Successes and failures don't need to be consecutive.",
      "Rolling a 1 counts as 2 failures.",
      "Rolling a 20: you regain 1 HP and become conscious.",
      "Taking damage while at 0 HP counts as 1 automatic failure (2 failures if the damage is a critical hit).",
    ],
  },
  {
    key: "instant-death",
    title: "Instant Death",
    content: [
      "If damage reduces you to 0 HP and there is remaining damage, and that remaining damage equals or exceeds your hit point maximum, you die instantly.",
      "Example: A character with a maximum of 12 HP currently has 6 HP. Taking 18 damage reduces them to 0 HP with 12 damage remaining. Since the remaining damage (12) equals their hit point maximum (12), instant death occurs.",
    ],
  },
  {
    key: "stabilizing",
    title: "Stabilizing a Creature",
    content: [
      "A stable creature is unconscious at 0 HP but no longer makes death saving throws.",
      "Ways to stabilize a dying creature:",
      "• Wisdom (Medicine) check DC 10 as an action.",
      "• The Spare the Dying cantrip (action, touch range).",
      "• Any healing (even 1 HP) stabilizes and makes the creature conscious.",
      "A stable creature that isn't healed regains 1 HP after 1d4 hours.",
      "If a stable creature takes damage, it starts making death saves again.",
    ],
  },
  {
    key: "healing-from-zero",
    title: "Healing from 0 HP",
    content: [
      "Any amount of healing received while at 0 HP brings you back to consciousness.",
      "You regain the number of hit points healed (starting from 0).",
      "Example: You're at 0 HP and an ally casts Healing Word for 7 HP. You regain consciousness at 7 HP.",
      "All accumulated death save successes and failures reset to zero.",
    ],
  },
];

export function DeathAndDying({ searchFilter = "" }: { searchFilter?: string }) {
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
      <h2 className="text-xl font-bold text-amber-400">Death &amp; Dying</h2>
      <p className="text-gray-400 text-sm">
        What happens when you drop to{" "}
        <span className="font-mono text-amber-400">0 HP</span> and how to come back.
      </p>

      {filtered.map((section) => (
        <Section key={section.key} title={section.title} defaultOpen={!!searchFilter}>
          <ul className="space-y-1.5">
            {section.content.map((line, i) => (
              <li key={i} className="text-gray-300 leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        </Section>
      ))}

      {!searchFilter && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm">
          <p className="text-amber-400 font-semibold mb-2">Death Save Tracker</p>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-gray-400 text-xs">Successes</span>
              <div className="flex gap-1.5 mt-1">
                <span className="w-4 h-4 rounded-full border-2 border-green-500/50 inline-block" />
                <span className="w-4 h-4 rounded-full border-2 border-green-500/50 inline-block" />
                <span className="w-4 h-4 rounded-full border-2 border-green-500/50 inline-block" />
              </div>
            </div>
            <div>
              <span className="text-gray-400 text-xs">Failures</span>
              <div className="flex gap-1.5 mt-1">
                <span className="w-4 h-4 rounded-full border-2 border-red-500/50 inline-block" />
                <span className="w-4 h-4 rounded-full border-2 border-red-500/50 inline-block" />
                <span className="w-4 h-4 rounded-full border-2 border-red-500/50 inline-block" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
