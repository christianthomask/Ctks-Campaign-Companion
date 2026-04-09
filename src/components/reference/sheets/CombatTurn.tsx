"use client";

import { useState } from "react";

/**
 * Helper: collapsible section used across all sheets.
 */
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
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

const CONTENT = {
  movement: {
    title: "Movement",
    text: "Move up to your speed (usually 30 ft.). You can split movement before and after your action — e.g., move 15 ft., attack, then move 15 ft. Moving through difficult terrain costs 2 ft. per 1 ft. moved. Moving through an ally's space is allowed but you can't end your turn there. Moving through an enemy's space counts as difficult terrain (if they're 2+ sizes different).",
  },
  action: {
    title: "Action",
    text: "You get one action per turn. Common actions: Attack, Cast a Spell, Dash, Disengage, Dodge, Help, Hide, Ready, Use an Object. Your class may grant additional action options.",
  },
  bonusAction: {
    title: "Bonus Action",
    text: "You only get a bonus action if a feature or spell specifically grants one. Examples: casting a bonus-action spell (Healing Word, Misty Step), Two-Weapon Fighting (offhand attack), class features (Cunning Action, Rage). You can only use one bonus action per turn.",
  },
  freeInteraction: {
    title: "Free Object Interaction",
    text: "Once per turn you can interact with one object for free: draw or sheathe a weapon, open a door, pick up a dropped item, hand an item to another character, pull a lever. A second object interaction requires the Use an Object action.",
  },
  reaction: {
    title: "Reaction",
    text: "You get one reaction per round (resets at the start of your turn). Common reactions: Opportunity Attack (enemy leaves your reach), Readied Action (you set a trigger on your turn), Shield spell, Counterspell, Absorb Elements, Uncanny Dodge. Some reactions happen on your turn, some on others' turns.",
  },
};

export function CombatTurn({ searchFilter = "" }: { searchFilter?: string }) {
  const entries = Object.values(CONTENT);
  const filtered = entries.filter(
    (e) => matchesSearch(e.title, searchFilter) || matchesSearch(e.text, searchFilter)
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
      <h2 className="text-xl font-bold text-amber-400">Your Turn in Combat</h2>
      <p className="text-gray-400 text-sm">
        On each of your turns you can <span className="text-gray-100">move</span>,
        take one <span className="text-gray-100">action</span>, and possibly a{" "}
        <span className="text-gray-100">bonus action</span> and/or{" "}
        <span className="text-gray-100">reaction</span>.
      </p>

      {filtered.map((entry) => (
        <Section
          key={entry.title}
          title={entry.title}
          defaultOpen={!searchFilter}
        >
          <p className="text-gray-300 leading-relaxed">{entry.text}</p>
        </Section>
      ))}
    </div>
  );
}
