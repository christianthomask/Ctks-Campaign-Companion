"use client";

import { useState, useMemo, useCallback } from "react";
import type { CharacterDraft } from "@/app/player/character/create/page";

interface Props {
  draft: CharacterDraft;
  onUpdate: (updates: Partial<CharacterDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

type AbilityKey = "str_base" | "dex_base" | "con_base" | "int_base" | "wis_base" | "cha_base";

const ABILITIES: { key: AbilityKey; label: string; short: string }[] = [
  { key: "str_base", label: "Strength", short: "STR" },
  { key: "dex_base", label: "Dexterity", short: "DEX" },
  { key: "con_base", label: "Constitution", short: "CON" },
  { key: "int_base", label: "Intelligence", short: "INT" },
  { key: "wis_base", label: "Wisdom", short: "WIS" },
  { key: "cha_base", label: "Charisma", short: "CHA" },
];

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

// Point buy cost table
const POINT_COST: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};

const TOTAL_POINTS = 27;

// Class primary ability suggestions
const CLASS_SUGGESTIONS: Record<string, AbilityKey[]> = {
  fighter: ["str_base", "con_base"],
  barbarian: ["str_base", "con_base"],
  monk: ["dex_base", "wis_base"],
  rogue: ["dex_base", "cha_base"],
  bard: ["cha_base", "dex_base"],
  ranger: ["dex_base", "wis_base"],
  wizard: ["int_base", "con_base"],
  sorcerer: ["cha_base", "con_base"],
  warlock: ["cha_base", "con_base"],
  cleric: ["wis_base", "con_base"],
  druid: ["wis_base", "con_base"],
  paladin: ["str_base", "cha_base"],
};

function getModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function rollDice(): number[] {
  // Roll 4d6, drop lowest
  const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
  rolls.sort((a, b) => a - b);
  return rolls;
}

type TabId = "standard" | "pointbuy" | "roll";

export function AbilityScoresStep({ draft, onUpdate, onNext, onBack }: Props) {
  const [tab, setTab] = useState<TabId>(
    (draft.ability_score_method as TabId) || "standard"
  );

  // Standard array assignments: which array value is assigned to which ability
  const [arrayAssignments, setArrayAssignments] = useState<Record<AbilityKey, number | null>>(() => {
    // Try to recover from existing draft if method is standard_array
    const initial: Record<AbilityKey, number | null> = {
      str_base: null, dex_base: null, con_base: null,
      int_base: null, wis_base: null, cha_base: null,
    };
    if (draft.ability_score_method === "standard_array") {
      for (const ab of ABILITIES) {
        const val = draft[ab.key];
        if (STANDARD_ARRAY.includes(val)) {
          initial[ab.key] = val;
        }
      }
    }
    return initial;
  });

  // Roll results
  const [rollResults, setRollResults] = useState<{ rolls: number[]; total: number }[]>([]);
  const [rollAssignments, setRollAssignments] = useState<Record<AbilityKey, number | null>>({
    str_base: null, dex_base: null, con_base: null,
    int_base: null, wis_base: null, cha_base: null,
  });

  // Point buy scores
  const [pointBuyScores, setPointBuyScores] = useState<Record<AbilityKey, number>>(() => {
    if (draft.ability_score_method === "point_buy") {
      return {
        str_base: draft.str_base, dex_base: draft.dex_base, con_base: draft.con_base,
        int_base: draft.int_base, wis_base: draft.wis_base, cha_base: draft.cha_base,
      };
    }
    return { str_base: 8, dex_base: 8, con_base: 8, int_base: 8, wis_base: 8, cha_base: 8 };
  });

  const pointsSpent = useMemo(() => {
    return ABILITIES.reduce((sum, ab) => sum + (POINT_COST[pointBuyScores[ab.key]] || 0), 0);
  }, [pointBuyScores]);

  const pointsRemaining = TOTAL_POINTS - pointsSpent;

  const suggested = CLASS_SUGGESTIONS[draft.class_id || ""] || [];

  // Sync tab changes to draft
  const switchTab = useCallback((newTab: TabId) => {
    setTab(newTab);
    const methodMap: Record<TabId, string> = {
      standard: "standard_array",
      pointbuy: "point_buy",
      roll: "roll",
    };
    onUpdate({ ability_score_method: methodMap[newTab] });
  }, [onUpdate]);

  // --- Standard Array ---
  const usedArrayValues = useMemo(() => {
    return Object.values(arrayAssignments).filter((v): v is number => v !== null);
  }, [arrayAssignments]);

  const availableArrayValues = useMemo(() => {
    return STANDARD_ARRAY.filter((v) => {
      const usedCount = usedArrayValues.filter((u) => u === v).length;
      const totalCount = STANDARD_ARRAY.filter((s) => s === v).length;
      return usedCount < totalCount;
    });
  }, [usedArrayValues]);

  const handleArrayAssign = (key: AbilityKey, value: string) => {
    const numVal = value === "" ? null : parseInt(value, 10);
    const newAssignments = { ...arrayAssignments, [key]: numVal };
    setArrayAssignments(newAssignments);

    // Update draft with current assignments
    const updates: Partial<CharacterDraft> = { ability_score_method: "standard_array" };
    for (const ab of ABILITIES) {
      updates[ab.key] = newAssignments[ab.key] ?? 10;
    }
    onUpdate(updates);
  };

  const autoAssignStandard = () => {
    // Auto-assign based on class suggestions
    const sorted = [...STANDARD_ARRAY].sort((a, b) => b - a);
    const newAssignments: Record<AbilityKey, number | null> = {
      str_base: null, dex_base: null, con_base: null,
      int_base: null, wis_base: null, cha_base: null,
    };

    const used: number[] = [];
    // Assign highest to primary, next to secondary
    for (const sugKey of suggested) {
      const available = sorted.find((v) => !used.includes(sorted.indexOf(v)));
      if (available !== undefined) {
        newAssignments[sugKey] = available;
        used.push(sorted.indexOf(available));
      }
    }
    // Assign rest to remaining abilities
    const remaining = ABILITIES.filter((ab) => !suggested.includes(ab.key));
    for (const ab of remaining) {
      const idx = sorted.findIndex((_, i) => !used.includes(i));
      if (idx !== -1) {
        newAssignments[ab.key] = sorted[idx];
        used.push(idx);
      }
    }

    setArrayAssignments(newAssignments);
    const updates: Partial<CharacterDraft> = { ability_score_method: "standard_array" };
    for (const ab of ABILITIES) {
      updates[ab.key] = newAssignments[ab.key] ?? 10;
    }
    onUpdate(updates);
  };

  // --- Point Buy ---
  const handlePointBuy = (key: AbilityKey, delta: number) => {
    const current = pointBuyScores[key];
    const next = current + delta;
    if (next < 8 || next > 15) return;

    const costDiff = (POINT_COST[next] || 0) - (POINT_COST[current] || 0);
    if (costDiff > pointsRemaining) return;

    const newScores = { ...pointBuyScores, [key]: next };
    setPointBuyScores(newScores);

    const updates: Partial<CharacterDraft> = { ability_score_method: "point_buy" };
    for (const ab of ABILITIES) {
      updates[ab.key] = newScores[ab.key];
    }
    onUpdate(updates);
  };

  // --- Roll ---
  const handleRoll = () => {
    const results = ABILITIES.map(() => {
      const rolls = rollDice();
      const total = rolls.slice(1).reduce((s, v) => s + v, 0); // drop lowest (already sorted)
      return { rolls, total };
    });
    setRollResults(results);
    // Reset assignments
    setRollAssignments({
      str_base: null, dex_base: null, con_base: null,
      int_base: null, wis_base: null, cha_base: null,
    });
  };

  const usedRollIndices = useMemo(() => {
    return Object.values(rollAssignments).filter((v): v is number => v !== null);
  }, [rollAssignments]);

  const handleRollAssign = (key: AbilityKey, value: string) => {
    const idx = value === "" ? null : parseInt(value, 10);
    const newAssignments = { ...rollAssignments, [key]: idx };
    setRollAssignments(newAssignments);

    const updates: Partial<CharacterDraft> = { ability_score_method: "roll" };
    for (const ab of ABILITIES) {
      const assignedIdx = newAssignments[ab.key];
      updates[ab.key] = assignedIdx !== null && rollResults[assignedIdx]
        ? rollResults[assignedIdx].total
        : 10;
    }
    onUpdate(updates);
  };

  // Determine if step is complete
  const isComplete = useMemo(() => {
    if (tab === "standard") {
      return Object.values(arrayAssignments).every((v) => v !== null);
    }
    if (tab === "pointbuy") {
      return true; // Point buy is always valid
    }
    if (tab === "roll") {
      return (
        rollResults.length === 6 &&
        Object.values(rollAssignments).every((v) => v !== null)
      );
    }
    return false;
  }, [tab, arrayAssignments, rollResults, rollAssignments]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-amber-400">Ability Scores</h2>
        <p className="mt-1 text-sm text-gray-400">
          Your six ability scores define your character&rsquo;s core capabilities.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-900 p-1">
        {(
          [
            { id: "standard" as TabId, label: "Standard Array" },
            { id: "pointbuy" as TabId, label: "Point Buy" },
            { id: "roll" as TabId, label: "Roll" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`min-h-[44px] flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-amber-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Standard Array Tab */}
      {tab === "standard" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Assign these values: {STANDARD_ARRAY.join(", ")}
            </p>
            {suggested.length > 0 && (
              <button
                onClick={autoAssignStandard}
                className="min-h-[44px] rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-amber-400 transition-colors hover:bg-gray-700"
              >
                Auto-suggest
              </button>
            )}
          </div>
          <div className="space-y-3">
            {ABILITIES.map((ab) => {
              const assigned = arrayAssignments[ab.key];
              const isSuggested = suggested.includes(ab.key);
              return (
                <div
                  key={ab.key}
                  className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 p-3"
                >
                  <div className="w-16">
                    <span className={`text-sm font-bold ${isSuggested ? "text-amber-400" : "text-gray-200"}`}>
                      {ab.short}
                    </span>
                    {isSuggested && (
                      <span className="ml-1 text-xs text-amber-600" title="Recommended for your class">
                        &#9733;
                      </span>
                    )}
                  </div>
                  <select
                    value={assigned ?? ""}
                    onChange={(e) => handleArrayAssign(ab.key, e.target.value)}
                    className="min-h-[44px] flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Select...</option>
                    {STANDARD_ARRAY.map((val, i) => {
                      const isAvailable =
                        availableArrayValues.includes(val) || assigned === val;
                      return (
                        <option
                          key={`${val}-${i}`}
                          value={val}
                          disabled={!isAvailable}
                        >
                          {val}
                        </option>
                      );
                    })}
                  </select>
                  <span className="w-10 text-center text-sm text-gray-500">
                    {assigned !== null ? getModifier(assigned) : "--"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Point Buy Tab */}
      {tab === "pointbuy" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-3">
            <span className="text-sm text-gray-300">Points Remaining</span>
            <span
              className={`text-lg font-bold ${
                pointsRemaining > 0
                  ? "text-amber-400"
                  : pointsRemaining === 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {pointsRemaining} / {TOTAL_POINTS}
            </span>
          </div>
          <div className="space-y-3">
            {ABILITIES.map((ab) => {
              const score = pointBuyScores[ab.key];
              const isSuggested = suggested.includes(ab.key);
              const canIncrease =
                score < 15 &&
                pointsRemaining >= (POINT_COST[score + 1] || 0) - (POINT_COST[score] || 0);
              const canDecrease = score > 8;
              return (
                <div
                  key={ab.key}
                  className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 p-3"
                >
                  <div className="w-16">
                    <span className={`text-sm font-bold ${isSuggested ? "text-amber-400" : "text-gray-200"}`}>
                      {ab.short}
                    </span>
                    {isSuggested && (
                      <span className="ml-1 text-xs text-amber-600">&#9733;</span>
                    )}
                  </div>
                  <button
                    onClick={() => handlePointBuy(ab.key, -1)}
                    disabled={!canDecrease}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-lg font-bold text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-lg font-bold text-gray-100">
                    {score}
                  </span>
                  <button
                    onClick={() => handlePointBuy(ab.key, 1)}
                    disabled={!canIncrease}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-lg font-bold text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    +
                  </button>
                  <span className="w-10 text-center text-sm text-gray-500">
                    {getModifier(score)}
                  </span>
                  <span className="w-12 text-right text-xs text-gray-600">
                    {POINT_COST[score]} pts
                  </span>
                </div>
              );
            })}
          </div>

          {/* Cost reference */}
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
            <p className="mb-1 text-xs font-medium text-gray-500">Point Cost Reference</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
              {Object.entries(POINT_COST).map(([score, cost]) => (
                <span key={score}>
                  {score}: {cost}pts
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Roll Tab */}
      {tab === "roll" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Roll 4d6, drop the lowest die for each ability score.
            </p>
            <button
              onClick={handleRoll}
              className="min-h-[44px] rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
            >
              {rollResults.length > 0 ? "Re-roll All" : "Roll Scores"}
            </button>
          </div>

          {rollResults.length > 0 && (
            <>
              {/* Roll results */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {rollResults.map((result, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 text-center ${
                      usedRollIndices.includes(i)
                        ? "border-gray-800 bg-gray-900/50 opacity-50"
                        : "border-gray-700 bg-gray-900"
                    }`}
                  >
                    <div className="text-lg font-bold text-gray-100">
                      {result.total}
                    </div>
                    <div className="text-xs text-gray-600">
                      [{result.rolls.join(", ")}]
                    </div>
                  </div>
                ))}
              </div>

              {/* Assign rolls */}
              <div className="space-y-3">
                {ABILITIES.map((ab) => {
                  const assigned = rollAssignments[ab.key];
                  const isSuggested = suggested.includes(ab.key);
                  return (
                    <div
                      key={ab.key}
                      className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 p-3"
                    >
                      <div className="w-16">
                        <span className={`text-sm font-bold ${isSuggested ? "text-amber-400" : "text-gray-200"}`}>
                          {ab.short}
                        </span>
                        {isSuggested && (
                          <span className="ml-1 text-xs text-amber-600">&#9733;</span>
                        )}
                      </div>
                      <select
                        value={assigned ?? ""}
                        onChange={(e) => handleRollAssign(ab.key, e.target.value)}
                        className="min-h-[44px] flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="">Select roll...</option>
                        {rollResults.map((result, i) => {
                          const isUsed = usedRollIndices.includes(i) && assigned !== i;
                          return (
                            <option key={i} value={i} disabled={isUsed}>
                              Roll {i + 1}: {result.total}
                            </option>
                          );
                        })}
                      </select>
                      <span className="w-10 text-center text-sm text-gray-500">
                        {assigned !== null && rollResults[assigned]
                          ? getModifier(rollResults[assigned].total)
                          : "--"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {rollResults.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-800 py-12 text-center text-gray-600">
              Click &ldquo;Roll Scores&rdquo; to generate your ability scores.
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="min-h-[44px] rounded-lg border border-gray-700 bg-gray-800 px-6 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isComplete}
          className="min-h-[44px] rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
