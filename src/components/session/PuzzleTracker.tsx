"use client";

import { memo } from "react";
import type { PuzzleEntry } from "@/lib/types/session";

interface Props {
  entries: PuzzleEntry[];
  onToggle: (letter: string) => void;
  compact?: boolean;
}

export const PuzzleTracker = memo(function PuzzleTracker({
  entries,
  onToggle,
  compact = false,
}: Props) {
  if (entries.length === 0) return null;

  // Show the word being spelled out
  const word = entries.map((e) => e.letter).join("");
  const found = entries.filter((e) => e.found).length;

  return (
    <div>
      {!compact && (
        <div className="mb-3 flex items-baseline justify-between">
          <h4 className="text-sm font-semibold text-amber-400">
            Puzzle Books — &ldquo;{word}&rdquo;
          </h4>
          <span className="text-xs text-gray-500">
            {found}/{entries.length} found
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="w-12 px-3 py-2 text-left font-medium text-gray-400">
                Found
              </th>
              <th className="w-12 px-3 py-2 text-center font-medium text-gray-400">
                Letter
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-400">
                Location
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {entries.map((entry) => (
              <tr key={entry.letter}>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onToggle(entry.letter)}
                    className={`flex h-6 w-6 items-center justify-center rounded border transition-colors ${
                      entry.found
                        ? "border-amber-500 bg-amber-600 text-gray-950"
                        : "border-gray-600 bg-gray-900 text-transparent hover:border-gray-500"
                    }`}
                    aria-label={`Mark ${entry.letter} as ${entry.found ? "not found" : "found"}`}
                  >
                    {entry.found && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </td>
                <td className="px-3 py-2 text-center font-mono text-lg font-bold text-amber-400">
                  {entry.letter}
                </td>
                <td className="px-3 py-2 text-gray-300">{entry.room}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
