"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CombatTurn } from "./sheets/CombatTurn";
import { ActionsInCombat } from "./sheets/ActionsInCombat";
import { SkillChecks } from "./sheets/SkillChecks";
import { Conditions } from "./sheets/Conditions";
import { DeathAndDying } from "./sheets/DeathAndDying";
import { Resting } from "./sheets/Resting";
import { SpellcastingBasics } from "./sheets/SpellcastingBasics";

const TABS = [
  { key: "combat-turn", label: "Your Turn", component: CombatTurn },
  { key: "actions", label: "Actions", component: ActionsInCombat },
  { key: "skills", label: "Skills", component: SkillChecks },
  { key: "conditions", label: "Conditions", component: Conditions },
  { key: "death", label: "Death", component: DeathAndDying },
  { key: "resting", label: "Resting", component: Resting },
  { key: "spellcasting", label: "Spells", component: SpellcastingBasics },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function CheatSheets() {
  const [activeTab, setActiveTab] = useState<TabKey>(TABS[0].key);
  const [search, setSearch] = useState("");

  const ActiveComponent = useMemo(
    () => TABS.find((t) => t.key === activeTab)?.component ?? CombatTurn,
    [activeTab]
  );

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-950 border-b border-gray-800 pb-2">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <Link
            href="/player"
            className="text-gray-400 hover:text-amber-400 transition-colors"
            aria-label="Back to player dashboard"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-amber-400">
            Reference Sheets
          </h1>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <input
            type="text"
            placeholder="Search all sheets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/25"
          />
        </div>

        {/* Tabs — horizontally scrollable */}
        <div className="flex overflow-x-auto px-4 gap-1 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-amber-400/15 text-amber-400"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active sheet content */}
      <div className="px-4 pt-4">
        <ActiveComponent searchFilter={search} />
      </div>
    </div>
  );
}
