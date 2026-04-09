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

interface ActionEntry {
  title: string;
  summary: string;
  details: string;
}

const ACTIONS: ActionEntry[] = [
  {
    title: "Attack",
    summary: "Make one melee or ranged attack (more with Extra Attack).",
    details:
      "Roll d20 + ability modifier + proficiency bonus vs. target's AC. Melee attacks use Strength (or Dex with finesse weapons). Ranged attacks use Dexterity. On a hit, roll damage dice + ability modifier. A natural 20 is a critical hit — roll all damage dice twice. A natural 1 always misses.",
  },
  {
    title: "Cast a Spell",
    summary: "Cast a spell with a casting time of 1 action.",
    details:
      "Expend a spell slot of the spell's level or higher (cantrips need no slot). Follow the spell's range, components (V, S, M), and duration. If you cast a bonus-action spell, you can only cast a cantrip with your action, not another leveled spell.",
  },
  {
    title: "Dash",
    summary: "Gain extra movement equal to your speed this turn.",
    details:
      "Your movement for the turn increases by your speed (after applying any modifiers). For example, a speed of 30 ft. lets you move up to 60 ft. on a turn you Dash. This stacks with bonuses like Haste.",
  },
  {
    title: "Disengage",
    summary: "Your movement doesn't provoke opportunity attacks this turn.",
    details:
      "For the rest of the turn, no enemy can make an opportunity attack against you as you move. Useful for retreating from melee without taking a hit.",
  },
  {
    title: "Dodge",
    summary: "Focus on avoiding attacks until your next turn.",
    details:
      "Until the start of your next turn, any attack roll against you has disadvantage (if you can see the attacker), and you make Dexterity saving throws with advantage. You lose this benefit if you are incapacitated or your speed drops to 0.",
  },
  {
    title: "Help",
    summary: "Give an ally advantage on their next ability check or attack roll.",
    details:
      "Choose an ally you can see within 5 ft. That ally gains advantage on the next ability check they make to perform a task you're helping with — OR — advantage on the next attack roll against a creature within 5 ft. of you (before your next turn).",
  },
  {
    title: "Hide",
    summary: "Make a Dexterity (Stealth) check to become hidden.",
    details:
      "You must be out of an enemy's clear sight (behind cover, in darkness, heavily obscured). Roll Stealth vs. passive Perception of enemies. If hidden, attacks against unseen targets have advantage. You reveal yourself when you attack, cast a spell, or are discovered.",
  },
  {
    title: "Ready",
    summary: "Prepare to act later with a specific trigger.",
    details:
      "Describe the trigger (\"when the goblin steps through the door\") and the action you'll take. When the trigger occurs, you use your reaction to take the readied action. If readying a spell, you cast it on your turn (spending the slot and concentration) and release it with your reaction. If the trigger never happens, the action (and spell slot) is lost.",
  },
  {
    title: "Use an Object",
    summary: "Interact with an object that requires your action.",
    details:
      "Use a potion, activate a magic item, pull a second lever, or otherwise interact with an object beyond your free object interaction. Some magic items specify they require an action to activate.",
  },
  {
    title: "Grapple (Special Attack)",
    summary: "Grab a creature to reduce its speed to 0.",
    details:
      "Replaces one attack within the Attack action. Target must be no more than one size larger. You make a Strength (Athletics) check contested by the target's Strength (Athletics) or Dexterity (Acrobatics). On success, the target's speed becomes 0. The grapple ends if you're incapacitated, the target is moved out of reach, or you use an action/attack to release it. The target can use its action to escape (same contested check).",
  },
  {
    title: "Shove (Special Attack)",
    summary: "Push a creature 5 ft. away or knock it prone.",
    details:
      "Replaces one attack within the Attack action. Target must be no more than one size larger. You make a Strength (Athletics) check contested by the target's Strength (Athletics) or Dexterity (Acrobatics). On success, choose: push the target 5 ft. away, or knock it prone.",
  },
];

export function ActionsInCombat({ searchFilter = "" }: { searchFilter?: string }) {
  const filtered = ACTIONS.filter(
    (a) =>
      matchesSearch(a.title, searchFilter) ||
      matchesSearch(a.summary, searchFilter) ||
      matchesSearch(a.details, searchFilter)
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
      <h2 className="text-xl font-bold text-amber-400">Actions in Combat</h2>
      <p className="text-gray-400 text-sm">
        On your turn you take <span className="text-gray-100">one action</span>. These are the
        standard options available to every character.
      </p>

      {filtered.map((action) => (
        <Section key={action.title} title={action.title} defaultOpen={!!searchFilter}>
          <p className="text-gray-300 leading-relaxed">{action.summary}</p>
          <p className="text-gray-400 leading-relaxed mt-1">{action.details}</p>
        </Section>
      ))}

      {!searchFilter && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm">
          <p className="text-amber-400 font-semibold mb-1">To-Hit Formula</p>
          <p className="text-gray-300">
            <span className="font-mono text-amber-400">d20</span>
            {" + ability modifier + proficiency bonus "}
            <span className="text-gray-500">vs. target AC</span>
          </p>
          <p className="text-amber-400 font-semibold mb-1 mt-3">Damage Formula</p>
          <p className="text-gray-300">
            <span className="font-mono text-amber-400">weapon damage dice</span>
            {" + ability modifier"}
          </p>
        </div>
      )}
    </div>
  );
}
