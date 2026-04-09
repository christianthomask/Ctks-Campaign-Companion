"use client";

import { useState } from "react";
import type { QuickReference as QuickReferenceType, PuzzleEntry } from "@/lib/types/session";
import { NpcTable } from "./NpcTable";
import { TreasureTable } from "./TreasureTable";
import { PuzzleTracker } from "./PuzzleTracker";

interface Props {
  quickRef: QuickReferenceType;
  puzzleEntries: PuzzleEntry[];
  onTogglePuzzle: (letter: string) => void;
  onClose: () => void;
}

const TABS = ["NPCs", "Puzzles", "Treasure", "Map"] as const;
type Tab = (typeof TABS)[number];

export function QuickReference({
  quickRef,
  puzzleEntries,
  onTogglePuzzle,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("NPCs");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[75vh] flex-col rounded-t-2xl border-t border-gray-700 bg-gray-900 md:inset-x-auto md:inset-y-0 md:right-0 md:w-80 md:max-h-none md:rounded-none md:border-l md:border-t-0">
        {/* Drag handle (mobile) */}
        <div className="flex items-center justify-center py-2 md:hidden">
          <div className="h-1 w-8 rounded-full bg-gray-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-sm font-semibold text-amber-400">Quick Reference</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:text-gray-200"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 px-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-amber-400 text-amber-400"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "NPCs" && <NpcTable npcs={quickRef.npcs} />}

          {activeTab === "Puzzles" && (
            <PuzzleTracker
              entries={puzzleEntries}
              onToggle={onTogglePuzzle}
            />
          )}

          {activeTab === "Treasure" && (
            <TreasureTable treasure={quickRef.treasure_summary} />
          )}

          {activeTab === "Map" && (
            <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800 p-3">
              <pre className="whitespace-pre text-xs leading-relaxed text-gray-300 font-mono">
                {quickRef.exploration_flowchart}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
