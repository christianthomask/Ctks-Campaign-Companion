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

interface SkillGroup {
  ability: string;
  skills: string[];
}

const SKILL_GROUPS: SkillGroup[] = [
  { ability: "Strength", skills: ["Athletics"] },
  { ability: "Dexterity", skills: ["Acrobatics", "Sleight of Hand", "Stealth"] },
  { ability: "Intelligence", skills: ["Arcana", "History", "Investigation", "Nature", "Religion"] },
  { ability: "Wisdom", skills: ["Animal Handling", "Insight", "Medicine", "Perception", "Survival"] },
  { ability: "Charisma", skills: ["Deception", "Intimidation", "Performance", "Persuasion"] },
  { ability: "Constitution", skills: ["(No skills — used for concentration checks, endurance, etc.)"] },
];

const SECTIONS = [
  {
    key: "basic",
    title: "Making a Check",
    content:
      "Roll d20 + ability modifier + proficiency bonus (if proficient in the skill). Compare the total to the Difficulty Class (DC) set by the DM. Meet or beat the DC = success.",
  },
  {
    key: "ability-vs-skill",
    title: "Ability Check vs. Skill Check",
    content:
      "Every skill check is an ability check — but not every ability check uses a skill. A 'Strength check' might just be d20 + Strength modifier. A 'Strength (Athletics) check' adds proficiency if you're proficient in Athletics. The DM decides which ability and skill apply.",
  },
  {
    key: "advantage",
    title: "Advantage & Disadvantage",
    content:
      "Advantage: roll 2d20 and take the higher result. Disadvantage: roll 2d20 and take the lower. If you have both advantage and disadvantage from any number of sources, they cancel out — roll normally. They never stack (you never roll more than 2d20).",
  },
  {
    key: "passive",
    title: "Passive Checks",
    content:
      "Passive check = 10 + all modifiers that normally apply. Used when the DM wants to secretly determine success without a roll — most commonly Passive Perception. Advantage on the check gives +5 to the passive score; disadvantage gives -5.",
  },
  {
    key: "contests",
    title: "Contests",
    content:
      "When two creatures compete, both roll an ability check. The higher total wins. On a tie, the situation stays the same (the initiator fails). Examples: grapple (Athletics vs. Athletics or Acrobatics), hiding (Stealth vs. Perception).",
  },
];

export function SkillChecks({ searchFilter = "" }: { searchFilter?: string }) {
  const filteredSections = SECTIONS.filter(
    (s) => matchesSearch(s.title, searchFilter) || matchesSearch(s.content, searchFilter)
  );

  const filteredSkillGroups = SKILL_GROUPS.filter(
    (g) =>
      matchesSearch(g.ability, searchFilter) ||
      g.skills.some((s) => matchesSearch(s, searchFilter))
  );

  const showSkillList =
    !searchFilter ||
    filteredSkillGroups.length > 0 ||
    matchesSearch("skills", searchFilter) ||
    matchesSearch("ability", searchFilter);

  if (filteredSections.length === 0 && !showSkillList) {
    return (
      <p className="text-gray-500 text-sm text-center py-8">
        No matches for &ldquo;{searchFilter}&rdquo;
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-amber-400">How Skill Checks Work</h2>
      <p className="text-gray-400 text-sm">
        <span className="font-mono text-amber-400">d20</span> + ability modifier + proficiency
        bonus (if proficient)
      </p>

      {filteredSections.map((s) => (
        <Section key={s.key} title={s.title} defaultOpen={!!searchFilter}>
          <p className="text-gray-300 leading-relaxed">{s.content}</p>
        </Section>
      ))}

      {/* Skills grouped by ability */}
      {showSkillList && (
        <Section title="All 18 Skills by Ability" defaultOpen={!!searchFilter}>
          <div className="space-y-3">
            {(searchFilter ? filteredSkillGroups : SKILL_GROUPS).map((group) => (
              <div key={group.ability}>
                <p className="text-amber-400 font-semibold">{group.ability}</p>
                <ul className="ml-4 mt-1 space-y-0.5">
                  {group.skills.map((skill) => (
                    <li key={skill} className="text-gray-300">
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {!searchFilter && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm">
          <p className="text-amber-400 font-semibold mb-1">Common DCs</p>
          <div className="grid grid-cols-2 gap-1 text-gray-300">
            <span>Very Easy</span>
            <span className="font-mono text-amber-400">DC 5</span>
            <span>Easy</span>
            <span className="font-mono text-amber-400">DC 10</span>
            <span>Medium</span>
            <span className="font-mono text-amber-400">DC 15</span>
            <span>Hard</span>
            <span className="font-mono text-amber-400">DC 20</span>
            <span>Very Hard</span>
            <span className="font-mono text-amber-400">DC 25</span>
            <span>Nearly Impossible</span>
            <span className="font-mono text-amber-400">DC 30</span>
          </div>
        </div>
      )}
    </div>
  );
}
