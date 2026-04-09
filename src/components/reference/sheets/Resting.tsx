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
    key: "short-rest",
    title: "Short Rest",
    content: [
      "Duration: At least 1 hour of downtime — light activity like eating, reading, or tending wounds.",
      "Hit Dice Healing: You can spend one or more Hit Dice to regain HP. For each Hit Die spent, roll the die and add your Constitution modifier. You regain that many HP. You can decide to spend additional Hit Dice after each roll.",
      "You have a pool of Hit Dice equal to your level. Spent Hit Dice are recovered during a long rest.",
      "Feature Recharge: Some class features recharge on a short rest (e.g., Fighter's Action Surge, Second Wind; Warlock spell slots; Monk's Ki points; Bard's Bardic Inspiration at level 5+).",
      "No limit on the number of short rests per day — the DM determines what's practical.",
    ],
  },
  {
    key: "long-rest",
    title: "Long Rest",
    content: [
      "Duration: At least 8 hours — at least 6 hours of sleep and up to 2 hours of light activity (reading, talking, keeping watch, etc.).",
      "Healing: You regain ALL lost hit points.",
      "Hit Dice Recovery: You regain spent Hit Dice up to half your total (minimum 1). For example, a level 8 character recovers up to 4 spent Hit Dice.",
      "Spell Slots: All expended spell slots are restored.",
      "Feature Recharge: Features that recharge on a long rest are restored (e.g., Rage, Wild Shape, Channel Divinity, etc.).",
      "You can benefit from only one long rest in a 24-hour period.",
      "You must have at least 1 HP at the start of the rest to gain its benefits.",
    ],
  },
  {
    key: "interruptions",
    title: "Interruptions",
    content: [
      "Short Rest: Interrupted by any strenuous activity — combat, casting a spell, walking, or similar adventuring. If interrupted, you must start the short rest over to gain any benefit.",
      "Long Rest: Interrupted by at least 1 hour of walking, fighting, casting spells, or similar adventuring activity. If the interruption is shorter than 1 hour, the characters can resume and still finish the rest.",
    ],
  },
];

export function Resting({ searchFilter = "" }: { searchFilter?: string }) {
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
      <h2 className="text-xl font-bold text-amber-400">Resting</h2>
      <p className="text-gray-400 text-sm">
        Resting lets you recover HP, Hit Dice, spell slots, and class features.
      </p>

      {filtered.map((section) => (
        <Section key={section.key} title={section.title} defaultOpen={!searchFilter}>
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
          <p className="text-amber-400 font-semibold mb-2">Quick Comparison</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-gray-500 font-semibold" />
            <div className="text-amber-400 font-semibold">Short Rest</div>
            <div className="text-amber-400 font-semibold">Long Rest</div>

            <div className="text-gray-400">Duration</div>
            <div className="text-gray-300 font-mono">1+ hours</div>
            <div className="text-gray-300 font-mono">8 hours</div>

            <div className="text-gray-400">HP Recovery</div>
            <div className="text-gray-300">Spend Hit Dice</div>
            <div className="text-gray-300">All HP</div>

            <div className="text-gray-400">Hit Dice</div>
            <div className="text-gray-300">Spend them</div>
            <div className="text-gray-300">Recover half</div>

            <div className="text-gray-400">Spell Slots</div>
            <div className="text-gray-300">Warlock only</div>
            <div className="text-gray-300">All restored</div>

            <div className="text-gray-400">Per Day</div>
            <div className="text-gray-300">Unlimited</div>
            <div className="text-gray-300 font-mono">1 per 24h</div>
          </div>
        </div>
      )}
    </div>
  );
}
